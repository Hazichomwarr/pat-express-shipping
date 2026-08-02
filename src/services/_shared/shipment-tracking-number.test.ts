import assert from "node:assert/strict";
import test from "node:test";

import {
  generateShipmentTrackingNumber,
  isShipmentTrackingNumber,
} from "./shipment-tracking-number";

const APPROVED_SUFFIX_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;

test("generates a tracking number in the approved format", () => {
  const trackingNumber = generateShipmentTrackingNumber({
    date: new Date(2026, 0, 1),
  });

  assert.equal(isShipmentTrackingNumber(trackingNumber), true);
  assert.match(trackingNumber, /^PAT-2026-[A-Z2-9]{8}$/);
});

test("uses the supplied date to determine the four-digit year", () => {
  const trackingNumber = generateShipmentTrackingNumber({
    date: new Date(2032, 6, 15),
  });

  assert.equal(trackingNumber.slice(0, 9), "PAT-2032-");
});

test("generates exactly eight suffix characters", () => {
  const trackingNumber = generateShipmentTrackingNumber();
  const suffix = trackingNumber.split("-")[2];

  assert.equal(suffix.length, 8);
});

test("generates suffixes using only the approved alphabet", () => {
  const trackingNumber = generateShipmentTrackingNumber();
  const suffix = trackingNumber.split("-")[2];

  assert.match(suffix, APPROVED_SUFFIX_PATTERN);
});

test("supports deterministic generation through a random byte source", () => {
  const trackingNumber = generateShipmentTrackingNumber({
    date: new Date(2026, 0, 1),
    randomBytes: (size) => {
      assert.equal(size, 8);
      return Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]);
    },
  });

  assert.equal(trackingNumber, "PAT-2026-ABCDEFGH");
});

test("accepts a valid tracking number", () => {
  assert.equal(isShipmentTrackingNumber("PAT-2026-7K9M2QWX"), true);
});

test("rejects every ambiguous suffix character", () => {
  for (const value of [
    "PAT-2026-7K9M2QWI",
    "PAT-2026-7K9M2QWO",
    "PAT-2026-7K9M2QW0",
    "PAT-2026-7K9M2QW1",
  ]) {
    assert.equal(isShipmentTrackingNumber(value), false);
  }
});

test("rejects lowercase prefixes", () => {
  assert.equal(isShipmentTrackingNumber("pat-2026-7K9M2QWX"), false);
});

test("rejects incorrect year lengths", () => {
  assert.equal(isShipmentTrackingNumber("PAT-26-7K9M2QWX"), false);
  assert.equal(isShipmentTrackingNumber("PAT-02026-7K9M2QWX"), false);
});

test("rejects incorrect suffix lengths", () => {
  assert.equal(isShipmentTrackingNumber("PAT-2026-7K9M2QW"), false);
  assert.equal(isShipmentTrackingNumber("PAT-2026-7K9M2QWXY"), false);
});

test("rejects leading and trailing whitespace", () => {
  assert.equal(isShipmentTrackingNumber(" PAT-2026-7K9M2QWX"), false);
  assert.equal(isShipmentTrackingNumber("PAT-2026-7K9M2QWX "), false);
});

test("does not generate one identical value across a reasonable sample", () => {
  const values = new Set(
    Array.from({ length: 32 }, () => generateShipmentTrackingNumber()),
  );

  assert.ok(values.size > 1);
});
