import { ShipmentStatus } from "@prisma/client";

const ALLOWED_SHIPMENT_STATUS_TRANSITIONS: Readonly<
  Record<ShipmentStatus, readonly ShipmentStatus[]>
> = {
  [ShipmentStatus.AWAITING_PACKAGE]: [
    ShipmentStatus.PACKAGE_RECEIVED_US,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.PACKAGE_RECEIVED_US]: [
    ShipmentStatus.AWAITING_QUOTE,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.AWAITING_QUOTE]: [
    ShipmentStatus.AWAITING_PAYMENT,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.AWAITING_PAYMENT]: [
    ShipmentStatus.PAYMENT_CONFIRMED,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.PAYMENT_CONFIRMED]: [ShipmentStatus.IN_TRANSIT_TO_BF],
  [ShipmentStatus.IN_TRANSIT_TO_BF]: [ShipmentStatus.ARRIVED_BF],
  [ShipmentStatus.ARRIVED_BF]: [ShipmentStatus.READY_FOR_PICKUP],
  [ShipmentStatus.READY_FOR_PICKUP]: [ShipmentStatus.DELIVERED],
  [ShipmentStatus.DELIVERED]: [],
  [ShipmentStatus.CANCELLED]: [],
};

const TERMINAL_SHIPMENT_STATUSES = new Set<ShipmentStatus>([
  ShipmentStatus.DELIVERED,
  ShipmentStatus.CANCELLED,
]);

export function canTransitionShipmentStatus(
  from: ShipmentStatus,
  to: ShipmentStatus,
) {
  return ALLOWED_SHIPMENT_STATUS_TRANSITIONS[from].includes(to);
}

export function getAllowedShipmentStatusTransitions(
  status: ShipmentStatus,
): readonly ShipmentStatus[] {
  return [...ALLOWED_SHIPMENT_STATUS_TRANSITIONS[status]];
}

export function isTerminalShipmentStatus(status: ShipmentStatus) {
  return TERMINAL_SHIPMENT_STATUSES.has(status);
}
