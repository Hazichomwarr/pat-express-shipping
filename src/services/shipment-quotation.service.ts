import "server-only";

import {
  Prisma,
  ShipmentQuoteCurrency,
  ShipmentStatus,
} from "@prisma/client";

import { canQuoteShipmentStatus } from "./_shared/shipment-quotation";
import { canTransitionShipmentStatus } from "./_shared/shipment-status-transition";
import { shipmentQuotationInputSchema } from "../validations/shipment-quotation.schema";

const shipmentQuotationSelect = {
  id: true,
  trackingNumber: true,
  status: true,
  measuredWeightKg: true,
  ratePerKg: true,
  quotedAmount: true,
  quoteCurrency: true,
  quotedAt: true,
} satisfies Prisma.ShipmentSelect;

type ShipmentQuotationRecord = Prisma.ShipmentGetPayload<{
  select: typeof shipmentQuotationSelect;
}>;

type QuoteShipmentDependencies = {
  findShipment: (shipmentId: string) => Promise<ShipmentQuotationRecord | null>;
  updateShipmentQuote: (
    args: Prisma.ShipmentUpdateManyArgs,
  ) => Promise<Prisma.BatchPayload>;
  now: () => Date;
};

const defaultDependencies: QuoteShipmentDependencies = {
  findShipment: async (shipmentId) => {
    const { prisma } = await import("../lib/prisma");

    return prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: shipmentQuotationSelect,
    });
  },
  updateShipmentQuote: async (args) => {
    const { prisma } = await import("../lib/prisma");

    return prisma.shipment.updateMany(args);
  },
  now: () => new Date(),
};

export type QuoteShipmentResult = {
  id: string;
  trackingNumber: string;
  status: ShipmentStatus;
  measuredWeightKg: string;
  ratePerKg: string;
  quotedAmount: string;
  quoteCurrency: ShipmentQuoteCurrency;
  quotedAt: Date;
};

export class ShipmentNotFoundError extends Error {
  constructor() {
    super("Shipment not found.");
    this.name = "ShipmentNotFoundError";
  }
}

export class ShipmentQuotationNotAllowedError extends Error {
  constructor() {
    super("Shipment is not eligible for quotation.");
    this.name = "ShipmentQuotationNotAllowedError";
  }
}

export class ShipmentQuotationAlreadyExistsError extends Error {
  constructor() {
    super("Shipment quotation already exists.");
    this.name = "ShipmentQuotationAlreadyExistsError";
  }
}

export class ShipmentQuotationConflictError extends Error {
  constructor() {
    super("Shipment quotation could not be recorded because the shipment changed.");
    this.name = "ShipmentQuotationConflictError";
  }
}

function hasExistingQuotation(shipment: ShipmentQuotationRecord): boolean {
  return [
    shipment.measuredWeightKg,
    shipment.ratePerKg,
    shipment.quotedAmount,
    shipment.quoteCurrency,
    shipment.quotedAt,
  ].some((value) => value !== null);
}

export async function quoteShipment(
  shipmentId: string,
  input: unknown,
  dependencies: QuoteShipmentDependencies = defaultDependencies,
): Promise<QuoteShipmentResult> {
  const validatedInput = shipmentQuotationInputSchema.parse(input);
  const shipment = await dependencies.findShipment(shipmentId);

  if (!shipment) {
    throw new ShipmentNotFoundError();
  }

  if (
    !canQuoteShipmentStatus(shipment.status) ||
    !canTransitionShipmentStatus(
      shipment.status,
      ShipmentStatus.AWAITING_PAYMENT,
    )
  ) {
    throw new ShipmentQuotationNotAllowedError();
  }

  if (hasExistingQuotation(shipment)) {
    throw new ShipmentQuotationAlreadyExistsError();
  }

  const measuredWeightKg = new Prisma.Decimal(
    validatedInput.measuredWeightKg.toString(),
  );
  const ratePerKg = new Prisma.Decimal(validatedInput.ratePerKg.toString());
  const quotedAmount = new Prisma.Decimal(
    validatedInput.quotedAmount.toString(),
  );
  const quotedAt = dependencies.now();

  const updateResult = await dependencies.updateShipmentQuote({
    where: {
      id: shipment.id,
      status: ShipmentStatus.AWAITING_QUOTE,
    },
    data: {
      measuredWeightKg,
      ratePerKg,
      quotedAmount,
      quoteCurrency: validatedInput.quoteCurrency,
      quotedAt,
      status: ShipmentStatus.AWAITING_PAYMENT,
    },
  });

  if (updateResult.count !== 1) {
    throw new ShipmentQuotationConflictError();
  }

  return {
    id: shipment.id,
    trackingNumber: shipment.trackingNumber,
    status: ShipmentStatus.AWAITING_PAYMENT,
    measuredWeightKg: measuredWeightKg.toString(),
    ratePerKg: ratePerKg.toString(),
    quotedAmount: quotedAmount.toString(),
    quoteCurrency: validatedInput.quoteCurrency,
    quotedAt,
  };
}
