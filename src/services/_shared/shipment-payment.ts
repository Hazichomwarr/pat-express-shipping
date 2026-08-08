import {
  ShipmentPaymentStatus,
  ShipmentStatus,
} from "@prisma/client";

const TERMINAL_PAYMENT_STATUSES = new Set<ShipmentPaymentStatus>([
  ShipmentPaymentStatus.CONFIRMED,
  ShipmentPaymentStatus.CANCELLED,
]);

export function canStartShipmentPayment(status: ShipmentStatus): boolean {
  return status === ShipmentStatus.AWAITING_PAYMENT;
}

export function canConfirmShipmentPaymentStatus(
  status: ShipmentPaymentStatus,
): boolean {
  return status === ShipmentPaymentStatus.PENDING;
}

export function canCancelShipmentPaymentStatus(
  status: ShipmentPaymentStatus,
): boolean {
  return status === ShipmentPaymentStatus.PENDING;
}

export function isTerminalShipmentPaymentStatus(
  status: ShipmentPaymentStatus,
): boolean {
  return TERMINAL_PAYMENT_STATUSES.has(status);
}
