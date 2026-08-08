import assert from "node:assert/strict";
import test from "node:test";

import {
  ShipmentPaymentMethod,
  ShipmentQuoteCurrency,
} from "@prisma/client";

import { shipmentPaymentInputSchema } from "./shipment-payment.schema";

function validZellePayment() {
  return {
    method: ShipmentPaymentMethod.ZELLE,
    amount: 149.99,
    currency: ShipmentQuoteCurrency.USD,
    zelleName: "John Doe",
  };
}

function validCashPayment() {
  return {
    method: ShipmentPaymentMethod.CASH,
    amount: 80,
    currency: ShipmentQuoteCurrency.USD,
    zelleName: undefined,
  };
}

function issueMessages(input: unknown) {
  const result = shipmentPaymentInputSchema.safeParse(input);

  assert.equal(result.success, false);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

test("parses valid Zelle and cash payments", () => {
  assert.deepEqual(shipmentPaymentInputSchema.parse(validZellePayment()), {
    ...validZellePayment(),
  });
  assert.deepEqual(shipmentPaymentInputSchema.parse(validCashPayment()), {
    ...validCashPayment(),
  });
});

test("trims the Zelle name", () => {
  assert.equal(
    shipmentPaymentInputSchema.parse({
      ...validZellePayment(),
      zelleName: "  Jane Doe  ",
    }).zelleName,
    "Jane Doe",
  );
});

test("normalizes an optional empty Zelle name to undefined", () => {
  assert.equal(
    shipmentPaymentInputSchema.parse({
      ...validCashPayment(),
      zelleName: "   ",
    }).zelleName,
    undefined,
  );
});

test("requires an actionable Zelle payer name", () => {
  for (const [zelleName, expectedMessage] of [
    [undefined, "Indiquez le nom utilisé pour le paiement Zelle."],
    ["   ", "Indiquez le nom utilisé pour le paiement Zelle."],
    ["A", "Le nom Zelle doit contenir au moins 2 caractères."],
    ["A".repeat(121), "Le nom Zelle ne peut pas dépasser 120 caractères."],
  ] as const) {
    assert.equal(
      issueMessages({ ...validZellePayment(), zelleName }).includes(
        expectedMessage,
      ),
      true,
    );
  }
});

test("accepts cash without a Zelle name and rejects contradictory cash input", () => {
  assert.equal(
    shipmentPaymentInputSchema.safeParse(validCashPayment()).success,
    true,
  );
  assert.deepEqual(
    issueMessages({ ...validCashPayment(), zelleName: "John Doe" }),
    [
      "Le nom Zelle ne doit pas être renseigné pour un paiement en espèces.",
    ],
  );
});

test("accepts positive USD amounts with at most two decimals", () => {
  for (const amount of [1, 80, 149.99, 9_999_999_999.99]) {
    assert.equal(
      shipmentPaymentInputSchema.safeParse({
        ...validCashPayment(),
        amount,
      }).success,
      true,
    );
  }
});

test("rejects invalid payment amounts with French messages", () => {
  for (const [amount, expectedMessage] of [
    ["80", "Veuillez saisir un montant valide."],
    [Number.POSITIVE_INFINITY, "Veuillez saisir un montant valide."],
    [Number.NaN, "Veuillez saisir un montant valide."],
    [0, "Le montant du paiement doit être supérieur à 0."],
    [-1, "Le montant du paiement doit être supérieur à 0."],
    [10_000_000_000, "Le montant dépasse la limite autorisée."],
    [80.123, "Le montant ne peut pas avoir plus de deux décimales."],
  ] as const) {
    assert.equal(
      issueMessages({ ...validCashPayment(), amount }).includes(
        expectedMessage,
      ),
      true,
    );
  }
});

test("uses generated enums and rejects unsupported values in French", () => {
  assert.deepEqual(
    issueMessages({ ...validCashPayment(), method: "STRIPE" }),
    ["Choisissez un mode de paiement valide."],
  );
  assert.deepEqual(
    issueMessages({ ...validCashPayment(), currency: "XOF" }),
    ["Choisissez une devise valide."],
  );
});

test("rejects unknown and server-controlled fields", () => {
  for (const extraField of [
    { status: "CONFIRMED" },
    { shipmentId: "shipment_1" },
    { confirmedAt: new Date() },
    { confirmedByStaffId: "staff_1" },
    { cancelledAt: new Date() },
    { createdAt: new Date() },
    { updatedAt: new Date() },
  ]) {
    assert.equal(
      shipmentPaymentInputSchema.safeParse({
        ...validCashPayment(),
        ...extraField,
      }).success,
      false,
    );
  }
});

test("does not mutate the original payment input", () => {
  const input = { ...validZellePayment(), zelleName: "  John Doe  " };
  const originalInput = structuredClone(input);

  shipmentPaymentInputSchema.parse(input);

  assert.deepEqual(input, originalInput);
});
