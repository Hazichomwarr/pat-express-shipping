import "server-only";

import {
  Prisma,
  ShipmentPaymentMethod,
  ShipmentPaymentStatus,
  ShipmentQuoteCurrency,
  ShipmentStatus,
} from "@prisma/client";

import { canConfirmShipmentPaymentStatus } from "./_shared/shipment-payment";
import { canTransitionShipmentStatus } from "./_shared/shipment-status-transition";

const paymentForConfirmationSelect = {
  id: true,
  shipmentId: true,
  status: true,
  method: true,
  amount: true,
  currency: true,
  zelleName: true,
  confirmedAt: true,
  confirmedByStaffId: true,
  cancelledAt: true,
  shipment: {
    select: {
      id: true,
      trackingNumber: true,
      status: true,
      paymentConfirmedAt: true,
    },
  },
} satisfies Prisma.ShipmentPaymentSelect;

type PaymentForConfirmation = Prisma.ShipmentPaymentGetPayload<{
  select: typeof paymentForConfirmationSelect;
}>;

type ConfirmationTransaction = {
  updatePayment: (
    args: Prisma.ShipmentPaymentUpdateManyArgs,
  ) => Promise<Prisma.BatchPayload>;
  updateShipment: (
    args: Prisma.ShipmentUpdateManyArgs,
  ) => Promise<Prisma.BatchPayload>;
};

type ConfirmShipmentPaymentDependencies = {
  findPayment: (
    paymentId: string,
  ) => Promise<PaymentForConfirmation | null>;
  runConfirmationTransaction: <Result>(
    operation: (transaction: ConfirmationTransaction) => Promise<Result>,
  ) => Promise<Result>;
  now: () => Date;
};

const defaultDependencies: ConfirmShipmentPaymentDependencies = {
  findPayment: async (paymentId) => {
    const { prisma } = await import("../lib/prisma");

    return prisma.shipmentPayment.findUnique({
      where: { id: paymentId },
      select: paymentForConfirmationSelect,
    });
  },
  runConfirmationTransaction: async (operation) => {
    const { prisma } = await import("../lib/prisma");

    return prisma.$transaction((transaction) =>
      operation({
        updatePayment: (args) => transaction.shipmentPayment.updateMany(args),
        updateShipment: (args) => transaction.shipment.updateMany(args),
      }),
    );
  },
  now: () => new Date(),
};

export type ConfirmShipmentPaymentResult = {
  payment: {
    id: string;
    shipmentId: string;
    method: ShipmentPaymentMethod;
    status: ShipmentPaymentStatus;
    amount: string;
    currency: ShipmentQuoteCurrency;
    zelleName: string | null;
    confirmedAt: Date;
    confirmedByStaffId: string;
  };
  shipment: {
    id: string;
    trackingNumber: string;
    status: ShipmentStatus;
    paymentConfirmedAt: Date;
  };
};

export class ShipmentPaymentNotFoundError extends Error {
  constructor() {
    super("Shipment payment not found.");
    this.name = "ShipmentPaymentNotFoundError";
  }
}

export class ShipmentPaymentConfirmerRequiredError extends Error {
  constructor() {
    super("A confirming staff ID is required.");
    this.name = "ShipmentPaymentConfirmerRequiredError";
  }
}

export class ShipmentPaymentConfirmationNotAllowedError extends Error {
  constructor() {
    super("Shipment payment cannot be confirmed in its current state.");
    this.name = "ShipmentPaymentConfirmationNotAllowedError";
  }
}

export class ShipmentPaymentStateInconsistentError extends Error {
  constructor() {
    super("Shipment payment confirmation state is inconsistent.");
    this.name = "ShipmentPaymentStateInconsistentError";
  }
}

export class ShipmentPaymentShipmentStateError extends Error {
  constructor() {
    super("Shipment state does not allow payment confirmation.");
    this.name = "ShipmentPaymentShipmentStateError";
  }
}

export class ShipmentPaymentConfirmationConflictError extends Error {
  constructor() {
    super("Shipment payment confirmation conflicted with a newer state.");
    this.name = "ShipmentPaymentConfirmationConflictError";
  }
}

function hasInconsistentPaymentState(
  payment: PaymentForConfirmation,
): boolean {
  return (
    payment.confirmedAt !== null ||
    payment.confirmedByStaffId !== null ||
    payment.cancelledAt !== null
  );
}

export async function confirmShipmentPayment(
  paymentId: string,
  staffId: string,
  dependencies: ConfirmShipmentPaymentDependencies = defaultDependencies,
): Promise<ConfirmShipmentPaymentResult> {
  if (typeof staffId !== "string" || staffId.trim() === "") {
    throw new ShipmentPaymentConfirmerRequiredError();
  }

  const payment = await dependencies.findPayment(paymentId);

  if (!payment) {
    throw new ShipmentPaymentNotFoundError();
  }

  if (!canConfirmShipmentPaymentStatus(payment.status)) {
    throw new ShipmentPaymentConfirmationNotAllowedError();
  }

  if (hasInconsistentPaymentState(payment)) {
    throw new ShipmentPaymentStateInconsistentError();
  }

  if (
    !canTransitionShipmentStatus(
      payment.shipment.status,
      ShipmentStatus.PAYMENT_CONFIRMED,
    )
  ) {
    throw new ShipmentPaymentShipmentStateError();
  }

  if (payment.shipment.paymentConfirmedAt !== null) {
    throw new ShipmentPaymentStateInconsistentError();
  }

  const confirmedAt = dependencies.now();

  await dependencies.runConfirmationTransaction(async (transaction) => {
    const paymentUpdate = await transaction.updatePayment({
      where: {
        id: payment.id,
        status: ShipmentPaymentStatus.PENDING,
        confirmedAt: null,
        confirmedByStaffId: null,
        cancelledAt: null,
      },
      data: {
        status: ShipmentPaymentStatus.CONFIRMED,
        confirmedAt,
        confirmedByStaffId: staffId,
      },
    });

    if (paymentUpdate.count !== 1) {
      throw new ShipmentPaymentConfirmationConflictError();
    }

    const shipmentUpdate = await transaction.updateShipment({
      where: {
        id: payment.shipment.id,
        status: ShipmentStatus.AWAITING_PAYMENT,
        paymentConfirmedAt: null,
      },
      data: {
        status: ShipmentStatus.PAYMENT_CONFIRMED,
        paymentConfirmedAt: confirmedAt,
      },
    });

    if (shipmentUpdate.count !== 1) {
      throw new ShipmentPaymentConfirmationConflictError();
    }
  });

  return {
    payment: {
      id: payment.id,
      shipmentId: payment.shipmentId,
      method: payment.method,
      status: ShipmentPaymentStatus.CONFIRMED,
      amount: payment.amount.toString(),
      currency: payment.currency,
      zelleName: payment.zelleName,
      confirmedAt,
      confirmedByStaffId: staffId,
    },
    shipment: {
      id: payment.shipment.id,
      trackingNumber: payment.shipment.trackingNumber,
      status: ShipmentStatus.PAYMENT_CONFIRMED,
      paymentConfirmedAt: confirmedAt,
    },
  };
}
