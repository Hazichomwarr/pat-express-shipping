import assert from "node:assert/strict";
import test from "node:test";

import {
  Prisma,
  ShipmentDirection,
  ShipmentPaymentMethod,
  ShipmentPaymentStatus,
  ShipmentQuoteCurrency,
  ShipmentStatus,
} from "@prisma/client";
import { ZodError } from "zod";

import {
  createShipmentPayment,
  ShipmentNotFoundError,
  ShipmentPaymentAmountMismatchError,
  ShipmentPaymentCurrencyMismatchError,
  ShipmentPaymentMethodNotAllowedForDirectionError,
  ShipmentPaymentNotAllowedError,
  ShipmentPendingPaymentAlreadyExistsError,
  ShipmentQuoteIncompleteError,
} from "./shipment-payment.service";

const SHIPMENT_ID = "shipment_1";
const PAYMENT_ID = "payment_1";
const CREATED_AT = new Date("2026-08-08T18:00:00.000Z");
const QUOTED_AT = new Date("2026-08-08T16:00:00.000Z");

type Dependencies = NonNullable<Parameters<typeof createShipmentPayment>[2]>;
type TransactionOperation = Parameters<
  Dependencies["runInTransaction"]
>[0];
type PaymentTransaction = Parameters<TransactionOperation>[0];
type ShipmentLookup = NonNullable<
  Awaited<ReturnType<PaymentTransaction["findShipment"]>>
>;

function validZelleInput() {
  return {
    method: ShipmentPaymentMethod.ZELLE,
    amount: 149.99,
    currency: ShipmentQuoteCurrency.USD,
    zelleName: "  Ada Sender  ",
  };
}

function validCashInput() {
  return {
    method: ShipmentPaymentMethod.CASH,
    amount: 149.99,
    currency: ShipmentQuoteCurrency.USD,
  };
}

function validOrangeMoneyInput() {
  return {
    method: ShipmentPaymentMethod.ORANGE_MONEY,
    amount: 149.99,
    currency: ShipmentQuoteCurrency.USD,
    mobileMoneyPayerName: "  Awa Ouédraogo  ",
  };
}

function payableShipment(
  overrides: Partial<ShipmentLookup> = {},
): ShipmentLookup {
  return {
    id: SHIPMENT_ID,
    status: ShipmentStatus.AWAITING_PAYMENT,
    direction: ShipmentDirection.US_TO_BF,
    measuredWeightKg: new Prisma.Decimal("10.125"),
    ratePerKg: new Prisma.Decimal("8.50"),
    quotedAmount: new Prisma.Decimal("149.99"),
    quoteCurrency: ShipmentQuoteCurrency.USD,
    quotedAt: QUOTED_AT,
    ...overrides,
  };
}

function createDependencies(
  overrides: Partial<PaymentTransaction> = {},
) {
  const creates: Prisma.ShipmentPaymentCreateArgs[] = [];
  let transactionCount = 0;
  let findShipmentCount = 0;
  let findPendingPaymentCount = 0;

  const transaction: PaymentTransaction = {
    findShipment: async () => {
      findShipmentCount += 1;
      return payableShipment();
    },
    findPendingPayment: async () => {
      findPendingPaymentCount += 1;
      return null;
    },
    createPayment: async (args) => {
      creates.push(args);
      const data = args.data as {
        shipmentId: string;
        method: ShipmentPaymentMethod;
        status: ShipmentPaymentStatus;
        amount: Prisma.Decimal;
        currency: ShipmentQuoteCurrency;
        zelleName: string | null;
        mobileMoneyPayerName: string | null;
      };

      return {
        id: PAYMENT_ID,
        shipmentId: data.shipmentId,
        method: data.method,
        status: data.status,
        amount: data.amount,
        currency: data.currency,
        zelleName: data.zelleName,
        mobileMoneyPayerName: data.mobileMoneyPayerName,
        createdAt: CREATED_AT,
      };
    },
    ...overrides,
  };

  const dependencies: Dependencies = {
    runInTransaction: async (operation) => {
      transactionCount += 1;
      return operation(transaction);
    },
  };

  return {
    dependencies,
    creates,
    getTransactionCount: () => transactionCount,
    getFindShipmentCount: () => findShipmentCount,
    getFindPendingPaymentCount: () => findPendingPaymentCount,
  };
}

test("creates a pending Zelle payment and returns only safe fields", async () => {
  const { dependencies, creates } = createDependencies();

  const result = await createShipmentPayment(
    SHIPMENT_ID,
    validZelleInput(),
    dependencies,
  );

  assert.deepEqual(result, {
    id: PAYMENT_ID,
    shipmentId: SHIPMENT_ID,
    method: ShipmentPaymentMethod.ZELLE,
    status: ShipmentPaymentStatus.PENDING,
    amount: "149.99",
    currency: ShipmentQuoteCurrency.USD,
    zelleName: "Ada Sender",
    mobileMoneyPayerName: null,
    createdAt: CREATED_AT,
  });
  assert.deepEqual(Object.keys(result).sort(), [
    "amount",
    "createdAt",
    "currency",
    "id",
    "method",
    "mobileMoneyPayerName",
    "shipmentId",
    "status",
    "zelleName",
  ]);

  const data = creates[0].data as Record<string, unknown>;
  assert.equal(data.status, ShipmentPaymentStatus.PENDING);
  assert.equal(data.zelleName, "Ada Sender");
  assert.equal(data.mobileMoneyPayerName, null);
  assert.equal("confirmedAt" in data, false);
  assert.equal("confirmedByStaffId" in data, false);
  assert.equal("cancelledAt" in data, false);
  assert.equal("shipment" in data, false);
});

test("creates cash with a null Zelle identity", async () => {
  const { dependencies, creates } = createDependencies();

  const result = await createShipmentPayment(
    SHIPMENT_ID,
    validCashInput(),
    dependencies,
  );

  assert.equal(result.method, ShipmentPaymentMethod.CASH);
  assert.equal(result.zelleName, null);
  assert.equal(result.mobileMoneyPayerName, null);
  assert.equal(
    (creates[0].data as { zelleName: string | null }).zelleName,
    null,
  );
  assert.equal(
    (creates[0].data as { mobileMoneyPayerName: string | null })
      .mobileMoneyPayerName,
    null,
  );
});

test("creates Orange Money with only its normalized payer identity", async () => {
  const { dependencies, creates } = createDependencies({
    findShipment: async () =>
      payableShipment({ direction: ShipmentDirection.BF_TO_US }),
  });

  const result = await createShipmentPayment(
    SHIPMENT_ID,
    validOrangeMoneyInput(),
    dependencies,
  );

  assert.equal(result.method, ShipmentPaymentMethod.ORANGE_MONEY);
  assert.equal(result.zelleName, null);
  assert.equal(result.mobileMoneyPayerName, "Awa Ouédraogo");
  assert.equal(
    (creates[0].data as { zelleName: string | null }).zelleName,
    null,
  );
  assert.equal(
    (creates[0].data as { mobileMoneyPayerName: string | null })
      .mobileMoneyPayerName,
    "Awa Ouédraogo",
  );
});

test("allows Cash for shipments in both directions", async () => {
  for (const direction of Object.values(ShipmentDirection)) {
    const { dependencies, creates } = createDependencies({
      findShipment: async () => payableShipment({ direction }),
    });

    const result = await createShipmentPayment(
      SHIPMENT_ID,
      validCashInput(),
      dependencies,
    );

    assert.equal(result.method, ShipmentPaymentMethod.CASH);
    assert.equal(creates.length, 1);
  }
});

test("rejects methods that are valid in the domain but unavailable for the shipment direction", async () => {
  const cases = [
    {
      direction: ShipmentDirection.US_TO_BF,
      input: validOrangeMoneyInput(),
    },
    {
      direction: ShipmentDirection.BF_TO_US,
      input: validZelleInput(),
    },
  ] as const;

  for (const { direction, input } of cases) {
    const {
      dependencies,
      creates,
      getFindPendingPaymentCount,
    } = createDependencies({
      findShipment: async () => payableShipment({ direction }),
    });

    await assert.rejects(
      createShipmentPayment(SHIPMENT_ID, input, dependencies),
      ShipmentPaymentMethodNotAllowedForDirectionError,
    );
    assert.equal(getFindPendingPaymentCount(), 0);
    assert.equal(creates.length, 0);
  }
});

test("validates input before opening a database transaction", async () => {
  const { dependencies, creates, getTransactionCount } = createDependencies();

  await assert.rejects(
    createShipmentPayment(
      SHIPMENT_ID,
      { ...validCashInput(), amount: 0 },
      dependencies,
    ),
    ZodError,
  );

  assert.equal(getTransactionCount(), 0);
  assert.equal(creates.length, 0);
});

test("throws ShipmentNotFoundError when the shipment is missing", async () => {
  const { dependencies, creates } = createDependencies({
    findShipment: async () => null,
  });

  await assert.rejects(
    createShipmentPayment(SHIPMENT_ID, validCashInput(), dependencies),
    ShipmentNotFoundError,
  );
  assert.equal(creates.length, 0);
});

test("rejects every shipment status except AWAITING_PAYMENT", async () => {
  for (const status of Object.values(ShipmentStatus)) {
    if (status === ShipmentStatus.AWAITING_PAYMENT) {
      continue;
    }

    const { dependencies, creates } = createDependencies({
      findShipment: async () => payableShipment({ status }),
    });

    await assert.rejects(
      createShipmentPayment(SHIPMENT_ID, validCashInput(), dependencies),
      ShipmentPaymentNotAllowedError,
    );
    assert.equal(creates.length, 0);
  }
});

test("requires every official quotation field", async () => {
  const incompleteQuotes: Array<Partial<ShipmentLookup>> = [
    { measuredWeightKg: null },
    { ratePerKg: null },
    { quotedAmount: null },
    { quoteCurrency: null },
    { quotedAt: null },
  ];

  for (const incompleteQuote of incompleteQuotes) {
    const { dependencies, creates } = createDependencies({
      findShipment: async () => payableShipment(incompleteQuote),
    });

    await assert.rejects(
      createShipmentPayment(SHIPMENT_ID, validCashInput(), dependencies),
      ShipmentQuoteIncompleteError,
    );
    assert.equal(creates.length, 0);
  }
});

test("requires an exact Decimal match with the quoted amount", async () => {
  for (const amount of [149.98, 150]) {
    const { dependencies, creates } = createDependencies();

    await assert.rejects(
      createShipmentPayment(
        SHIPMENT_ID,
        { ...validCashInput(), amount },
        dependencies,
      ),
      ShipmentPaymentAmountMismatchError,
    );
    assert.equal(creates.length, 0);
  }
});

test("compares amounts with Prisma Decimal semantics", async () => {
  const { dependencies, creates } = createDependencies({
    findShipment: async () =>
      payableShipment({ quotedAmount: new Prisma.Decimal("0.10") }),
  });

  const result = await createShipmentPayment(
    SHIPMENT_ID,
    { ...validCashInput(), amount: 0.1 },
    dependencies,
  );

  const amount = (creates[0].data as { amount: unknown }).amount;
  assert.ok(amount instanceof Prisma.Decimal);
  assert.equal(amount.toString(), "0.1");
  assert.equal(result.amount, "0.1");
});

test("rejects a currency that differs from the stored quote", async () => {
  const { dependencies, creates } = createDependencies({
    findShipment: async () =>
      payableShipment({
        quoteCurrency: "UNSUPPORTED" as ShipmentQuoteCurrency,
      }),
  });

  await assert.rejects(
    createShipmentPayment(SHIPMENT_ID, validCashInput(), dependencies),
    ShipmentPaymentCurrencyMismatchError,
  );
  assert.equal(creates.length, 0);
});

test("blocks an existing pending payment inside the transaction", async () => {
  let pendingLookupCount = 0;
  const { dependencies, creates } = createDependencies({
    findPendingPayment: async () => {
      pendingLookupCount += 1;
      return { id: "payment_existing" };
    },
  });

  await assert.rejects(
    createShipmentPayment(SHIPMENT_ID, validCashInput(), dependencies),
    ShipmentPendingPaymentAlreadyExistsError,
  );
  assert.equal(pendingLookupCount, 1);
  assert.equal(creates.length, 0);
});

test("a cancelled historical payment does not block a new attempt", async () => {
  let pendingLookupCount = 0;
  const { dependencies, creates } = createDependencies({
    findPendingPayment: async () => {
      pendingLookupCount += 1;
      return null;
    },
  });

  await createShipmentPayment(SHIPMENT_ID, validCashInput(), dependencies);

  assert.equal(pendingLookupCount, 1);
  assert.equal(creates.length, 1);
});

test("does not update shipment status or set confirmation metadata", async () => {
  const { dependencies, creates } = createDependencies();

  await createShipmentPayment(SHIPMENT_ID, validCashInput(), dependencies);

  assert.deepEqual(Object.keys(creates[0].data).sort(), [
    "amount",
    "currency",
    "method",
    "mobileMoneyPayerName",
    "shipmentId",
    "status",
    "zelleName",
  ]);
});

test("does not mutate the original input", async () => {
  const input = validZelleInput();
  const originalInput = structuredClone(input);
  const { dependencies } = createDependencies();

  await createShipmentPayment(SHIPMENT_ID, input, dependencies);

  assert.deepEqual(input, originalInput);
});

test("rethrows non-business database errors", async () => {
  const databaseError = new Error("database unavailable");
  const { dependencies, creates } = createDependencies({
    findShipment: async () => {
      throw databaseError;
    },
  });

  await assert.rejects(
    createShipmentPayment(SHIPMENT_ID, validCashInput(), dependencies),
    (error) => error === databaseError,
  );
  assert.equal(creates.length, 0);
});
