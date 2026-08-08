import { ShipmentStatus } from "@prisma/client";

export function canQuoteShipmentStatus(status: ShipmentStatus): boolean {
  return status === ShipmentStatus.AWAITING_QUOTE;
}
