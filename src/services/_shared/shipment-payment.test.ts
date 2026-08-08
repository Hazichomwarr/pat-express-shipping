import assert from "node:assert/strict";
import test from "node:test";

import {
  ShipmentPaymentStatus,
  ShipmentStatus,
} from "@prisma/client";

import {
  canCancelShipmentPaymentStatus,
  canConfirmShipmentPaymentStatus,
  canStartShipmentPayment,
  isTerminalShipmentPaymentStatus,
} from "./shipment-payment";

test("allows payment to start only while the shipment awaits payment", () => {
  for (const status of Object.values(ShipmentStatus)) {
    assert.equal(
      canStartShipmentPayment(status),
      status === ShipmentStatus.AWAITING_PAYMENT,
    );
  }
});

test("allows only pending payments to be confirmed", () => {
  for (const status of Object.values(ShipmentPaymentStatus)) {
    assert.equal(
      canConfirmShipmentPaymentStatus(status),
      status === ShipmentPaymentStatus.PENDING,
    );
  }
});

test("allows only pending payments to be cancelled", () => {
  for (const status of Object.values(ShipmentPaymentStatus)) {
    assert.equal(
      canCancelShipmentPaymentStatus(status),
      status === ShipmentPaymentStatus.PENDING,
    );
  }
});

test("treats confirmed and cancelled payments as terminal", () => {
  assert.equal(
    isTerminalShipmentPaymentStatus(ShipmentPaymentStatus.CONFIRMED),
    true,
  );
  assert.equal(
    isTerminalShipmentPaymentStatus(ShipmentPaymentStatus.CANCELLED),
    true,
  );
  assert.equal(
    isTerminalShipmentPaymentStatus(ShipmentPaymentStatus.PENDING),
    false,
  );
});
