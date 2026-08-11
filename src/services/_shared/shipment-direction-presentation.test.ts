import assert from "node:assert/strict";
import test from "node:test";

import { ShipmentDirection } from "@prisma/client";

import {
  getShipmentDirectionDestinationLabel,
  getShipmentDirectionLabel,
  getShipmentDirectionOriginLabel,
} from "./shipment-direction-presentation";

test("provides a French route label for every shipment direction", () => {
  const expectedLabels: Record<ShipmentDirection, string> = {
    US_TO_BF: "États-Unis → Burkina Faso",
    BF_TO_US: "Burkina Faso → États-Unis",
  };

  for (const direction of Object.values(ShipmentDirection)) {
    assert.equal(getShipmentDirectionLabel(direction), expectedLabels[direction]);
  }
});

test("provides a French origin label for every shipment direction", () => {
  assert.equal(
    getShipmentDirectionOriginLabel(ShipmentDirection.US_TO_BF),
    "États-Unis",
  );
  assert.equal(
    getShipmentDirectionOriginLabel(ShipmentDirection.BF_TO_US),
    "Burkina Faso",
  );
});

test("provides a French destination label for every shipment direction", () => {
  assert.equal(
    getShipmentDirectionDestinationLabel(ShipmentDirection.US_TO_BF),
    "Burkina Faso",
  );
  assert.equal(
    getShipmentDirectionDestinationLabel(ShipmentDirection.BF_TO_US),
    "États-Unis",
  );
});
