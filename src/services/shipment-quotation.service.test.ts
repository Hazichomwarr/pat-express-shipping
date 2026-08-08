import assert from "node:assert/strict";
import test from "node:test";

import {
  Prisma,
  ShipmentQuoteCurrency,
  ShipmentStatus,
} from "@prisma/client";
import { ZodError } from "zod";

import {
  quoteShipment,
  ShipmentNotFoundError,
  ShipmentQuotationAlreadyExistsError,
  ShipmentQuotationConflictError,
  ShipmentQuotationNotAllowedError,
} from "./shipment-quotation.service";

const SHIPMENT_ID = "shipment_1";
const TRACKING_NUMBER = "PAT-2026-ABCDEFGH";
const QUOTED_AT = new Date("2026-08-08T14:30:00.000Z");

type Dependencies = NonNullable<Parameters<typeof quoteShipment>[2]>;
type ShipmentLookup = NonNullable<
  Awaited<ReturnType<Dependencies["findShipment"]>>
>;

function validInput() {
  return {
    measuredWeightKg: 10.125,
    ratePerKg: 8.5,
    quotedAmount: 80,
    quoteCurrency: ShipmentQuoteCurrency.USD,
  };
}

function quoteableShipment(
  overrides: Partial<ShipmentLookup> = {},
): ShipmentLookup {
  return {
    id: SHIPMENT_ID,
    trackingNumber: TRACKING_NUMBER,
    status: ShipmentStatus.AWAITING_QUOTE,
    measuredWeightKg: null,
    ratePerKg: null,
    quotedAmount: null,
    quoteCurrency: null,
    quotedAt: null,
    ...overrides,
  };
}

function createDependencies(overrides: Partial<Dependencies> = {}) {
  const updates: Prisma.ShipmentUpdateManyArgs[] = [];
  let findCount = 0;

  const dependencies: Dependencies = {
    findShipment: async () => {
      findCount += 1;
      return quoteableShipment();
    },
    updateShipmentQuote: async (args) => {
      updates.push(args);
      return { count: 1 };
    },
    now: () => QUOTED_AT,
    ...overrides,
  };

  return {
    dependencies,
    updates,
    getFindCount: () => findCount,
  };
}

test("quotes an eligible shipment and returns only the safe result", async () => {
  const { dependencies } = createDependencies();

  const result = await quoteShipment(SHIPMENT_ID, validInput(), dependencies);

  assert.deepEqual(result, {
    id: SHIPMENT_ID,
    trackingNumber: TRACKING_NUMBER,
    status: ShipmentStatus.AWAITING_PAYMENT,
    measuredWeightKg: "10.125",
    ratePerKg: "8.5",
    quotedAmount: "80",
    quoteCurrency: ShipmentQuoteCurrency.USD,
    quotedAt: QUOTED_AT,
  });
  assert.deepEqual(Object.keys(result).sort(), [
    "id",
    "measuredWeightKg",
    "quoteCurrency",
    "quotedAmount",
    "quotedAt",
    "ratePerKg",
    "status",
    "trackingNumber",
  ]);
});

test("validates input before any database operation", async () => {
  const { dependencies, updates, getFindCount } = createDependencies();

  await assert.rejects(
    quoteShipment(
      SHIPMENT_ID,
      { ...validInput(), measuredWeightKg: 0 },
      dependencies,
    ),
    ZodError,
  );

  assert.equal(getFindCount(), 0);
  assert.equal(updates.length, 0);
});

test("throws ShipmentNotFoundError when the shipment does not exist", async () => {
  const { dependencies, updates } = createDependencies({
    findShipment: async () => null,
  });

  await assert.rejects(
    quoteShipment(SHIPMENT_ID, validInput(), dependencies),
    ShipmentNotFoundError,
  );
  assert.equal(updates.length, 0);
});

test("rejects every status other than AWAITING_QUOTE", async () => {
  for (const status of Object.values(ShipmentStatus)) {
    if (status === ShipmentStatus.AWAITING_QUOTE) {
      continue;
    }

    let updateCount = 0;
    const { dependencies } = createDependencies({
      findShipment: async () => quoteableShipment({ status }),
      updateShipmentQuote: async () => {
        updateCount += 1;
        return { count: 1 };
      },
    });

    await assert.rejects(
      quoteShipment(SHIPMENT_ID, validInput(), dependencies),
      ShipmentQuotationNotAllowedError,
    );
    assert.equal(updateCount, 0);
  }
});

test("prevents overwriting any existing quotation field", async () => {
  const existingFields: Array<Partial<ShipmentLookup>> = [
    { measuredWeightKg: new Prisma.Decimal("1.25") },
    { ratePerKg: new Prisma.Decimal("8.50") },
    { quotedAmount: new Prisma.Decimal("10.63") },
    { quoteCurrency: ShipmentQuoteCurrency.USD },
    { quotedAt: QUOTED_AT },
  ];

  for (const existingField of existingFields) {
    let updateCount = 0;
    const { dependencies } = createDependencies({
      findShipment: async () => quoteableShipment(existingField),
      updateShipmentQuote: async () => {
        updateCount += 1;
        return { count: 1 };
      },
    });

    await assert.rejects(
      quoteShipment(SHIPMENT_ID, validInput(), dependencies),
      ShipmentQuotationAlreadyExistsError,
    );
    assert.equal(updateCount, 0);
  }
});

test("persists the complete quotation and status in one conditional update", async () => {
  const { dependencies, updates } = createDependencies();

  await quoteShipment(SHIPMENT_ID, validInput(), dependencies);

  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0].where, {
    id: SHIPMENT_ID,
    status: ShipmentStatus.AWAITING_QUOTE,
  });

  const data = updates[0].data;
  assert.ok(data.measuredWeightKg instanceof Prisma.Decimal);
  assert.equal(data.measuredWeightKg.toString(), "10.125");
  assert.ok(data.ratePerKg instanceof Prisma.Decimal);
  assert.equal(data.ratePerKg.toString(), "8.5");
  assert.ok(data.quotedAmount instanceof Prisma.Decimal);
  assert.equal(data.quotedAmount.toString(), "80");
  assert.equal(data.quoteCurrency, ShipmentQuoteCurrency.USD);
  assert.equal(data.quotedAt, QUOTED_AT);
  assert.equal(data.status, ShipmentStatus.AWAITING_PAYMENT);
  assert.deepEqual(Object.keys(data).sort(), [
    "measuredWeightKg",
    "quoteCurrency",
    "quotedAmount",
    "quotedAt",
    "ratePerKg",
    "status",
  ]);
});

test("uses the injected clock for quotedAt", async () => {
  const customTime = new Date("2026-12-31T23:59:59.000Z");
  const { dependencies, updates } = createDependencies({
    now: () => customTime,
  });

  const result = await quoteShipment(
    SHIPMENT_ID,
    validInput(),
    dependencies,
  );

  assert.equal(updates[0].data.quotedAt, customTime);
  assert.equal(result.quotedAt, customTime);
});

test("rejects caller-controlled quotedAt and status before lookup", async () => {
  for (const serverField of [
    { quotedAt: new Date() },
    { status: ShipmentStatus.AWAITING_PAYMENT },
  ]) {
    const { dependencies, updates, getFindCount } = createDependencies();

    await assert.rejects(
      quoteShipment(
        SHIPMENT_ID,
        { ...validInput(), ...serverField },
        dependencies,
      ),
      ZodError,
    );
    assert.equal(getFindCount(), 0);
    assert.equal(updates.length, 0);
  }
});

test("detects a concurrent status change without retrying or overwriting", async () => {
  let updateCount = 0;
  const { dependencies } = createDependencies({
    updateShipmentQuote: async (args) => {
      updateCount += 1;
      assert.deepEqual(args.where, {
        id: SHIPMENT_ID,
        status: ShipmentStatus.AWAITING_QUOTE,
      });
      return { count: 0 };
    },
  });

  await assert.rejects(
    quoteShipment(SHIPMENT_ID, validInput(), dependencies),
    ShipmentQuotationConflictError,
  );
  assert.equal(updateCount, 1);
});

test("rethrows an update failure without retrying", async () => {
  const databaseError = new Error("database unavailable");
  let updateCount = 0;
  const { dependencies } = createDependencies({
    updateShipmentQuote: async () => {
      updateCount += 1;
      throw databaseError;
    },
  });

  await assert.rejects(
    quoteShipment(SHIPMENT_ID, validInput(), dependencies),
    (error) => error === databaseError,
  );
  assert.equal(updateCount, 1);
});

test("does not mutate the original quotation input", async () => {
  const input = validInput();
  const originalInput = structuredClone(input);
  const { dependencies } = createDependencies();

  await quoteShipment(SHIPMENT_ID, input, dependencies);

  assert.deepEqual(input, originalInput);
});
