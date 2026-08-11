import assert from "node:assert/strict";
import test from "node:test";

import { ShipmentDirection } from "@prisma/client";

test("supports exactly the two approved shipment directions", () => {
  assert.deepEqual(Object.values(ShipmentDirection).sort(), [
    "BF_TO_US",
    "US_TO_BF",
  ]);
});

test("exposes US_TO_BF and BF_TO_US as the only directions", () => {
  assert.equal(ShipmentDirection.US_TO_BF, "US_TO_BF");
  assert.equal(ShipmentDirection.BF_TO_US, "BF_TO_US");
  assert.equal(Object.keys(ShipmentDirection).length, 2);
});
