import assert from "node:assert/strict";
import test from "node:test";

import {
  Prisma,
  ShipmentPaymentMethod,
  ShipmentPaymentStatus,
  ShipmentQuoteCurrency,
  ShipmentStatus,
} from "@prisma/client";

import {
  confirmShipmentPayment,
  ShipmentPaymentConfirmationConflictError,
  ShipmentPaymentConfirmationNotAllowedError,
  ShipmentPaymentConfirmerRequiredError,
  ShipmentPaymentNotFoundError,
  ShipmentPaymentShipmentStateError,
  ShipmentPaymentStateInconsistentError,
} from "./shipment-payment-confirmation.service";

const PAYMENT_ID = "payment_1";
const SHIPMENT_ID = "shipment_1";
const STAFF_ID = "staff_1";
const TRACKING_NUMBER = "PAT-2026-ABCDEFGH";
const CONFIRMED_AT = new Date("2026-08-08T20:30:00.000Z");

type Dependencies = NonNullable<
  Parameters<typeof confirmShipmentPayment>[2]
>;
type PaymentLookup = NonNullable<
  Awaited<ReturnType<Dependencies["findPayment"]>>
>;
type TransactionOperation = Parameters<
  Dependencies["runConfirmationTransaction"]
>[0];
type ConfirmationTransaction = Parameters<TransactionOperation>[0];

function pendingPayment(
  overrides: Partial<PaymentLookup> = {},
  shipmentOverrides: Partial<PaymentLookup["shipment"]> = {},
): PaymentLookup {
  return {
    id: PAYMENT_ID,
    shipmentId: SHIPMENT_ID,
    status: ShipmentPaymentStatus.PENDING,
    method: ShipmentPaymentMethod.ZELLE,
    amount: new Prisma.Decimal("149.99"),
    currency: ShipmentQuoteCurrency.USD,
    zelleName: "Ada Sender",
    mobileMoneyPayerName: null,
    confirmedAt: null,
    confirmedByStaffId: null,
    cancelledAt: null,
    shipment: {
      id: SHIPMENT_ID,
      trackingNumber: TRACKING_NUMBER,
      status: ShipmentStatus.AWAITING_PAYMENT,
      paymentConfirmedAt: null,
      ...shipmentOverrides,
    },
    ...overrides,
  };
}

function createDependencies(options: {
  payment?: PaymentLookup | null;
  transaction?: Partial<ConfirmationTransaction>;
  dependencies?: Partial<Dependencies>;
} = {}) {
  const paymentUpdates: Prisma.ShipmentPaymentUpdateManyArgs[] = [];
  const shipmentUpdates: Prisma.ShipmentUpdateManyArgs[] = [];
  let findCount = 0;
  let transactionCount = 0;
  let nowCount = 0;

  const transaction: ConfirmationTransaction = {
    updatePayment: async (args) => {
      paymentUpdates.push(args);
      return { count: 1 };
    },
    updateShipment: async (args) => {
      shipmentUpdates.push(args);
      return { count: 1 };
    },
    ...options.transaction,
  };

  const dependencies: Dependencies = {
    findPayment: async () => {
      findCount += 1;
      return options.payment === undefined
        ? pendingPayment()
        : options.payment;
    },
    runConfirmationTransaction: async (operation) => {
      transactionCount += 1;
      return operation(transaction);
    },
    now: () => {
      nowCount += 1;
      return CONFIRMED_AT;
    },
    ...options.dependencies,
  };

  return {
    dependencies,
    paymentUpdates,
    shipmentUpdates,
    getFindCount: () => findCount,
    getTransactionCount: () => transactionCount,
    getNowCount: () => nowCount,
  };
}

test("confirms a pending payment and returns only safe state", async () => {
  const { dependencies } = createDependencies();

  const result = await confirmShipmentPayment(
    PAYMENT_ID,
    STAFF_ID,
    dependencies,
  );

  assert.deepEqual(result, {
    payment: {
      id: PAYMENT_ID,
      shipmentId: SHIPMENT_ID,
      method: ShipmentPaymentMethod.ZELLE,
      status: ShipmentPaymentStatus.CONFIRMED,
      amount: "149.99",
      currency: ShipmentQuoteCurrency.USD,
      zelleName: "Ada Sender",
      mobileMoneyPayerName: null,
      confirmedAt: CONFIRMED_AT,
      confirmedByStaffId: STAFF_ID,
    },
    shipment: {
      id: SHIPMENT_ID,
      trackingNumber: TRACKING_NUMBER,
      status: ShipmentStatus.PAYMENT_CONFIRMED,
      paymentConfirmedAt: CONFIRMED_AT,
    },
  });
  assert.deepEqual(Object.keys(result).sort(), ["payment", "shipment"]);
  assert.deepEqual(Object.keys(result.payment).sort(), [
    "amount",
    "confirmedAt",
    "confirmedByStaffId",
    "currency",
    "id",
    "method",
    "mobileMoneyPayerName",
    "shipmentId",
    "status",
    "zelleName",
  ]);
  assert.deepEqual(Object.keys(result.shipment).sort(), [
    "id",
    "paymentConfirmedAt",
    "status",
    "trackingNumber",
  ]);
});

test("rejects an empty staff ID before database access", async () => {
  for (const staffId of ["", "   "]) {
    const { dependencies, getFindCount, getTransactionCount } =
      createDependencies();

    await assert.rejects(
      confirmShipmentPayment(PAYMENT_ID, staffId, dependencies),
      ShipmentPaymentConfirmerRequiredError,
    );
    assert.equal(getFindCount(), 0);
    assert.equal(getTransactionCount(), 0);
  }
});

test("throws ShipmentPaymentNotFoundError for a missing payment", async () => {
  const { dependencies, getTransactionCount } = createDependencies({
    payment: null,
  });

  await assert.rejects(
    confirmShipmentPayment(PAYMENT_ID, STAFF_ID, dependencies),
    ShipmentPaymentNotFoundError,
  );
  assert.equal(getTransactionCount(), 0);
});

test("rejects confirmed and cancelled payments", async () => {
  for (const status of [
    ShipmentPaymentStatus.CONFIRMED,
    ShipmentPaymentStatus.CANCELLED,
  ]) {
    const { dependencies, getTransactionCount } = createDependencies({
      payment: pendingPayment({ status }),
    });

    await assert.rejects(
      confirmShipmentPayment(PAYMENT_ID, STAFF_ID, dependencies),
      ShipmentPaymentConfirmationNotAllowedError,
    );
    assert.equal(getTransactionCount(), 0);
  }
});

test("rejects inconsistent pending payment history", async () => {
  const inconsistentFields: Array<Partial<PaymentLookup>> = [
    { confirmedAt: CONFIRMED_AT },
    { confirmedByStaffId: STAFF_ID },
    { cancelledAt: CONFIRMED_AT },
  ];

  for (const inconsistentField of inconsistentFields) {
    const { dependencies, getTransactionCount } = createDependencies({
      payment: pendingPayment(inconsistentField),
    });

    await assert.rejects(
      confirmShipmentPayment(PAYMENT_ID, STAFF_ID, dependencies),
      ShipmentPaymentStateInconsistentError,
    );
    assert.equal(getTransactionCount(), 0);
  }
});

test("uses the shipment transition policy for every current status", async () => {
  for (const status of Object.values(ShipmentStatus)) {
    if (status === ShipmentStatus.AWAITING_PAYMENT) {
      continue;
    }

    const { dependencies, getTransactionCount } = createDependencies({
      payment: pendingPayment({}, { status }),
    });

    await assert.rejects(
      confirmShipmentPayment(PAYMENT_ID, STAFF_ID, dependencies),
      ShipmentPaymentShipmentStateError,
    );
    assert.equal(getTransactionCount(), 0);
  }
});

test("rejects an existing shipment payment-confirmation timestamp", async () => {
  const { dependencies, getTransactionCount } = createDependencies({
    payment: pendingPayment({}, { paymentConfirmedAt: CONFIRMED_AT }),
  });

  await assert.rejects(
    confirmShipmentPayment(PAYMENT_ID, STAFF_ID, dependencies),
    ShipmentPaymentStateInconsistentError,
  );
  assert.equal(getTransactionCount(), 0);
});

test("uses one injected timestamp for both conditional updates", async () => {
  const {
    dependencies,
    paymentUpdates,
    shipmentUpdates,
    getNowCount,
  } = createDependencies();

  await confirmShipmentPayment(PAYMENT_ID, STAFF_ID, dependencies);

  assert.equal(getNowCount(), 1);
  assert.deepEqual(paymentUpdates[0], {
    where: {
      id: PAYMENT_ID,
      status: ShipmentPaymentStatus.PENDING,
      confirmedAt: null,
      confirmedByStaffId: null,
      cancelledAt: null,
    },
    data: {
      status: ShipmentPaymentStatus.CONFIRMED,
      confirmedAt: CONFIRMED_AT,
      confirmedByStaffId: STAFF_ID,
    },
  });
  assert.deepEqual(shipmentUpdates[0], {
    where: {
      id: SHIPMENT_ID,
      status: ShipmentStatus.AWAITING_PAYMENT,
      paymentConfirmedAt: null,
    },
    data: {
      status: ShipmentStatus.PAYMENT_CONFIRMED,
      paymentConfirmedAt: CONFIRMED_AT,
    },
  });
});

test("does not rewrite original payment facts", async () => {
  const { dependencies, paymentUpdates } = createDependencies();

  await confirmShipmentPayment(PAYMENT_ID, STAFF_ID, dependencies);

  assert.deepEqual(Object.keys(paymentUpdates[0].data).sort(), [
    "confirmedAt",
    "confirmedByStaffId",
    "status",
  ]);
  assert.equal("method" in paymentUpdates[0].data, false);
  assert.equal("amount" in paymentUpdates[0].data, false);
  assert.equal("currency" in paymentUpdates[0].data, false);
  assert.equal("zelleName" in paymentUpdates[0].data, false);
  assert.equal("mobileMoneyPayerName" in paymentUpdates[0].data, false);
});

test("confirmation preserves Orange Money payment identity", async () => {
  const orangeMoneyPayment = pendingPayment({
    method: ShipmentPaymentMethod.ORANGE_MONEY,
    zelleName: null,
    mobileMoneyPayerName: "Awa Ouédraogo",
  });
  const { dependencies, paymentUpdates } = createDependencies({
    payment: orangeMoneyPayment,
  });

  const result = await confirmShipmentPayment(
    PAYMENT_ID,
    STAFF_ID,
    dependencies,
  );

  assert.equal(result.payment.method, ShipmentPaymentMethod.ORANGE_MONEY);
  assert.equal(result.payment.amount, "149.99");
  assert.equal(result.payment.currency, ShipmentQuoteCurrency.USD);
  assert.equal(result.payment.zelleName, null);
  assert.equal(result.payment.mobileMoneyPayerName, "Awa Ouédraogo");
  assert.equal("method" in paymentUpdates[0].data, false);
  assert.equal("amount" in paymentUpdates[0].data, false);
  assert.equal("currency" in paymentUpdates[0].data, false);
  assert.equal("mobileMoneyPayerName" in paymentUpdates[0].data, false);
});

test("throws a conflict when the conditional payment update loses", async () => {
  let paymentUpdateCount = 0;
  let shipmentUpdateCount = 0;
  const { dependencies, getTransactionCount } = createDependencies({
    transaction: {
      updatePayment: async () => {
        paymentUpdateCount += 1;
        return { count: 0 };
      },
      updateShipment: async () => {
        shipmentUpdateCount += 1;
        return { count: 1 };
      },
    },
  });

  await assert.rejects(
    confirmShipmentPayment(PAYMENT_ID, STAFF_ID, dependencies),
    ShipmentPaymentConfirmationConflictError,
  );
  assert.equal(paymentUpdateCount, 1);
  assert.equal(shipmentUpdateCount, 0);
  assert.equal(getTransactionCount(), 1);
});

test("throws a conflict when the conditional shipment update loses", async () => {
  let paymentUpdateCount = 0;
  let shipmentUpdateCount = 0;
  const { dependencies, getTransactionCount } = createDependencies({
    transaction: {
      updatePayment: async () => {
        paymentUpdateCount += 1;
        return { count: 1 };
      },
      updateShipment: async () => {
        shipmentUpdateCount += 1;
        return { count: 0 };
      },
    },
  });

  await assert.rejects(
    confirmShipmentPayment(PAYMENT_ID, STAFF_ID, dependencies),
    ShipmentPaymentConfirmationConflictError,
  );
  assert.equal(paymentUpdateCount, 1);
  assert.equal(shipmentUpdateCount, 1);
  assert.equal(getTransactionCount(), 1);
});

test("a shipment conflict rolls back the staged payment update", async () => {
  let persistedPaymentStatus: ShipmentPaymentStatus =
    ShipmentPaymentStatus.PENDING;
  let transactionCount = 0;
  const { dependencies: baseDependencies } = createDependencies();
  const dependencies: Dependencies = {
    ...baseDependencies,
    runConfirmationTransaction: async (operation) => {
      transactionCount += 1;
      const originalPaymentStatus = persistedPaymentStatus;

      try {
        return await operation({
          updatePayment: async () => {
            persistedPaymentStatus = ShipmentPaymentStatus.CONFIRMED;
            return { count: 1 };
          },
          updateShipment: async () => ({ count: 0 }),
        });
      } catch (error) {
        persistedPaymentStatus = originalPaymentStatus;
        throw error;
      }
    },
  };

  await assert.rejects(
    confirmShipmentPayment(PAYMENT_ID, STAFF_ID, dependencies),
    ShipmentPaymentConfirmationConflictError,
  );
  assert.equal(persistedPaymentStatus, ShipmentPaymentStatus.PENDING);
  assert.equal(transactionCount, 1);
});

test("rethrows unexpected database errors without retrying", async () => {
  const databaseError = new Error("database unavailable");
  let updateCount = 0;
  const { dependencies, getTransactionCount } = createDependencies({
    transaction: {
      updatePayment: async () => {
        updateCount += 1;
        throw databaseError;
      },
    },
  });

  await assert.rejects(
    confirmShipmentPayment(PAYMENT_ID, STAFF_ID, dependencies),
    (error) => error === databaseError,
  );
  assert.equal(updateCount, 1);
  assert.equal(getTransactionCount(), 1);
});
