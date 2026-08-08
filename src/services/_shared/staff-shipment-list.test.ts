import assert from "node:assert/strict";
import test from "node:test";

import { ShipmentStatus } from "@prisma/client";

import {
  normalizeStaffShipmentSearch,
  parseStaffShipmentListQuery,
  parseStaffShipmentStatus,
} from "./staff-shipment-list";

test("accepts every valid shipment-status query", () => {
  for (const status of Object.values(ShipmentStatus)) {
    assert.equal(parseStaffShipmentStatus(status), status);
  }
});

test("safely ignores invalid shipment-status queries", () => {
  for (const value of ["WHATEVER", "", ["AWAITING_PAYMENT"], undefined]) {
    assert.equal(parseStaffShipmentStatus(value), undefined);
  }
});

test("trims staff shipment search text", () => {
  assert.equal(
    normalizeStaffShipmentSearch("  PAT-2026-7K9M2QWX  "),
    "PAT-2026-7K9M2QWX",
  );
});

test("normalizes empty or invalid search input to no filter", () => {
  for (const value of ["", "   ", ["Ouagadougou"], undefined]) {
    assert.equal(normalizeStaffShipmentSearch(value), undefined);
  }
});

test("allows normalized search and status filters to coexist", () => {
  assert.deepEqual(
    parseStaffShipmentListQuery({
      q: "  ouedraogo ",
      status: "AWAITING_PAYMENT",
    }),
    {
      search: "ouedraogo",
      status: ShipmentStatus.AWAITING_PAYMENT,
    },
  );
});
