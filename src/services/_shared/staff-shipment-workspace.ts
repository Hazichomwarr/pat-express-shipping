import { ShipmentStatus } from "@prisma/client";

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

const staffShipmentStatusActions: Readonly<
  Partial<Record<ShipmentStatus, StaffShipmentStatusActionPresentation>>
> = {
  [ShipmentStatus.AWAITING_PACKAGE]: {
    toStatus: ShipmentStatus.PACKAGE_RECEIVED,
    label: "Réceptionner le colis",
    description:
      "Confirme que le colis a été physiquement reçu aux États-Unis.",
  },
  [ShipmentStatus.PACKAGE_RECEIVED]: {
    toStatus: ShipmentStatus.AWAITING_QUOTE,
    label: "Mettre en attente de devis",
    description: "Le colis reçu est prêt à être pesé et facturé.",
  },
  [ShipmentStatus.PAYMENT_CONFIRMED]: {
    toStatus: ShipmentStatus.IN_TRANSIT,
    label: "Marquer en transit vers le Burkina Faso",
    description:
      "Confirme que l’envoi a quitté l’étape de paiement et est maintenant en transit.",
  },
  [ShipmentStatus.IN_TRANSIT]: {
    toStatus: ShipmentStatus.ARRIVED_DESTINATION,
    label: "Marquer arrivé au Burkina Faso",
    description:
      "Confirme l’arrivée physique de l’envoi au Burkina Faso.",
  },
  [ShipmentStatus.ARRIVED_DESTINATION]: {
    toStatus: ShipmentStatus.READY_FOR_PICKUP,
    label: "Marquer prêt pour le retrait",
    description:
      "Confirme que l’envoi peut maintenant être retiré par le destinataire.",
  },
  [ShipmentStatus.READY_FOR_PICKUP]: {
    toStatus: ShipmentStatus.DELIVERED,
    label: "Marquer comme livré",
    description: "Confirme que l’envoi a été remis au destinataire.",
    requiresConfirmation: true,
  },
};

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
): StaffShipmentStatusActionPresentation | null {
  return staffShipmentStatusActions[status] ?? null;
}

export function getStaffShipmentWorkspaceAction(
  status: ShipmentStatus,
  shipmentId: string,
): StaffShipmentWorkspaceAction {
  const operationalAction =
    getStaffShipmentStatusActionPresentation(status);

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
