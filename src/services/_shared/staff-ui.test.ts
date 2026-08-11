import assert from "node:assert/strict";
import test from "node:test";

import {
  ShipmentIntakeMethod,
  ShipmentItemCategory,
  ShipmentPaymentMethod,
  ShipmentPaymentStatus,
  ShipmentStatus,
} from "@prisma/client";

import {
  getSafeStaffCallbackUrl,
  getShipmentItemCategoryLabel,
  getShipmentIntakeMethodLabel,
  getShipmentPaymentMethodLabel,
  getShipmentPaymentStatusLabel,
  getShipmentStatusLabel,
} from "./staff-ui";

test("accepts only safe local staff callback paths", () => {
  assert.equal(getSafeStaffCallbackUrl("/staff"), "/staff");
  assert.equal(
    getSafeStaffCallbackUrl("/staff/shipments/shipment_1/quote"),
    "/staff/shipments/shipment_1/quote",
  );
  assert.equal(
    getSafeStaffCallbackUrl("/staff/shipments/shipment_1/quote?from=login"),
    "/staff/shipments/shipment_1/quote?from=login",
  );
});

test("provides French payment-method labels", () => {
  assert.equal(
    getShipmentPaymentMethodLabel(ShipmentPaymentMethod.ZELLE),
    "Zelle",
  );
  assert.equal(
    getShipmentPaymentMethodLabel(ShipmentPaymentMethod.CASH),
    "Espèces",
  );
});

test("provides French payment-status labels", () => {
  assert.equal(
    getShipmentPaymentStatusLabel(ShipmentPaymentStatus.PENDING),
    "En attente",
  );
  assert.equal(
    getShipmentPaymentStatusLabel(ShipmentPaymentStatus.CONFIRMED),
    "Confirmé",
  );
  assert.equal(
    getShipmentPaymentStatusLabel(ShipmentPaymentStatus.CANCELLED),
    "Annulé",
  );
});

test("rejects external, protocol-relative, non-staff, and login callbacks", () => {
  for (const value of [
    "https://evil.example.com",
    "//evil.example.com/staff/quote",
    "/expedier",
    "/staff/login",
    "/staff\\evil",
    undefined,
    ["/staff/shipments/one/quote"],
  ]) {
    assert.equal(getSafeStaffCallbackUrl(value), "/");
  }
});

test("provides a French label for every shipment status", () => {
  const expectedLabels: Record<ShipmentStatus, string> = {
    AWAITING_PACKAGE: "En attente du colis",
    PACKAGE_RECEIVED: "Colis reçu aux États-Unis",
    AWAITING_QUOTE: "En attente de devis",
    AWAITING_PAYMENT: "En attente de paiement",
    PAYMENT_CONFIRMED: "Paiement confirmé",
    IN_TRANSIT: "En transit vers le Burkina Faso",
    ARRIVED_DESTINATION: "Arrivé au Burkina Faso",
    READY_FOR_PICKUP: "Prêt pour le retrait",
    DELIVERED: "Livré",
    CANCELLED: "Annulé",
  };

  for (const status of Object.values(ShipmentStatus)) {
    assert.equal(getShipmentStatusLabel(status), expectedLabels[status]);
  }
});

test("provides French intake-method labels", () => {
  assert.equal(
    getShipmentIntakeMethodLabel(ShipmentIntakeMethod.DROP_OFF),
    "Dépôt sur place",
  );
  assert.equal(
    getShipmentIntakeMethodLabel(ShipmentIntakeMethod.MAIL_IN),
    "Envoi par courrier",
  );
});

test("provides a French label for every shipment-item category", () => {
  const expectedLabels: Record<ShipmentItemCategory, string> = {
    GENERAL: "Général",
    CLOTHING: "Vêtements",
    ELECTRONICS: "Électronique",
    DOCUMENTS: "Documents",
    FOOD: "Produits alimentaires",
    HOUSEHOLD: "Articles ménagers",
    COMMERCIAL_GOODS: "Marchandises commerciales",
    OTHER: "Autre",
  };

  for (const category of Object.values(ShipmentItemCategory)) {
    assert.equal(getShipmentItemCategoryLabel(category), expectedLabels[category]);
  }
});
