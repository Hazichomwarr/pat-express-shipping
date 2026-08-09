import "server-only";

import { Prisma, ShipmentStatus } from "@prisma/client";

import { canStaffAdvanceShipment } from "./_shared/shipment-staff-transition";
import { canTransitionShipmentStatus } from "./_shared/shipment-status-transition";

const shipmentStatusSelect = {
  id: true,
  trackingNumber: true,
  status: true,
  packageReceivedAt: true,
  paymentConfirmedAt: true,
  arrivedBfAt: true,
  readyForPickupAt: true,
  deliveredAt: true,
  cancelledAt: true,
} satisfies Prisma.ShipmentSelect;

type ShipmentStatusRecord = Prisma.ShipmentGetPayload<{
  select: typeof shipmentStatusSelect;
}>;

type AdvanceShipmentStatusDependencies = {
  findShipment: (shipmentId: string) => Promise<ShipmentStatusRecord | null>;
  conditionallyUpdateShipment: (
    args: Prisma.ShipmentUpdateManyArgs,
  ) => Promise<Prisma.BatchPayload>;
  now: () => Date;
};

const defaultDependencies: AdvanceShipmentStatusDependencies = {
  findShipment: async (shipmentId) => {
    const { prisma } = await import("../lib/prisma");

    return prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: shipmentStatusSelect,
    });
  },
  conditionallyUpdateShipment: async (args) => {
    const { prisma } = await import("../lib/prisma");

    return prisma.shipment.updateMany(args);
  },
  now: () => new Date(),
};

export type AdvanceShipmentStatusResult = {
  id: string;
  trackingNumber: string;
  previousStatus: ShipmentStatus;
  status: ShipmentStatus;
  milestoneAt: Date | null;
};

export class ShipmentNotFoundError extends Error {
  constructor() {
    super("Shipment not found.");
    this.name = "ShipmentNotFoundError";
  }
}

export class ShipmentStatusTransitionNotAllowedError extends Error {
  constructor() {
    super("Shipment status transition is not allowed for staff advancement.");
    this.name = "ShipmentStatusTransitionNotAllowedError";
  }
}

export class ShipmentStatusStateInconsistentError extends Error {
  constructor() {
    super("Shipment lifecycle state is historically inconsistent.");
    this.name = "ShipmentStatusStateInconsistentError";
  }
}

export class ShipmentStatusTransitionConflictError extends Error {
  constructor() {
    super("Shipment status transition conflicted with a newer state.");
    this.name = "ShipmentStatusTransitionConflictError";
  }
}

type TransitionPlan = {
  where: Prisma.ShipmentWhereInput;
  data: Prisma.ShipmentUpdateManyMutationInput;
  milestoneAt: Date | null;
};

function requireConsistentHistoricalState(
  shipment: ShipmentStatusRecord,
  toStatus: ShipmentStatus,
): void {
  if (shipment.cancelledAt !== null) {
    throw new ShipmentStatusStateInconsistentError();
  }

  switch (toStatus) {
    case ShipmentStatus.PACKAGE_RECEIVED_US:
      if (shipment.packageReceivedAt !== null) {
        throw new ShipmentStatusStateInconsistentError();
      }
      break;
    case ShipmentStatus.AWAITING_QUOTE:
      if (shipment.packageReceivedAt === null) {
        throw new ShipmentStatusStateInconsistentError();
      }
      break;
    case ShipmentStatus.IN_TRANSIT_TO_BF:
      if (shipment.paymentConfirmedAt === null) {
        throw new ShipmentStatusStateInconsistentError();
      }
      break;
    case ShipmentStatus.ARRIVED_BF:
      if (shipment.arrivedBfAt !== null) {
        throw new ShipmentStatusStateInconsistentError();
      }
      break;
    case ShipmentStatus.READY_FOR_PICKUP:
      if (
        shipment.arrivedBfAt === null ||
        shipment.readyForPickupAt !== null
      ) {
        throw new ShipmentStatusStateInconsistentError();
      }
      break;
    case ShipmentStatus.DELIVERED:
      if (
        shipment.readyForPickupAt === null ||
        shipment.deliveredAt !== null
      ) {
        throw new ShipmentStatusStateInconsistentError();
      }
      break;
    default:
      throw new ShipmentStatusTransitionNotAllowedError();
  }
}

function createTransitionPlan(
  shipment: ShipmentStatusRecord,
  toStatus: ShipmentStatus,
  now: () => Date,
): TransitionPlan {
  const baseWhere: Prisma.ShipmentWhereInput = {
    id: shipment.id,
    status: shipment.status,
    cancelledAt: null,
  };

  switch (toStatus) {
    case ShipmentStatus.PACKAGE_RECEIVED_US: {
      const milestoneAt = now();
      return {
        where: { ...baseWhere, packageReceivedAt: null },
        data: { status: toStatus, packageReceivedAt: milestoneAt },
        milestoneAt,
      };
    }
    case ShipmentStatus.AWAITING_QUOTE:
      return {
        where: { ...baseWhere, packageReceivedAt: { not: null } },
        data: { status: toStatus },
        milestoneAt: null,
      };
    case ShipmentStatus.IN_TRANSIT_TO_BF:
      return {
        where: { ...baseWhere, paymentConfirmedAt: { not: null } },
        data: { status: toStatus },
        milestoneAt: null,
      };
    case ShipmentStatus.ARRIVED_BF: {
      const milestoneAt = now();
      return {
        where: { ...baseWhere, arrivedBfAt: null },
        data: { status: toStatus, arrivedBfAt: milestoneAt },
        milestoneAt,
      };
    }
    case ShipmentStatus.READY_FOR_PICKUP: {
      const milestoneAt = now();
      return {
        where: {
          ...baseWhere,
          arrivedBfAt: { not: null },
          readyForPickupAt: null,
        },
        data: { status: toStatus, readyForPickupAt: milestoneAt },
        milestoneAt,
      };
    }
    case ShipmentStatus.DELIVERED: {
      const milestoneAt = now();
      return {
        where: {
          ...baseWhere,
          readyForPickupAt: { not: null },
          deliveredAt: null,
        },
        data: { status: toStatus, deliveredAt: milestoneAt },
        milestoneAt,
      };
    }
    default:
      throw new ShipmentStatusTransitionNotAllowedError();
  }
}

export async function advanceShipmentStatus(
  shipmentId: string,
  toStatus: ShipmentStatus,
  dependencies: AdvanceShipmentStatusDependencies = defaultDependencies,
): Promise<AdvanceShipmentStatusResult> {
  const shipment = await dependencies.findShipment(shipmentId);

  if (!shipment) {
    throw new ShipmentNotFoundError();
  }

  if (
    !canStaffAdvanceShipment(shipment.status, toStatus) ||
    !canTransitionShipmentStatus(shipment.status, toStatus)
  ) {
    throw new ShipmentStatusTransitionNotAllowedError();
  }

  requireConsistentHistoricalState(shipment, toStatus);
  const plan = createTransitionPlan(shipment, toStatus, dependencies.now);
  const updateResult = await dependencies.conditionallyUpdateShipment({
    where: plan.where,
    data: plan.data,
  });

  if (updateResult.count !== 1) {
    throw new ShipmentStatusTransitionConflictError();
  }

  return {
    id: shipment.id,
    trackingNumber: shipment.trackingNumber,
    previousStatus: shipment.status,
    status: toStatus,
    milestoneAt: plan.milestoneAt,
  };
}
