import "server-only";

import { Prisma, ShipmentDirection, ShipmentStatus } from "@prisma/client";

import { isShipmentTrackingNumber } from "./_shared/shipment-tracking-number";
import { isTerminalShipmentStatus } from "./_shared/shipment-status-transition";
import { getShipmentDirectionLabel } from "./_shared/shipment-direction-presentation";

const publicShipmentTrackingSelect = {
  trackingNumber: true,
  direction: true,
  status: true,
  createdAt: true,
  packageReceivedAt: true,
  quotedAt: true,
  paymentConfirmedAt: true,
  arrivedDestinationAt: true,
  readyForPickupAt: true,
  deliveredAt: true,
  cancelledAt: true,
} satisfies Prisma.ShipmentSelect;

type PublicShipmentTrackingRecord = Prisma.ShipmentGetPayload<{
  select: typeof publicShipmentTrackingSelect;
}>;

type PublicShipmentTrackingLookup = {
  where: {
    trackingNumber: string;
  };
  select: typeof publicShipmentTrackingSelect;
};

type PublicShipmentTrackingDependencies = {
  findShipmentByTrackingNumber: (
    lookup: PublicShipmentTrackingLookup,
  ) => Promise<PublicShipmentTrackingRecord | null>;
};

type PublicShipmentStatusPresentation = {
  label: string;
  description: string;
};

// PACKAGE_RECEIVED, IN_TRANSIT, ARRIVED_DESTINATION, READY_FOR_PICKUP, and
// DELIVERED describe a physical event whose geography depends on
// ShipmentDirection, so they are resolved separately below instead of living
// in this direction-neutral map.
type DirectionNeutralPublicStatus = Exclude<
  ShipmentStatus,
  | "PACKAGE_RECEIVED"
  | "IN_TRANSIT"
  | "ARRIVED_DESTINATION"
  | "READY_FOR_PICKUP"
  | "DELIVERED"
>;

const directionNeutralPublicPresentations: Record<
  DirectionNeutralPublicStatus,
  PublicShipmentStatusPresentation
> = {
  AWAITING_PACKAGE: {
    label: "En attente de réception du colis",
    description: "PatExpressShipping attend de recevoir votre colis.",
  },
  AWAITING_QUOTE: {
    label: "Préparation du devis",
    description:
      "Votre colis est en cours de pesée et de préparation du devis.",
  },
  AWAITING_PAYMENT: {
    label: "En attente de paiement",
    description: "Le devis a été établi et l’envoi est en attente de paiement.",
  },
  PAYMENT_CONFIRMED: {
    label: "Paiement confirmé",
    description:
      "Le paiement a été confirmé. L’envoi peut poursuivre son traitement.",
  },
  CANCELLED: {
    label: "Annulé",
    description: "Cet envoi a été annulé.",
  },
};

const packageReceivedPresentationsByDirection = {
  US_TO_BF: {
    label: "Colis reçu aux États-Unis",
    description: "Votre colis a bien été reçu aux États-Unis.",
  },
  BF_TO_US: {
    label: "Colis reçu au Burkina Faso",
    description: "Votre colis a bien été reçu au Burkina Faso.",
  },
} satisfies Record<ShipmentDirection, PublicShipmentStatusPresentation>;

const inTransitPresentationsByDirection = {
  US_TO_BF: {
    label: "En transit vers le Burkina Faso",
    description: "Votre colis est en route vers le Burkina Faso.",
  },
  BF_TO_US: {
    label: "En transit vers les États-Unis",
    description: "Votre colis est en route vers les États-Unis.",
  },
} satisfies Record<ShipmentDirection, PublicShipmentStatusPresentation>;

const arrivedDestinationPresentationsByDirection = {
  US_TO_BF: {
    label: "Arrivé au Burkina Faso",
    description: "Votre colis est arrivé au Burkina Faso.",
  },
  BF_TO_US: {
    label: "Arrivé aux États-Unis",
    description: "Votre colis est arrivé aux États-Unis.",
  },
} satisfies Record<ShipmentDirection, PublicShipmentStatusPresentation>;

const readyForPickupPresentationsByDirection = {
  US_TO_BF: {
    label: "Prêt pour le retrait",
    description: "Votre colis est prêt à être retiré au Burkina Faso.",
  },
  BF_TO_US: {
    label: "Prêt pour le retrait",
    description: "Votre colis est prêt à être retiré aux États-Unis.",
  },
} satisfies Record<ShipmentDirection, PublicShipmentStatusPresentation>;

const deliveredPresentationsByDirection = {
  US_TO_BF: {
    label: "Livré",
    description: "Votre colis a été remis au Burkina Faso.",
  },
  BF_TO_US: {
    label: "Livré",
    description: "Votre colis a été remis aux États-Unis.",
  },
} satisfies Record<ShipmentDirection, PublicShipmentStatusPresentation>;

function getPublicShipmentStatusPresentation(
  status: ShipmentStatus,
  direction: ShipmentDirection,
): PublicShipmentStatusPresentation {
  switch (status) {
    case "PACKAGE_RECEIVED":
      return packageReceivedPresentationsByDirection[direction];
    case "IN_TRANSIT":
      return inTransitPresentationsByDirection[direction];
    case "ARRIVED_DESTINATION":
      return arrivedDestinationPresentationsByDirection[direction];
    case "READY_FOR_PICKUP":
      return readyForPickupPresentationsByDirection[direction];
    case "DELIVERED":
      return deliveredPresentationsByDirection[direction];
    default:
      return directionNeutralPublicPresentations[status];
  }
}

export type PublicShipmentTrackingMilestone = {
  key:
    | "created"
    | "package_received"
    | "quoted"
    | "payment_confirmed"
    | "arrived_destination"
    | "ready_for_pickup"
    | "delivered"
    | "cancelled";
  label: string;
  occurredAt: Date;
};

export type PublicShipmentTrackingResult = {
  trackingNumber: string;
  direction: ShipmentDirection;
  directionLabel: string;
  status: ShipmentStatus;
  statusLabel: string;
  statusDescription: string;
  isTerminal: boolean;
  milestones: PublicShipmentTrackingMilestone[];
};

export class InvalidShipmentTrackingNumberError extends Error {
  constructor() {
    super("Invalid shipment tracking number.");
    this.name = "InvalidShipmentTrackingNumberError";
  }
}

export class PublicShipmentNotFoundError extends Error {
  constructor() {
    super("Public shipment not found.");
    this.name = "PublicShipmentNotFoundError";
  }
}

const defaultDependencies: PublicShipmentTrackingDependencies = {
  findShipmentByTrackingNumber: async (lookup) => {
    const { prisma } = await import("../lib/prisma");

    return prisma.shipment.findUnique(lookup);
  },
};

function normalizeTrackingNumber(trackingNumber: unknown): string {
  if (typeof trackingNumber !== "string") {
    throw new InvalidShipmentTrackingNumberError();
  }

  const normalizedTrackingNumber = trackingNumber.trim();

  if (!isShipmentTrackingNumber(normalizedTrackingNumber)) {
    throw new InvalidShipmentTrackingNumberError();
  }

  return normalizedTrackingNumber;
}

function buildPublicMilestones(
  shipment: PublicShipmentTrackingRecord,
): PublicShipmentTrackingMilestone[] {
  const persistedMilestones = [
    {
      key: "created" as const,
      label: "Demande créée",
      occurredAt: shipment.createdAt,
    },
    {
      key: "package_received" as const,
      label: getPublicShipmentStatusPresentation(
        "PACKAGE_RECEIVED",
        shipment.direction,
      ).label,
      occurredAt: shipment.packageReceivedAt,
    },
    {
      key: "quoted" as const,
      label: "Devis établi",
      occurredAt: shipment.quotedAt,
    },
    {
      key: "payment_confirmed" as const,
      label: "Paiement confirmé",
      occurredAt: shipment.paymentConfirmedAt,
    },
    {
      key: "arrived_destination" as const,
      label: getPublicShipmentStatusPresentation(
        "ARRIVED_DESTINATION",
        shipment.direction,
      ).label,
      occurredAt: shipment.arrivedDestinationAt,
    },
    {
      key: "ready_for_pickup" as const,
      label: "Prêt pour le retrait",
      occurredAt: shipment.readyForPickupAt,
    },
    {
      key: "delivered" as const,
      label: "Livré",
      occurredAt: shipment.deliveredAt,
    },
    {
      key: "cancelled" as const,
      label: "Envoi annulé",
      occurredAt: shipment.cancelledAt,
    },
  ];

  // Keep persisted facts in business order; do not infer or repair missing events.
  return persistedMilestones.filter(
    (milestone): milestone is PublicShipmentTrackingMilestone =>
      milestone.occurredAt !== null,
  );
}

export async function getPublicShipmentTracking(
  trackingNumber: unknown,
  dependencies: PublicShipmentTrackingDependencies = defaultDependencies,
): Promise<PublicShipmentTrackingResult> {
  const normalizedTrackingNumber = normalizeTrackingNumber(trackingNumber);
  const shipment = await dependencies.findShipmentByTrackingNumber({
    where: {
      trackingNumber: normalizedTrackingNumber,
    },
    select: publicShipmentTrackingSelect,
  });

  if (!shipment) {
    throw new PublicShipmentNotFoundError();
  }

  const presentation = getPublicShipmentStatusPresentation(
    shipment.status,
    shipment.direction,
  );

  return {
    trackingNumber: shipment.trackingNumber,
    direction: shipment.direction,
    directionLabel: getShipmentDirectionLabel(shipment.direction),
    status: shipment.status,
    statusLabel: presentation.label,
    statusDescription: presentation.description,
    isTerminal: isTerminalShipmentStatus(shipment.status),
    milestones: buildPublicMilestones(shipment),
  };
}
