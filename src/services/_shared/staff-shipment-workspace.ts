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

export function getStaffShipmentWorkspaceAction(
  status: ShipmentStatus,
  shipmentId: string,
): StaffShipmentWorkspaceAction {
  const shipmentPath = `/staff/shipments/${encodeURIComponent(shipmentId)}`;

  switch (status) {
    case ShipmentStatus.AWAITING_PACKAGE:
      return {
        title: "Réceptionner le colis",
        description:
          "La réception du colis sera disponible dans la prochaine étape opérationnelle.",
      };
    case ShipmentStatus.PACKAGE_RECEIVED_US:
      return {
        title: "Préparer la mise en devis",
        description:
          "Le colis a été reçu. Il doit maintenant être placé en attente de devis.",
      };
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
    case ShipmentStatus.PAYMENT_CONFIRMED:
      return {
        title: "Paiement confirmé",
        description: "L’envoi est prêt pour la prochaine étape de transport.",
      };
    case ShipmentStatus.IN_TRANSIT_TO_BF:
      return {
        title: "Transport en cours",
        description: "L’envoi est actuellement en transit vers le Burkina Faso.",
      };
    case ShipmentStatus.ARRIVED_BF:
      return {
        title: "Préparer le retrait",
        description:
          "L’envoi est arrivé au Burkina Faso et doit être préparé pour son retrait.",
      };
    case ShipmentStatus.READY_FOR_PICKUP:
      return {
        title: "Colis prêt pour le retrait",
        description:
          "Le destinataire peut être contacté pour retirer le colis sur place.",
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
  }
}
