import type { ShipmentDirection } from "@prisma/client";

const shipmentDirectionLabels = {
  US_TO_BF: "États-Unis → Burkina Faso",
  BF_TO_US: "Burkina Faso → États-Unis",
} satisfies Record<ShipmentDirection, string>;

const shipmentDirectionOriginLabels = {
  US_TO_BF: "États-Unis",
  BF_TO_US: "Burkina Faso",
} satisfies Record<ShipmentDirection, string>;

const shipmentDirectionDestinationLabels = {
  US_TO_BF: "Burkina Faso",
  BF_TO_US: "États-Unis",
} satisfies Record<ShipmentDirection, string>;

export function getShipmentDirectionLabel(direction: ShipmentDirection): string {
  return shipmentDirectionLabels[direction];
}

export function getShipmentDirectionOriginLabel(
  direction: ShipmentDirection,
): string {
  return shipmentDirectionOriginLabels[direction];
}

export function getShipmentDirectionDestinationLabel(
  direction: ShipmentDirection,
): string {
  return shipmentDirectionDestinationLabels[direction];
}
