import type {
  ShipmentDirection,
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

// PACKAGE_RECEIVED, IN_TRANSIT, and ARRIVED_DESTINATION describe a physical
// event at a country that depends on ShipmentDirection, so they are excluded
// here and resolved separately in getStaffShipmentStatusLabel.
type DirectionNeutralShipmentStatus = Exclude<
  ShipmentStatus,
  "PACKAGE_RECEIVED" | "IN_TRANSIT" | "ARRIVED_DESTINATION"
>;

const directionNeutralStatusLabels: Record<
  DirectionNeutralShipmentStatus,
  string
> = {
  AWAITING_PACKAGE: "En attente du colis",
  AWAITING_QUOTE: "En attente de devis",
  AWAITING_PAYMENT: "En attente de paiement",
  PAYMENT_CONFIRMED: "Paiement confirmé",
  READY_FOR_PICKUP: "Prêt pour le retrait",
  DELIVERED: "Livré",
  CANCELLED: "Annulé",
};

// Used only where no single shipment (and therefore no direction) is in
// context, such as the staff status filter dropdown.
const genericDirectionDependentStatusLabels: Record<
  "PACKAGE_RECEIVED" | "IN_TRANSIT" | "ARRIVED_DESTINATION",
  string
> = {
  PACKAGE_RECEIVED: "Colis reçu",
  IN_TRANSIT: "En transit",
  ARRIVED_DESTINATION: "Arrivé à destination",
};

const packageReceivedLabelsByDirection = {
  US_TO_BF: "Colis reçu aux États-Unis",
  BF_TO_US: "Colis reçu au Burkina Faso",
} satisfies Record<ShipmentDirection, string>;

const inTransitLabelsByDirection = {
  US_TO_BF: "En transit vers le Burkina Faso",
  BF_TO_US: "En transit vers les États-Unis",
} satisfies Record<ShipmentDirection, string>;

const arrivedDestinationLabelsByDirection = {
  US_TO_BF: "Arrivé au Burkina Faso",
  BF_TO_US: "Arrivé aux États-Unis",
} satisfies Record<ShipmentDirection, string>;

const shipmentIntakeMethodLabels: Record<ShipmentIntakeMethod, string> = {
  DROP_OFF: "Dépôt sur place",
  MAIL_IN: "Envoi par courrier",
};

const shipmentPaymentMethodLabels: Record<ShipmentPaymentMethod, string> = {
  ZELLE: "Zelle",
  CASH: "Espèces",
  ORANGE_MONEY: "Orange Money",
};

const shipmentPaymentStatusLabels: Record<ShipmentPaymentStatus, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmé",
  CANCELLED: "Annulé",
};

export function getStaffShipmentStatusLabel(
  status: ShipmentStatus,
  direction: ShipmentDirection,
): string {
  switch (status) {
    case "PACKAGE_RECEIVED":
      return packageReceivedLabelsByDirection[direction];
    case "IN_TRANSIT":
      return inTransitLabelsByDirection[direction];
    case "ARRIVED_DESTINATION":
      return arrivedDestinationLabelsByDirection[direction];
    default:
      return directionNeutralStatusLabels[status];
  }
}

export function getGenericShipmentStatusLabel(status: ShipmentStatus): string {
  switch (status) {
    case "PACKAGE_RECEIVED":
    case "IN_TRANSIT":
    case "ARRIVED_DESTINATION":
      return genericDirectionDependentStatusLabels[status];
    default:
      return directionNeutralStatusLabels[status];
  }
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
