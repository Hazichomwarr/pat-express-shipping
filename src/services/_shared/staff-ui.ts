import type {
  ShipmentItemCategory,
  ShipmentIntakeMethod,
  ShipmentPaymentMethod,
  ShipmentPaymentStatus,
  ShipmentStatus,
} from "@prisma/client";

const shipmentItemCategoryLabels: Record<ShipmentItemCategory, string> = {
  GENERAL: "Général",
  CLOTHING: "Vêtements",
  ELECTRONICS: "Électronique",
  DOCUMENTS: "Documents",
  FOOD: "Produits alimentaires",
  HOUSEHOLD: "Articles ménagers",
  COMMERCIAL_GOODS: "Marchandises commerciales",
  OTHER: "Autre",
};

const shipmentStatusLabels: Record<ShipmentStatus, string> = {
  AWAITING_PACKAGE: "En attente du colis",
  PACKAGE_RECEIVED_US: "Colis reçu aux États-Unis",
  AWAITING_QUOTE: "En attente de devis",
  AWAITING_PAYMENT: "En attente de paiement",
  PAYMENT_CONFIRMED: "Paiement confirmé",
  IN_TRANSIT_TO_BF: "En transit vers le Burkina Faso",
  ARRIVED_BF: "Arrivé au Burkina Faso",
  READY_FOR_PICKUP: "Prêt pour le retrait",
  DELIVERED: "Livré",
  CANCELLED: "Annulé",
};

const shipmentIntakeMethodLabels: Record<ShipmentIntakeMethod, string> = {
  DROP_OFF: "Dépôt sur place",
  MAIL_IN: "Envoi par courrier",
};

const shipmentPaymentMethodLabels: Record<ShipmentPaymentMethod, string> = {
  ZELLE: "Zelle",
  CASH: "Espèces",
};

const shipmentPaymentStatusLabels: Record<ShipmentPaymentStatus, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmé",
  CANCELLED: "Annulé",
};

export function getShipmentStatusLabel(status: ShipmentStatus): string {
  return shipmentStatusLabels[status];
}

export function getShipmentItemCategoryLabel(
  category: ShipmentItemCategory,
): string {
  return shipmentItemCategoryLabels[category];
}

export function getShipmentIntakeMethodLabel(
  intakeMethod: ShipmentIntakeMethod,
): string {
  return shipmentIntakeMethodLabels[intakeMethod];
}

export function getShipmentPaymentMethodLabel(
  method: ShipmentPaymentMethod,
): string {
  return shipmentPaymentMethodLabels[method];
}

export function getShipmentPaymentStatusLabel(
  status: ShipmentPaymentStatus,
): string {
  return shipmentPaymentStatusLabels[status];
}

export function getSafeStaffCallbackUrl(value: unknown): string {
  if (
    typeof value !== "string" ||
    (value !== "/staff" && !value.startsWith("/staff/")) ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/";
  }

  try {
    const url = new URL(value, "https://patexpressshipping.local");

    if (
      url.origin !== "https://patexpressshipping.local" ||
      (url.pathname !== "/staff" && !url.pathname.startsWith("/staff/")) ||
      url.pathname === "/staff/login"
    ) {
      return "/";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
