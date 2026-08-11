import "server-only";

import { Prisma, type ShipmentStatus } from "@prisma/client";

import { generateShipmentTrackingNumber } from "./_shared/shipment-tracking-number";
import { createShipmentRequestInputSchema } from "../validations/shipment-request.schema";

const MAX_TRACKING_NUMBER_ATTEMPTS = 5;
const TRACKING_NUMBER_FIELD = "trackingNumber";
const TRACKING_NUMBER_CONSTRAINT = "Shipment_trackingNumber_key";

export type CreateGuestShipmentRequestResult = {
  id: string;
  trackingNumber: string;
  status: ShipmentStatus;
  createdAt: Date;
};

type CreateShipment = (
  args: Prisma.ShipmentCreateArgs,
) => Promise<CreateGuestShipmentRequestResult>;

type CreateGuestShipmentRequestDependencies = {
  createShipment: CreateShipment;
  generateTrackingNumber: () => string;
};

const defaultDependencies: CreateGuestShipmentRequestDependencies = {
  createShipment: async (args) => {
    const { prisma } = await import("../lib/prisma");

    return prisma.shipment.create(args);
  },
  generateTrackingNumber: generateShipmentTrackingNumber,
};

export class ShipmentTrackingNumberGenerationError extends Error {
  constructor() {
    super("Unable to generate a unique shipment tracking number.");
    this.name = "ShipmentTrackingNumberGenerationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTrackingNumberTarget(target: unknown): boolean {
  if (target === TRACKING_NUMBER_FIELD || target === TRACKING_NUMBER_CONSTRAINT) {
    return true;
  }

  return (
    Array.isArray(target) &&
    target.length === 1 &&
    (target[0] === TRACKING_NUMBER_FIELD ||
      target[0] === TRACKING_NUMBER_CONSTRAINT)
  );
}

function hasTrackingNumberConstraint(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  if (
    isTrackingNumberTarget(value.target) ||
    isTrackingNumberTarget(value.constraint) ||
    isTrackingNumberTarget(value.constraintName) ||
    isTrackingNumberTarget(value.index)
  ) {
    return true;
  }

  if (isRecord(value.constraint)) {
    const constraint = value.constraint;

    if (
      isTrackingNumberTarget(constraint.fields) ||
      isTrackingNumberTarget(constraint.name) ||
      isTrackingNumberTarget(constraint.index)
    ) {
      return true;
    }
  }

  return false;
}

function isTrackingNumberUniqueConflict(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002" ||
    !error.meta
  ) {
    return false;
  }

  if (hasTrackingNumberConstraint(error.meta)) {
    return true;
  }

  const driverAdapterError = error.meta.driverAdapterError;

  return (
    isRecord(driverAdapterError) &&
    hasTrackingNumberConstraint(driverAdapterError.cause)
  );
}

export async function createGuestShipmentRequest(
  input: unknown,
  dependencies: CreateGuestShipmentRequestDependencies = defaultDependencies,
): Promise<CreateGuestShipmentRequestResult> {
  const validatedInput = createShipmentRequestInputSchema.parse(input);

  for (let attempt = 0; attempt < MAX_TRACKING_NUMBER_ATTEMPTS; attempt += 1) {
    const trackingNumber = dependencies.generateTrackingNumber();

    try {
      const shipment = await dependencies.createShipment({
        data: {
          trackingNumber,
          direction: validatedInput.direction,
          intakeMethod: validatedInput.intakeMethod,
          senderName: validatedInput.senderName,
          senderPhone: validatedInput.senderPhone,
          senderEmail: validatedInput.senderEmail,
          recipientName: validatedInput.recipientName,
          recipientPhone: validatedInput.recipientPhone,
          recipientEmail: validatedInput.recipientEmail,
          recipientCity: validatedInput.recipientCity,
          recipientNotes: validatedInput.recipientNotes,
          customerNotes: validatedInput.customerNotes,
          items: {
            create: validatedInput.items.map((item) => ({
              description: item.description,
              category: item.category,
              quantity: item.quantity,
              declaredValue:
                item.declaredValue === undefined
                  ? undefined
                  : new Prisma.Decimal(item.declaredValue.toString()),
            })),
          },
        },
        select: {
          id: true,
          trackingNumber: true,
          status: true,
          createdAt: true,
        },
      });

      return {
        id: shipment.id,
        trackingNumber: shipment.trackingNumber,
        status: shipment.status,
        createdAt: shipment.createdAt,
      };
    } catch (error) {
      if (!isTrackingNumberUniqueConflict(error)) {
        throw error;
      }
    }
  }

  throw new ShipmentTrackingNumberGenerationError();
}
