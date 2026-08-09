import { ShipmentStatus } from "@prisma/client";

import { canTransitionShipmentStatus } from "./shipment-status-transition";

const STAFF_SHIPMENT_TRANSITIONS: Readonly<
  Partial<Record<ShipmentStatus, ShipmentStatus>>
> = {
  [ShipmentStatus.AWAITING_PACKAGE]: ShipmentStatus.PACKAGE_RECEIVED_US,
  [ShipmentStatus.PACKAGE_RECEIVED_US]: ShipmentStatus.AWAITING_QUOTE,
  [ShipmentStatus.PAYMENT_CONFIRMED]: ShipmentStatus.IN_TRANSIT_TO_BF,
  [ShipmentStatus.IN_TRANSIT_TO_BF]: ShipmentStatus.ARRIVED_BF,
  [ShipmentStatus.ARRIVED_BF]: ShipmentStatus.READY_FOR_PICKUP,
  [ShipmentStatus.READY_FOR_PICKUP]: ShipmentStatus.DELIVERED,
};

export function canStaffAdvanceShipment(
  from: ShipmentStatus,
  to: ShipmentStatus,
): boolean {
  return (
    STAFF_SHIPMENT_TRANSITIONS[from] === to &&
    canTransitionShipmentStatus(from, to)
  );
}
