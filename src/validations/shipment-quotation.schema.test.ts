import assert from "node:assert/strict";
import test from "node:test";

import { ShipmentQuoteCurrency } from "@prisma/client";

import { shipmentQuotationInputSchema } from "./shipment-quotation.schema";

function validQuotation() {
  return {
    measuredWeightKg: 27.375,
    ratePerKg: 8.5,
    quotedAmount: 232.69,
    quoteCurrency: ShipmentQuoteCurrency.USD,
  };
}

function assertFirstErrorMessage(input: unknown, expectedMessage: string) {
  const result = shipmentQuotationInputSchema.safeParse(input);

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues[0].message, expectedMessage);
  }
}

test("parses a valid USD shipment quotation", () => {
  assert.deepEqual(shipmentQuotationInputSchema.parse(validQuotation()), {
    measuredWeightKg: 27.375,
    ratePerKg: 8.5,
    quotedAmount: 232.69,
    quoteCurrency: ShipmentQuoteCurrency.USD,
  });
});

test("accepts the database-supported maximum values", () => {
  assert.equal(
    shipmentQuotationInputSchema.safeParse({
      ...validQuotation(),
      measuredWeightKg: 9_999_999.999,
      ratePerKg: 9_999_999_999.99,
      quotedAmount: 9_999_999_999.99,
    }).success,
    true,
  );
});

test("accepts supported measured-weight precision", () => {
  for (const measuredWeightKg of [0.001, 0.25, 1, 1.5, 27.375]) {
    assert.equal(
      shipmentQuotationInputSchema.safeParse({
        ...validQuotation(),
        measuredWeightKg,
      }).success,
      true,
    );
  }
});

test("rejects invalid measured weights", () => {
  for (const measuredWeightKg of [
    0,
    -1,
    1.2345,
    Number.POSITIVE_INFINITY,
    Number.NaN,
    10_000_000,
  ]) {
    assert.equal(
      shipmentQuotationInputSchema.safeParse({
        ...validQuotation(),
        measuredWeightKg,
      }).success,
      false,
    );
  }
});

test("uses distinct French measured-weight messages", () => {
  for (const [measuredWeightKg, expectedMessage] of [
    ["1.5", "Veuillez saisir un poids valide."],
    [0, "Le poids doit être supérieur à 0 kg."],
    [10_000_000, "Le poids dépasse la limite autorisée."],
    [1.2345, "Le poids ne peut pas avoir plus de trois décimales."],
  ] as const) {
    assertFirstErrorMessage(
      { ...validQuotation(), measuredWeightKg },
      expectedMessage,
    );
  }
});

test("accepts supported rate precision", () => {
  for (const ratePerKg of [1, 8, 8.5, 12.75]) {
    assert.equal(
      shipmentQuotationInputSchema.safeParse({
        ...validQuotation(),
        ratePerKg,
      }).success,
      true,
    );
  }
});

test("rejects invalid rates", () => {
  for (const ratePerKg of [
    0,
    -2,
    8.999,
    Number.POSITIVE_INFINITY,
    Number.NaN,
    10_000_000_000,
  ]) {
    assert.equal(
      shipmentQuotationInputSchema.safeParse({
        ...validQuotation(),
        ratePerKg,
      }).success,
      false,
    );
  }
});

test("uses distinct French rate messages", () => {
  for (const [ratePerKg, expectedMessage] of [
    ["8.50", "Veuillez saisir un tarif valide."],
    [0, "Le tarif par kilogramme doit être supérieur à 0."],
    [10_000_000_000, "Le tarif dépasse la limite autorisée."],
    [8.999, "Le tarif ne peut pas avoir plus de deux décimales."],
  ] as const) {
    assertFirstErrorMessage({ ...validQuotation(), ratePerKg }, expectedMessage);
  }
});

test("accepts supported quoted-amount precision", () => {
  for (const quotedAmount of [1, 80, 149.99]) {
    assert.equal(
      shipmentQuotationInputSchema.safeParse({
        ...validQuotation(),
        quotedAmount,
      }).success,
      true,
    );
  }
});

test("rejects invalid quoted amounts", () => {
  for (const quotedAmount of [
    0,
    -1,
    80.123,
    Number.POSITIVE_INFINITY,
    Number.NaN,
    10_000_000_000,
  ]) {
    assert.equal(
      shipmentQuotationInputSchema.safeParse({
        ...validQuotation(),
        quotedAmount,
      }).success,
      false,
    );
  }
});

test("uses distinct French quoted-amount messages", () => {
  for (const [quotedAmount, expectedMessage] of [
    ["80.00", "Veuillez saisir un montant valide."],
    [0, "Le montant du devis doit être supérieur à 0."],
    [10_000_000_000, "Le montant dépasse la limite autorisée."],
    [80.123, "Le montant ne peut pas avoir plus de deux décimales."],
  ] as const) {
    assertFirstErrorMessage(
      { ...validQuotation(), quotedAmount },
      expectedMessage,
    );
  }
});

test("rejects unsupported currencies with a French message", () => {
  assertFirstErrorMessage(
    { ...validQuotation(), quoteCurrency: "XOF" },
    "Choisissez une devise valide.",
  );
});

test("rejects unknown and server-controlled fields", () => {
  for (const extraField of [
    { quotedAt: new Date() },
    { status: "AWAITING_PAYMENT" },
    { shipmentId: "shipment-id" },
    { trackingNumber: "PAT-2026-ABCDEFGH" },
    { paymentConfirmedAt: new Date() },
    { internalNotes: "Private note" },
  ]) {
    assert.equal(
      shipmentQuotationInputSchema.safeParse({
        ...validQuotation(),
        ...extraField,
      }).success,
      false,
    );
  }
});

test("does not require the quoted amount to equal weight times rate", () => {
  assert.equal(
    shipmentQuotationInputSchema.safeParse({
      ...validQuotation(),
      measuredWeightKg: 10,
      ratePerKg: 8,
      quotedAmount: 75,
    }).success,
    true,
  );
});

test("does not mutate the original quotation input", () => {
  const input = validQuotation();
  const originalInput = structuredClone(input);

  shipmentQuotationInputSchema.parse(input);

  assert.deepEqual(input, originalInput);
});
