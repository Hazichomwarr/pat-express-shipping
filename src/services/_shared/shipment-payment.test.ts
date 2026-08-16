import assert from "node:assert/strict";
import test from "node:test";

import {
  ShipmentDirection,
  ShipmentPaymentMethod,
  ShipmentPaymentStatus,
  ShipmentStatus,
} from "@prisma/client";

import {
  canCancelShipmentPaymentStatus,
  canConfirmShipmentPaymentStatus,
  canStartShipmentPayment,
  getAllowedShipmentPaymentMethods,
  isShipmentPaymentMethodAllowedForDirection,
  isTerminalShipmentPaymentStatus,
} from "./shipment-payment";

test("allows exactly Zelle and Cash for US_TO_BF", () => {
  assert.deepEqual(
    getAllowedShipmentPaymentMethods(ShipmentDirection.US_TO_BF),
    [ShipmentPaymentMethod.ZELLE, ShipmentPaymentMethod.CASH],
  );

  for (const method of Object.values(ShipmentPaymentMethod)) {
    assert.equal(
      isShipmentPaymentMethodAllowedForDirection(
        ShipmentDirection.US_TO_BF,
        method,
      ),
      method === ShipmentPaymentMethod.ZELLE ||
        method === ShipmentPaymentMethod.CASH,
    );
  }
});

test("allows exactly Orange Money and Cash for BF_TO_US", () => {
  assert.deepEqual(
    getAllowedShipmentPaymentMethods(ShipmentDirection.BF_TO_US),
    [ShipmentPaymentMethod.ORANGE_MONEY, ShipmentPaymentMethod.CASH],
  );

  for (const method of Object.values(ShipmentPaymentMethod)) {
    assert.equal(
      isShipmentPaymentMethodAllowedForDirection(
        ShipmentDirection.BF_TO_US,
        method,
      ),
      method === ShipmentPaymentMethod.ORANGE_MONEY ||
        method === ShipmentPaymentMethod.CASH,
    );
  }
});

test("returns defensive method arrays that cannot corrupt shared policy", () => {
  const methods = getAllowedShipmentPaymentMethods(
    ShipmentDirection.US_TO_BF,
  );

  (methods as ShipmentPaymentMethod[]).splice(
    0,
    methods.length,
    ShipmentPaymentMethod.ORANGE_MONEY,
  );

  assert.deepEqual(
    getAllowedShipmentPaymentMethods(ShipmentDirection.US_TO_BF),
    [ShipmentPaymentMethod.ZELLE, ShipmentPaymentMethod.CASH],
  );
});

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
