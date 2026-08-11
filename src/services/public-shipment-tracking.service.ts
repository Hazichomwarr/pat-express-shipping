import "server-only";

import { Prisma, ShipmentStatus } from "@prisma/client";

import { isShipmentTrackingNumber } from "./_shared/shipment-tracking-number";
import { isTerminalShipmentStatus } from "./_shared/shipment-status-transition";

const publicShipmentTrackingSelect = {
  trackingNumber: true,
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

const PUBLIC_SHIPMENT_STATUS_PRESENTATIONS: Record<
  ShipmentStatus,
  PublicShipmentStatusPresentation
> = {
  AWAITING_PACKAGE: {
    label: "En attente de réception du colis",
    description: "PatExpressShipping attend de recevoir votre colis.",
  },
  PACKAGE_RECEIVED: {
    label: "Colis reçu aux États-Unis",
    description: "Votre colis a bien été reçu aux États-Unis.",
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
  IN_TRANSIT: {
    label: "En transit vers le Burkina Faso",
    description: "Votre colis est en route vers le Burkina Faso.",
  },
  ARRIVED_DESTINATION: {
    label: "Arrivé au Burkina Faso",
    description: "Votre colis est arrivé au Burkina Faso.",
  },
  READY_FOR_PICKUP: {
    label: "Prêt pour le retrait",
    description: "Votre colis est prêt à être retiré.",
  },
  DELIVERED: {
    label: "Livré",
    description: "Votre colis a été remis au destinataire.",
  },
  CANCELLED: {
    label: "Annulé",
    description: "Cet envoi a été annulé.",
  },
};

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
      label: "Colis reçu aux États-Unis",
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
      label: "Arrivé au Burkina Faso",
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

  const presentation = PUBLIC_SHIPMENT_STATUS_PRESENTATIONS[shipment.status];

  return {
    trackingNumber: shipment.trackingNumber,
    status: shipment.status,
    statusLabel: presentation.label,
    statusDescription: presentation.description,
    isTerminal: isTerminalShipmentStatus(shipment.status),
    milestones: buildPublicMilestones(shipment),
  };
}
