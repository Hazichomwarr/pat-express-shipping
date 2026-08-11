import { ShipmentStatus, type ShipmentDirection } from "@prisma/client";

export type ShipmentQuoteState = "empty" | "partial" | "complete";

type ShipmentQuoteSnapshot = {
  measuredWeightKg: unknown | null;
  ratePerKg: unknown | null;
  quotedAmount: unknown | null;
  quoteCurrency: unknown | null;
  quotedAt: unknown | null;
};

export type StaffShipmentWorkspaceAction = {
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
};

export type StaffShipmentStatusActionPresentation = {
  toStatus: ShipmentStatus;
  label: string;
  description: string;
  requiresConfirmation?: boolean;
};

const awaitingPackageDescriptionsByDirection = {
  US_TO_BF: "Confirme que le colis a été physiquement reçu aux États-Unis.",
  BF_TO_US: "Confirme que le colis a été physiquement reçu au Burkina Faso.",
} satisfies Record<ShipmentDirection, string>;

const paymentConfirmedPresentationByDirection = {
  US_TO_BF: {
    label: "Marquer en transit vers le Burkina Faso",
    description:
      "Confirme que l’envoi a quitté l’étape de paiement et est maintenant en transit vers le Burkina Faso.",
  },
  BF_TO_US: {
    label: "Marquer en transit vers les États-Unis",
    description:
      "Confirme que l’envoi a quitté l’étape de paiement et est maintenant en transit vers les États-Unis.",
  },
} satisfies Record<ShipmentDirection, { label: string; description: string }>;

const inTransitPresentationByDirection = {
  US_TO_BF: {
    label: "Marquer arrivé au Burkina Faso",
    description: "Confirme l’arrivée physique de l’envoi au Burkina Faso.",
  },
  BF_TO_US: {
    label: "Marquer arrivé aux États-Unis",
    description: "Confirme l’arrivée physique de l’envoi aux États-Unis.",
  },
} satisfies Record<ShipmentDirection, { label: string; description: string }>;

export function getShipmentQuoteState(
  quote: ShipmentQuoteSnapshot,
): ShipmentQuoteState {
  const values = [
    quote.measuredWeightKg,
    quote.ratePerKg,
    quote.quotedAmount,
    quote.quoteCurrency,
    quote.quotedAt,
  ];

  if (values.every((value) => value === null)) return "empty";
  if (values.every((value) => value !== null)) return "complete";
  return "partial";
}

export function getStaffShipmentStatusActionPresentation(
  status: ShipmentStatus,
  direction: ShipmentDirection,
): StaffShipmentStatusActionPresentation | null {
  switch (status) {
    case ShipmentStatus.AWAITING_PACKAGE:
      return {
        toStatus: ShipmentStatus.PACKAGE_RECEIVED,
        label: "Réceptionner le colis",
        description: awaitingPackageDescriptionsByDirection[direction],
      };
    case ShipmentStatus.PACKAGE_RECEIVED:
      return {
        toStatus: ShipmentStatus.AWAITING_QUOTE,
        label: "Mettre en attente de devis",
        description: "Le colis reçu est prêt à être pesé et facturé.",
      };
    case ShipmentStatus.PAYMENT_CONFIRMED:
      return {
        toStatus: ShipmentStatus.IN_TRANSIT,
        ...paymentConfirmedPresentationByDirection[direction],
      };
    case ShipmentStatus.IN_TRANSIT:
      return {
        toStatus: ShipmentStatus.ARRIVED_DESTINATION,
        ...inTransitPresentationByDirection[direction],
      };
    case ShipmentStatus.ARRIVED_DESTINATION:
      return {
        toStatus: ShipmentStatus.READY_FOR_PICKUP,
        label: "Marquer prêt pour le retrait",
        description:
          "Confirme que l’envoi peut maintenant être retiré par le destinataire.",
      };
    case ShipmentStatus.READY_FOR_PICKUP:
      return {
        toStatus: ShipmentStatus.DELIVERED,
        label: "Marquer comme livré",
        description: "Confirme que l’envoi a été remis au destinataire.",
        requiresConfirmation: true,
      };
    default:
      return null;
  }
}

export function getStaffShipmentWorkspaceAction(
  status: ShipmentStatus,
  direction: ShipmentDirection,
  shipmentId: string,
): StaffShipmentWorkspaceAction {
  const operationalAction = getStaffShipmentStatusActionPresentation(
    status,
    direction,
  );

  if (operationalAction) {
    return {
      title: operationalAction.label,
      description: operationalAction.description,
    };
  }

  const shipmentPath = `/staff/shipments/${encodeURIComponent(shipmentId)}`;

  switch (status) {
    case ShipmentStatus.AWAITING_QUOTE:
      return {
        title: "Établir le devis",
        description:
          "Enregistrez le poids mesuré et les conditions commerciales officielles de cet envoi.",
        href: `${shipmentPath}/quote`,
        linkLabel: "Établir le devis",
      };
    case ShipmentStatus.AWAITING_PAYMENT:
      return {
        title: "Gérer le paiement",
        description:
          "Enregistrez le mode de paiement choisi et confirmez les fonds uniquement après leur réception.",
        href: `${shipmentPath}/payment`,
        linkLabel: "Gérer le paiement",
      };
    case ShipmentStatus.DELIVERED:
      return {
        title: "Envoi terminé",
        description: "Le colis a été remis au destinataire.",
      };
    case ShipmentStatus.CANCELLED:
      return {
        title: "Envoi annulé",
        description: "Aucune autre opération ne doit être effectuée sur cet envoi.",
      };
    default:
      throw new Error("Unsupported staff shipment workspace status.");
  }
}
