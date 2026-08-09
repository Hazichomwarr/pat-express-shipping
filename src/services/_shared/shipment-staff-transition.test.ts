import assert from "node:assert/strict";
import test from "node:test";

import { ShipmentStatus } from "@prisma/client";

import { canStaffAdvanceShipment } from "./shipment-staff-transition";
import { canTransitionShipmentStatus } from "./shipment-status-transition";

const APPROVED_STAFF_TRANSITIONS = [
  [ShipmentStatus.AWAITING_PACKAGE, ShipmentStatus.PACKAGE_RECEIVED_US],
  [ShipmentStatus.PACKAGE_RECEIVED_US, ShipmentStatus.AWAITING_QUOTE],
  [ShipmentStatus.PAYMENT_CONFIRMED, ShipmentStatus.IN_TRANSIT_TO_BF],
  [ShipmentStatus.IN_TRANSIT_TO_BF, ShipmentStatus.ARRIVED_BF],
  [ShipmentStatus.ARRIVED_BF, ShipmentStatus.READY_FOR_PICKUP],
  [ShipmentStatus.READY_FOR_PICKUP, ShipmentStatus.DELIVERED],
] as const;

test("allows exactly the six approved staff shipment transitions", () => {
  for (const from of Object.values(ShipmentStatus)) {
    for (const to of Object.values(ShipmentStatus)) {
      const expected = APPROVED_STAFF_TRANSITIONS.some(
        ([approvedFrom, approvedTo]) => approvedFrom === from && approvedTo === to,
      );

      assert.equal(canStaffAdvanceShipment(from, to), expected, `${from} → ${to}`);
    }
  }
});

test("every staff transition remains accepted by the central lifecycle policy", () => {
  for (const [from, to] of APPROVED_STAFF_TRANSITIONS) {
    assert.equal(canTransitionShipmentStatus(from, to), true);
    assert.equal(canStaffAdvanceShipment(from, to), true);
  }
});

test("does not expose quotation or payment-confirmation transitions", () => {
  assert.equal(
    canStaffAdvanceShipment(
      ShipmentStatus.AWAITING_QUOTE,
      ShipmentStatus.AWAITING_PAYMENT,
    ),
    false,
  );
  assert.equal(
    canStaffAdvanceShipment(
      ShipmentStatus.AWAITING_PAYMENT,
      ShipmentStatus.PAYMENT_CONFIRMED,
    ),
    false,
  );
});

test("rejects skipped and backward transitions", () => {
  assert.equal(
    canStaffAdvanceShipment(
      ShipmentStatus.AWAITING_PACKAGE,
      ShipmentStatus.AWAITING_QUOTE,
    ),
    false,
  );
  assert.equal(
    canStaffAdvanceShipment(
      ShipmentStatus.ARRIVED_BF,
      ShipmentStatus.IN_TRANSIT_TO_BF,
    ),
    false,
  );
});

test("does not expose cancellation as generic staff advancement", () => {
  for (const from of Object.values(ShipmentStatus)) {
    assert.equal(
      canStaffAdvanceShipment(from, ShipmentStatus.CANCELLED),
      false,
    );
  }
});
