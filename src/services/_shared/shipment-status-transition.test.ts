import assert from "node:assert/strict";
import test from "node:test";

import { ShipmentStatus } from "@prisma/client";

import {
  canTransitionShipmentStatus,
  getAllowedShipmentStatusTransitions,
  isTerminalShipmentStatus,
} from "./shipment-status-transition";

const APPROVED_FORWARD_TRANSITIONS = [
  [ShipmentStatus.AWAITING_PACKAGE, ShipmentStatus.PACKAGE_RECEIVED_US],
  [ShipmentStatus.PACKAGE_RECEIVED_US, ShipmentStatus.AWAITING_QUOTE],
  [ShipmentStatus.AWAITING_QUOTE, ShipmentStatus.AWAITING_PAYMENT],
  [ShipmentStatus.AWAITING_PAYMENT, ShipmentStatus.PAYMENT_CONFIRMED],
  [ShipmentStatus.PAYMENT_CONFIRMED, ShipmentStatus.IN_TRANSIT_TO_BF],
  [ShipmentStatus.IN_TRANSIT_TO_BF, ShipmentStatus.ARRIVED_BF],
  [ShipmentStatus.ARRIVED_BF, ShipmentStatus.READY_FOR_PICKUP],
  [ShipmentStatus.READY_FOR_PICKUP, ShipmentStatus.DELIVERED],
] as const;

const CANCELLABLE_STATUSES = [
  ShipmentStatus.AWAITING_PACKAGE,
  ShipmentStatus.PACKAGE_RECEIVED_US,
  ShipmentStatus.AWAITING_QUOTE,
  ShipmentStatus.AWAITING_PAYMENT,
] as const;

test("accepts every approved direct forward transition", () => {
  for (const [from, to] of APPROVED_FORWARD_TRANSITIONS) {
    assert.equal(canTransitionShipmentStatus(from, to), true);
  }
});

test("accepts cancellation from every approved pre-payment status", () => {
  for (const status of CANCELLABLE_STATUSES) {
    assert.equal(
      canTransitionShipmentStatus(status, ShipmentStatus.CANCELLED),
      true,
    );
  }
});

test("rejects cancellation after payment confirmation", () => {
  for (const status of [
    ShipmentStatus.PAYMENT_CONFIRMED,
    ShipmentStatus.IN_TRANSIT_TO_BF,
    ShipmentStatus.ARRIVED_BF,
    ShipmentStatus.READY_FOR_PICKUP,
    ShipmentStatus.DELIVERED,
    ShipmentStatus.CANCELLED,
  ]) {
    assert.equal(
      canTransitionShipmentStatus(status, ShipmentStatus.CANCELLED),
      false,
    );
  }
});

test("rejects skipped intermediate statuses", () => {
  assert.equal(
    canTransitionShipmentStatus(
      ShipmentStatus.AWAITING_PACKAGE,
      ShipmentStatus.AWAITING_QUOTE,
    ),
    false,
  );
  assert.equal(
    canTransitionShipmentStatus(
      ShipmentStatus.AWAITING_PAYMENT,
      ShipmentStatus.IN_TRANSIT_TO_BF,
    ),
    false,
  );
  assert.equal(
    canTransitionShipmentStatus(
      ShipmentStatus.PACKAGE_RECEIVED_US,
      ShipmentStatus.DELIVERED,
    ),
    false,
  );
});

test("rejects backward transitions", () => {
  for (const [from, to] of APPROVED_FORWARD_TRANSITIONS) {
    assert.equal(canTransitionShipmentStatus(to, from), false);
  }
});

test("rejects same-status transitions", () => {
  for (const status of Object.values(ShipmentStatus)) {
    assert.equal(canTransitionShipmentStatus(status, status), false);
  }
});

test("terminal statuses have no allowed next transitions", () => {
  assert.deepEqual(
    getAllowedShipmentStatusTransitions(ShipmentStatus.DELIVERED),
    [],
  );
  assert.deepEqual(
    getAllowedShipmentStatusTransitions(ShipmentStatus.CANCELLED),
    [],
  );
});

test("recognizes only delivered and cancelled as terminal", () => {
  assert.equal(isTerminalShipmentStatus(ShipmentStatus.DELIVERED), true);
  assert.equal(isTerminalShipmentStatus(ShipmentStatus.CANCELLED), true);

  for (const status of Object.values(ShipmentStatus)) {
    if (
      status !== ShipmentStatus.DELIVERED &&
      status !== ShipmentStatus.CANCELLED
    ) {
      assert.equal(isTerminalShipmentStatus(status), false);
    }
  }
});

test("returns transitions in forward-then-cancelled order", () => {
  assert.deepEqual(
    getAllowedShipmentStatusTransitions(ShipmentStatus.AWAITING_PACKAGE),
    [ShipmentStatus.PACKAGE_RECEIVED_US, ShipmentStatus.CANCELLED],
  );
  assert.deepEqual(
    getAllowedShipmentStatusTransitions(ShipmentStatus.AWAITING_PAYMENT),
    [ShipmentStatus.PAYMENT_CONFIRMED, ShipmentStatus.CANCELLED],
  );
});

test("does not expose mutable internal transition arrays", () => {
  const returnedTransitions = getAllowedShipmentStatusTransitions(
    ShipmentStatus.AWAITING_PACKAGE,
  );

  (returnedTransitions as ShipmentStatus[]).push(ShipmentStatus.DELIVERED);

  assert.deepEqual(
    getAllowedShipmentStatusTransitions(ShipmentStatus.AWAITING_PACKAGE),
    [ShipmentStatus.PACKAGE_RECEIVED_US, ShipmentStatus.CANCELLED],
  );
});
