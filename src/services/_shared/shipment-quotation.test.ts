import assert from "node:assert/strict";
import test from "node:test";

import { ShipmentStatus } from "@prisma/client";

import { canQuoteShipmentStatus } from "./shipment-quotation";

test("allows quotation only while a shipment is awaiting quotation", () => {
  assert.equal(canQuoteShipmentStatus(ShipmentStatus.AWAITING_QUOTE), true);

  for (const status of Object.values(ShipmentStatus)) {
    if (status !== ShipmentStatus.AWAITING_QUOTE) {
      assert.equal(canQuoteShipmentStatus(status), false);
    }
  }
});
