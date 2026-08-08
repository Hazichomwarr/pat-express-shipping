import assert from "node:assert/strict";
import test from "node:test";

import { ShipmentStatus } from "@prisma/client";

import {
  getShipmentQuoteState,
  getStaffShipmentWorkspaceAction,
} from "./staff-shipment-workspace";

test("points awaiting-quote shipments to the quotation page", () => {
  assert.deepEqual(
    getStaffShipmentWorkspaceAction(
      ShipmentStatus.AWAITING_QUOTE,
      "shipment/one",
    ),
    {
      title: "Établir le devis",
      description:
        "Enregistrez le poids mesuré et les conditions commerciales officielles de cet envoi.",
      href: "/staff/shipments/shipment%2Fone/quote",
      linkLabel: "Établir le devis",
    },
  );
});

test("points awaiting-payment shipments to the payment page", () => {
  assert.equal(
    getStaffShipmentWorkspaceAction(
      ShipmentStatus.AWAITING_PAYMENT,
      "shipment_1",
    ).href,
    "/staff/shipments/shipment_1/payment",
  );
});

test("terminal shipment states expose no action destination", () => {
  for (const status of [ShipmentStatus.DELIVERED, ShipmentStatus.CANCELLED]) {
    const action = getStaffShipmentWorkspaceAction(status, "shipment_1");
    assert.equal(action.href, undefined);
    assert.equal(action.linkLabel, undefined);
  }
});

test("detects an empty quotation snapshot", () => {
  assert.equal(
    getShipmentQuoteState({
      measuredWeightKg: null,
      ratePerKg: null,
      quotedAmount: null,
      quoteCurrency: null,
      quotedAt: null,
    }),
    "empty",
  );
});

test("detects a complete quotation snapshot", () => {
  assert.equal(
    getShipmentQuoteState({
      measuredWeightKg: "10.500",
      ratePerKg: "8.50",
      quotedAmount: "89.25",
      quoteCurrency: "USD",
      quotedAt: new Date("2026-08-08T18:00:00.000Z"),
    }),
    "complete",
  );
});

test("detects a partial quotation snapshot", () => {
  assert.equal(
    getShipmentQuoteState({
      measuredWeightKg: "10.500",
      ratePerKg: null,
      quotedAmount: "89.25",
      quoteCurrency: "USD",
      quotedAt: null,
    }),
    "partial",
  );
});
