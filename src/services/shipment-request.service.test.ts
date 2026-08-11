import assert from "node:assert/strict";
import test from "node:test";

import {
  Prisma,
  ShipmentDirection,
  ShipmentIntakeMethod,
  ShipmentItemCategory,
  ShipmentStatus,
} from "@prisma/client";
import { ZodError } from "zod";

import {
  createGuestShipmentRequest,
  ShipmentTrackingNumberGenerationError,
} from "./shipment-request.service";

const FIRST_TRACKING_NUMBER = "PAT-2026-ABCDEFGH";
const SECOND_TRACKING_NUMBER = "PAT-2026-JKLMNPQR";
const CREATED_AT = new Date("2026-08-02T12:00:00.000Z");

type NestedItem = {
  description: string;
  category: ShipmentItemCategory;
  quantity: number;
  declaredValue?: Prisma.Decimal;
};

type ShipmentCreateData = {
  trackingNumber: string;
  direction: ShipmentDirection;
  intakeMethod: ShipmentIntakeMethod;
  senderName: string;
  senderPhone: string;
  senderEmail: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  recipientCity: string;
  recipientNotes?: string;
  customerNotes?: string;
  items: { create: NestedItem[] };
};

function validInput() {
  return {
    intakeMethod: ShipmentIntakeMethod.DROP_OFF,
    senderName: "  Ada Sender  ",
    senderPhone: "  +1 (862) 555-0142  ",
    senderEmail: "  ADA@Example.COM  ",
    recipientName: "  Blaise Recipient  ",
    recipientPhone: "  70 12 34 56  ",
    recipientEmail: "  BLAISE@Example.COM  ",
    recipientCity: "  Ouagadougou  ",
    recipientNotes: "  Call before pickup.  ",
    customerNotes: "  Handle carefully.  ",
    items: [
      {
        description: "  Laptop computer  ",
        category: ShipmentItemCategory.ELECTRONICS,
        quantity: 1,
        declaredValue: 0,
      },
      {
        description: "  Three pairs of shoes  ",
        category: ShipmentItemCategory.CLOTHING,
        quantity: 3,
        declaredValue: 149.99,
      },
    ],
  };
}

function createSuccessfulDependencies(
  createAttempts: Prisma.ShipmentCreateArgs[],
  trackingNumbers = [FIRST_TRACKING_NUMBER],
) {
  let generated = 0;

  return {
    generateTrackingNumber: () => {
      const value = trackingNumbers[generated] ?? trackingNumbers.at(-1);
      generated += 1;
      assert.ok(value);
      return value;
    },
    createShipment: async (args: Prisma.ShipmentCreateArgs) => {
      createAttempts.push(args);
      const data = args.data as ShipmentCreateData;

      return {
        id: "shipment_1",
        trackingNumber: data.trackingNumber,
        status: ShipmentStatus.AWAITING_PACKAGE,
        createdAt: CREATED_AT,
      };
    },
    getGeneratedCount: () => generated,
  };
}

function knownRequestError(
  code: string,
  meta?: Record<string, unknown>,
): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Database request failed.", {
    code,
    clientVersion: Prisma.prismaVersion.client,
    meta,
  });
}

test("creates one shipment with all items in submitted order", async () => {
  const attempts: Prisma.ShipmentCreateArgs[] = [];

  const result = await createGuestShipmentRequest(
    validInput(),
    createSuccessfulDependencies(attempts),
  );

  assert.equal(attempts.length, 1);
  const data = attempts[0].data as ShipmentCreateData;
  assert.deepEqual(
    data.items.create.map((item) => item.description),
    ["Laptop computer", "Three pairs of shoes"],
  );
  assert.deepEqual(Object.keys(result).sort(), [
    "createdAt",
    "id",
    "status",
    "trackingNumber",
  ]);
});

test("validates and normalizes input before nested persistence", async () => {
  const attempts: Prisma.ShipmentCreateArgs[] = [];
  const input = validInput();

  await createGuestShipmentRequest(
    input,
    createSuccessfulDependencies(attempts),
  );

  const data = attempts[0].data as ShipmentCreateData;
  assert.equal(data.senderName, "Ada Sender");
  assert.equal(data.senderPhone, "+1 (862) 555-0142");
  assert.equal(data.senderEmail, "ada@example.com");
  assert.equal(data.recipientName, "Blaise Recipient");
  assert.equal(data.recipientPhone, "70 12 34 56");
  assert.equal(data.recipientEmail, "blaise@example.com");
  assert.equal(data.recipientCity, "Ouagadougou");
  assert.equal(data.recipientNotes, "Call before pickup.");
  assert.equal(data.customerNotes, "Handle carefully.");
});

test("turns optional empty strings into absent nested-create values", async () => {
  const attempts: Prisma.ShipmentCreateArgs[] = [];
  const input = {
    ...validInput(),
    recipientEmail: "   ",
    recipientNotes: "   ",
    customerNotes: "   ",
  };

  await createGuestShipmentRequest(
    input,
    createSuccessfulDependencies(attempts),
  );

  const data = attempts[0].data as ShipmentCreateData;
  assert.equal(data.recipientEmail, undefined);
  assert.equal(data.recipientNotes, undefined);
  assert.equal(data.customerNotes, undefined);
});

test("converts declared values to Prisma Decimal without losing zero", async () => {
  const attempts: Prisma.ShipmentCreateArgs[] = [];

  await createGuestShipmentRequest(
    validInput(),
    createSuccessfulDependencies(attempts),
  );

  const items = (attempts[0].data as ShipmentCreateData).items.create;
  assert.ok(items[0].declaredValue instanceof Prisma.Decimal);
  assert.equal(items[0].declaredValue?.toString(), "0");
  assert.ok(items[1].declaredValue instanceof Prisma.Decimal);
  assert.equal(items[1].declaredValue?.toString(), "149.99");
});

test("generates tracking internally and relies on the initial schema status", async () => {
  const attempts: Prisma.ShipmentCreateArgs[] = [];

  const result = await createGuestShipmentRequest(
    validInput(),
    createSuccessfulDependencies(attempts),
  );

  const data = attempts[0].data as ShipmentCreateData & { status?: unknown };
  assert.equal(data.trackingNumber, FIRST_TRACKING_NUMBER);
  assert.equal(data.status, undefined);
  assert.equal(result.status, ShipmentStatus.AWAITING_PACKAGE);
});

test("always creates guest requests as US_TO_BF until intake captures direction", async () => {
  const attempts: Prisma.ShipmentCreateArgs[] = [];

  await createGuestShipmentRequest(
    validInput(),
    createSuccessfulDependencies(attempts),
  );

  const data = attempts[0].data as ShipmentCreateData;
  assert.equal(data.direction, ShipmentDirection.US_TO_BF);
});

for (const serverControlledField of [
  "trackingNumber",
  "status",
  "internalNotes",
] as const) {
  test(`rejects caller-supplied ${serverControlledField} before side effects`, async () => {
    let createCount = 0;
    let generationCount = 0;

    await assert.rejects(
      createGuestShipmentRequest(
        { ...validInput(), [serverControlledField]: "customer-controlled" },
        {
          generateTrackingNumber: () => {
            generationCount += 1;
            return FIRST_TRACKING_NUMBER;
          },
          createShipment: async () => {
            createCount += 1;
            throw new Error("should not create");
          },
        },
      ),
      ZodError,
    );

    assert.equal(generationCount, 0);
    assert.equal(createCount, 0);
  });
}

test("invalid input causes no tracking generation or database write", async () => {
  let createCount = 0;
  let generationCount = 0;

  await assert.rejects(
    createGuestShipmentRequest(
      { ...validInput(), items: [] },
      {
        generateTrackingNumber: () => {
          generationCount += 1;
          return FIRST_TRACKING_NUMBER;
        },
        createShipment: async () => {
          createCount += 1;
          throw new Error("should not create");
        },
      },
    ),
    ZodError,
  );

  assert.equal(generationCount, 0);
  assert.equal(createCount, 0);
});

test("retries a confirmed tracking-number unique conflict with a new candidate", async () => {
  const candidates = [FIRST_TRACKING_NUMBER, SECOND_TRACKING_NUMBER];
  const usedCandidates: string[] = [];
  let generated = 0;

  const result = await createGuestShipmentRequest(validInput(), {
    generateTrackingNumber: () => candidates[generated++],
    createShipment: async (args) => {
      const trackingNumber = (args.data as ShipmentCreateData).trackingNumber;
      usedCandidates.push(trackingNumber);

      if (usedCandidates.length === 1) {
        throw knownRequestError("P2002", { target: ["trackingNumber"] });
      }

      return {
        id: "shipment_1",
        trackingNumber,
        status: ShipmentStatus.AWAITING_PACKAGE,
        createdAt: CREATED_AT,
      };
    },
  });

  assert.deepEqual(usedCandidates, candidates);
  assert.equal(result.trackingNumber, SECOND_TRACKING_NUMBER);
});

test("recognizes Prisma adapter constraint metadata for tracking collisions", async () => {
  let attempt = 0;

  await createGuestShipmentRequest(validInput(), {
    generateTrackingNumber: () =>
      attempt === 0 ? FIRST_TRACKING_NUMBER : SECOND_TRACKING_NUMBER,
    createShipment: async (args) => {
      attempt += 1;

      if (attempt === 1) {
        throw knownRequestError("P2002", {
          driverAdapterError: {
            cause: { constraint: { fields: ["trackingNumber"] } },
          },
        });
      }

      return {
        id: "shipment_1",
        trackingNumber: (args.data as ShipmentCreateData).trackingNumber,
        status: ShipmentStatus.AWAITING_PACKAGE,
        createdAt: CREATED_AT,
      };
    },
  });

  assert.equal(attempt, 2);
});

test("does not retry a unique conflict on another field", async () => {
  const error = knownRequestError("P2002", { target: ["senderEmail"] });
  let attempts = 0;

  await assert.rejects(
    createGuestShipmentRequest(validInput(), {
      generateTrackingNumber: () => FIRST_TRACKING_NUMBER,
      createShipment: async () => {
        attempts += 1;
        throw error;
      },
    }),
    (received) => received === error,
  );

  assert.equal(attempts, 1);
});

test("does not retry non-unique Prisma errors or ordinary errors", async (t) => {
  const errors = [knownRequestError("P2024"), new Error("connection failed")];

  for (const error of errors) {
    await t.test(error instanceof Prisma.PrismaClientKnownRequestError ? error.code : "ordinary", async () => {
      let attempts = 0;

      await assert.rejects(
        createGuestShipmentRequest(validInput(), {
          generateTrackingNumber: () => FIRST_TRACKING_NUMBER,
          createShipment: async () => {
            attempts += 1;
            throw error;
          },
        }),
        (received) => received === error,
      );

      assert.equal(attempts, 1);
    });
  }
});

test("throws the domain error after exactly five tracking collisions", async () => {
  let createAttempts = 0;
  let generated = 0;

  await assert.rejects(
    createGuestShipmentRequest(validInput(), {
      generateTrackingNumber: () => {
        generated += 1;
        return FIRST_TRACKING_NUMBER;
      },
      createShipment: async () => {
        createAttempts += 1;
        throw knownRequestError("P2002", {
          target: "Shipment_trackingNumber_key",
        });
      },
    }),
    ShipmentTrackingNumberGenerationError,
  );

  assert.equal(generated, 5);
  assert.equal(createAttempts, 5);
});

test("does not mutate the original untrusted input", async () => {
  const input = validInput();
  const snapshot = structuredClone(input);

  await createGuestShipmentRequest(
    input,
    createSuccessfulDependencies([]),
  );

  assert.deepEqual(input, snapshot);
});
