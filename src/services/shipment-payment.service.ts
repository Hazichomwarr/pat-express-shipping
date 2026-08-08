import "server-only";

import {
  Prisma,
  ShipmentPaymentMethod,
  ShipmentPaymentStatus,
  ShipmentQuoteCurrency,
} from "@prisma/client";

import { canStartShipmentPayment } from "./_shared/shipment-payment";
import { shipmentPaymentInputSchema } from "../validations/shipment-payment.schema";

const shipmentForPaymentSelect = {
  id: true,
  status: true,
  measuredWeightKg: true,
  ratePerKg: true,
  quotedAmount: true,
  quoteCurrency: true,
  quotedAt: true,
} satisfies Prisma.ShipmentSelect;

const createdPaymentSelect = {
  id: true,
  shipmentId: true,
  method: true,
  status: true,
  amount: true,
  currency: true,
  zelleName: true,
  createdAt: true,
} satisfies Prisma.ShipmentPaymentSelect;

type ShipmentForPayment = Prisma.ShipmentGetPayload<{
  select: typeof shipmentForPaymentSelect;
}>;

type CreatedPayment = Prisma.ShipmentPaymentGetPayload<{
  select: typeof createdPaymentSelect;
}>;

type PaymentTransaction = {
  findShipment: (shipmentId: string) => Promise<ShipmentForPayment | null>;
  findPendingPayment: (
    shipmentId: string,
  ) => Promise<{ id: string } | null>;
  createPayment: (
    args: Prisma.ShipmentPaymentCreateArgs,
  ) => Promise<CreatedPayment>;
};

type CreateShipmentPaymentDependencies = {
  runInTransaction: <Result>(
    operation: (transaction: PaymentTransaction) => Promise<Result>,
  ) => Promise<Result>;
};

const defaultDependencies: CreateShipmentPaymentDependencies = {
  runInTransaction: async (operation) => {
    const { prisma } = await import("../lib/prisma");

    // Serializable isolation keeps the pending-payment absence check and insert
    // safe against concurrent calls that use this service.
    return prisma.$transaction(
      (transaction) =>
        operation({
          findShipment: (shipmentId) =>
            transaction.shipment.findUnique({
              where: { id: shipmentId },
              select: shipmentForPaymentSelect,
            }),
          findPendingPayment: (shipmentId) =>
            transaction.shipmentPayment.findFirst({
              where: {
                shipmentId,
                status: ShipmentPaymentStatus.PENDING,
              },
              select: { id: true },
            }),
          createPayment: (args) => transaction.shipmentPayment.create(args),
        }),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  },
};

export type CreateShipmentPaymentResult = {
  id: string;
  shipmentId: string;
  method: ShipmentPaymentMethod;
  status: ShipmentPaymentStatus;
  amount: string;
  currency: ShipmentQuoteCurrency;
  zelleName: string | null;
  createdAt: Date;
};

export class ShipmentNotFoundError extends Error {
  constructor() {
    super("Shipment not found.");
    this.name = "ShipmentNotFoundError";
  }
}

export class ShipmentPaymentNotAllowedError extends Error {
  constructor() {
    super("Shipment is not eligible to start a payment.");
    this.name = "ShipmentPaymentNotAllowedError";
  }
}

export class ShipmentQuoteIncompleteError extends Error {
  constructor() {
    super("Shipment quotation is incomplete.");
    this.name = "ShipmentQuoteIncompleteError";
  }
}

export class ShipmentPaymentAmountMismatchError extends Error {
  constructor() {
    super("Payment amount does not match the shipment quotation.");
    this.name = "ShipmentPaymentAmountMismatchError";
  }
}

export class ShipmentPaymentCurrencyMismatchError extends Error {
  constructor() {
    super("Payment currency does not match the shipment quotation.");
    this.name = "ShipmentPaymentCurrencyMismatchError";
  }
}

export class ShipmentPendingPaymentAlreadyExistsError extends Error {
  constructor() {
    super("A pending payment already exists for this shipment.");
    this.name = "ShipmentPendingPaymentAlreadyExistsError";
  }
}

function hasCompleteQuotation(
  shipment: ShipmentForPayment,
): shipment is ShipmentForPayment & {
  measuredWeightKg: Prisma.Decimal;
  ratePerKg: Prisma.Decimal;
  quotedAmount: Prisma.Decimal;
  quoteCurrency: ShipmentQuoteCurrency;
  quotedAt: Date;
} {
  return (
    shipment.measuredWeightKg !== null &&
    shipment.ratePerKg !== null &&
    shipment.quotedAmount !== null &&
    shipment.quoteCurrency !== null &&
    shipment.quotedAt !== null
  );
}

export async function createShipmentPayment(
  shipmentId: string,
  input: unknown,
  dependencies: CreateShipmentPaymentDependencies = defaultDependencies,
): Promise<CreateShipmentPaymentResult> {
  const validatedInput = shipmentPaymentInputSchema.parse(input);
  const paymentAmount = new Prisma.Decimal(validatedInput.amount.toString());

  return dependencies.runInTransaction(async (transaction) => {
    const shipment = await transaction.findShipment(shipmentId);

    if (!shipment) {
      throw new ShipmentNotFoundError();
    }

    if (!canStartShipmentPayment(shipment.status)) {
      throw new ShipmentPaymentNotAllowedError();
    }

    if (!hasCompleteQuotation(shipment)) {
      throw new ShipmentQuoteIncompleteError();
    }

    if (!paymentAmount.equals(shipment.quotedAmount)) {
      throw new ShipmentPaymentAmountMismatchError();
    }

    if (validatedInput.currency !== shipment.quoteCurrency) {
      throw new ShipmentPaymentCurrencyMismatchError();
    }

    const pendingPayment = await transaction.findPendingPayment(shipment.id);

    if (pendingPayment) {
      throw new ShipmentPendingPaymentAlreadyExistsError();
    }

    const payment = await transaction.createPayment({
      data: {
        shipmentId: shipment.id,
        method: validatedInput.method,
        status: ShipmentPaymentStatus.PENDING,
        amount: paymentAmount,
        currency: validatedInput.currency,
        zelleName: validatedInput.zelleName ?? null,
      },
      select: createdPaymentSelect,
    });

    return {
      id: payment.id,
      shipmentId: payment.shipmentId,
      method: payment.method,
      status: payment.status,
      amount: payment.amount.toString(),
      currency: payment.currency,
      zelleName: payment.zelleName,
      createdAt: payment.createdAt,
    };
  });
}
