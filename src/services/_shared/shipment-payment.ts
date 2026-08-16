import {
  ShipmentDirection,
  ShipmentPaymentMethod,
  ShipmentPaymentStatus,
  ShipmentStatus,
} from "@prisma/client";

const ALLOWED_PAYMENT_METHODS_BY_DIRECTION = {
  US_TO_BF: [ShipmentPaymentMethod.ZELLE, ShipmentPaymentMethod.CASH],
  BF_TO_US: [
    ShipmentPaymentMethod.ORANGE_MONEY,
    ShipmentPaymentMethod.CASH,
  ],
} as const satisfies Record<
  ShipmentDirection,
  readonly ShipmentPaymentMethod[]
>;

const TERMINAL_PAYMENT_STATUSES = new Set<ShipmentPaymentStatus>([
  ShipmentPaymentStatus.CONFIRMED,
  ShipmentPaymentStatus.CANCELLED,
]);

export function canStartShipmentPayment(status: ShipmentStatus): boolean {
  return status === ShipmentStatus.AWAITING_PAYMENT;
}

export function getAllowedShipmentPaymentMethods(
  direction: ShipmentDirection,
): readonly ShipmentPaymentMethod[] {
  return [...ALLOWED_PAYMENT_METHODS_BY_DIRECTION[direction]];
}

export function isShipmentPaymentMethodAllowedForDirection(
  direction: ShipmentDirection,
  method: ShipmentPaymentMethod,
): boolean {
  return ALLOWED_PAYMENT_METHODS_BY_DIRECTION[direction].some(
    (allowedMethod) => allowedMethod === method,
  );
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
