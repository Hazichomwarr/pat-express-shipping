import assert from "node:assert/strict";
import test from "node:test";

import {
  ShipmentIntakeMethod,
  ShipmentItemCategory,
} from "@prisma/client";

import {
  createShipmentRequestInputSchema,
  shipmentItemInputSchema,
} from "./shipment-request.schema";

function validRequest() {
  return {
    intakeMethod: ShipmentIntakeMethod.DROP_OFF,
    senderName: "Hamza Mare",
    senderPhone: "+1 (862) 555-0142",
    senderEmail: "hamza@example.com",
    recipientName: "Awa Ouedraogo",
    recipientPhone: "70 12 34 56",
    recipientEmail: "awa@example.com",
    recipientCity: "Ouagadougou",
    recipientNotes: "Call before pickup.",
    customerNotes: "Handle with care.",
    items: [
      {
        description: "Laptop computer",
        category: ShipmentItemCategory.ELECTRONICS,
        quantity: 1,
        declaredValue: 149.99,
      },
    ],
  };
}

test("parses valid DROP_OFF and MAIL_IN requests", () => {
  assert.equal(
    createShipmentRequestInputSchema.safeParse(validRequest()).success,
    true,
  );
  assert.equal(
    createShipmentRequestInputSchema.safeParse({
      ...validRequest(),
      intakeMethod: ShipmentIntakeMethod.MAIL_IN,
    }).success,
    true,
  );
});

test("trims human-readable fields and preserves phone formatting", () => {
  const result = createShipmentRequestInputSchema.parse({
    ...validRequest(),
    senderName: "  Hamza Mare  ",
    senderPhone: "  +1 (862) 555-0142  ",
    recipientName: "  Awa Ouedraogo  ",
    recipientCity: "  Ouagadougou  ",
    recipientNotes: "  Call before pickup.  ",
    customerNotes: "  Handle with care.  ",
    items: [
      {
        ...validRequest().items[0],
        description: "  Laptop computer  ",
      },
    ],
  });

  assert.equal(result.senderName, "Hamza Mare");
  assert.equal(result.senderPhone, "+1 (862) 555-0142");
  assert.equal(result.recipientName, "Awa Ouedraogo");
  assert.equal(result.recipientCity, "Ouagadougou");
  assert.equal(result.recipientNotes, "Call before pickup.");
  assert.equal(result.customerNotes, "Handle with care.");
  assert.equal(result.items[0].description, "Laptop computer");
});

test("lowercases sender and recipient email addresses", () => {
  const result = createShipmentRequestInputSchema.parse({
    ...validRequest(),
    senderEmail: " Hamza@Example.COM ",
    recipientEmail: " Awa@Example.COM ",
  });

  assert.equal(result.senderEmail, "hamza@example.com");
  assert.equal(result.recipientEmail, "awa@example.com");
});

test("normalizes optional empty strings to undefined", () => {
  const result = createShipmentRequestInputSchema.parse({
    ...validRequest(),
    recipientEmail: " ",
    recipientNotes: "   ",
    customerNotes: "",
  });

  assert.equal(result.recipientEmail, undefined);
  assert.equal(result.recipientNotes, undefined);
  assert.equal(result.customerNotes, undefined);
});

test("requires between one and fifty shipment items", () => {
  assert.equal(
    createShipmentRequestInputSchema.safeParse({
      ...validRequest(),
      items: [],
    }).success,
    false,
  );
  assert.equal(
    createShipmentRequestInputSchema.safeParse({
      ...validRequest(),
      items: Array.from({ length: 51 }, (_, index) => ({
        ...validRequest().items[0],
        description: `Declared item ${index + 1}`,
      })),
    }).success,
    false,
  );
});

test("requires an integer quantity from one through 999", () => {
  for (const quantity of [0, -2, 1.5, 1000, "3"]) {
    assert.equal(
      shipmentItemInputSchema.safeParse({
        ...validRequest().items[0],
        quantity,
      }).success,
      false,
    );
  }
  assert.equal(
    shipmentItemInputSchema.safeParse({
      ...validRequest().items[0],
      quantity: 999,
    }).success,
    true,
  );
});

test("preserves a declared value of zero", () => {
  const result = shipmentItemInputSchema.parse({
    ...validRequest().items[0],
    declaredValue: 0,
  });

  assert.equal(result.declaredValue, 0);
});

test("rejects invalid declared values", () => {
  for (const declaredValue of [
    -1,
    12.345,
    Number.POSITIVE_INFINITY,
    Number.NaN,
    10_000_000_000,
  ]) {
    assert.equal(
      shipmentItemInputSchema.safeParse({
        ...validRequest().items[0],
        declaredValue,
      }).success,
      false,
    );
  }
});

test("rejects invalid generated-enum values", () => {
  assert.equal(
    shipmentItemInputSchema.safeParse({
      ...validRequest().items[0],
      category: "INVALID",
    }).success,
    false,
  );
  assert.equal(
    createShipmentRequestInputSchema.safeParse({
      ...validRequest(),
      intakeMethod: "COURIER_PICKUP",
    }).success,
    false,
  );
});

test("rejects invalid email addresses", () => {
  assert.equal(
    createShipmentRequestInputSchema.safeParse({
      ...validRequest(),
      senderEmail: "not-an-email",
    }).success,
    false,
  );
  assert.equal(
    createShipmentRequestInputSchema.safeParse({
      ...validRequest(),
      recipientEmail: "not-an-email",
    }).success,
    false,
  );
});

test("rejects invalid phone characters and insufficient length", () => {
  for (const senderPhone of ["555-ABC-1234", "call me", "12"]) {
    assert.equal(
      createShipmentRequestInputSchema.safeParse({
        ...validRequest(),
        senderPhone,
      }).success,
      false,
    );
  }
});

test("rejects whitespace-only required fields", () => {
  assert.equal(
    createShipmentRequestInputSchema.safeParse({
      ...validRequest(),
      senderName: "   ",
    }).success,
    false,
  );
  assert.equal(
    shipmentItemInputSchema.safeParse({
      ...validRequest().items[0],
      description: "   ",
    }).success,
    false,
  );
});

test("rejects unknown top-level and shipment-item fields", () => {
  assert.equal(
    createShipmentRequestInputSchema.safeParse({
      ...validRequest(),
      quotedAmount: 25,
    }).success,
    false,
  );
  assert.equal(
    shipmentItemInputSchema.safeParse({
      ...validRequest().items[0],
      estimatedWeight: 4,
    }).success,
    false,
  );
});

test("rejects customer-supplied server-controlled fields", () => {
  assert.equal(
    createShipmentRequestInputSchema.safeParse({
      ...validRequest(),
      status: "AWAITING_PACKAGE",
    }).success,
    false,
  );
  assert.equal(
    createShipmentRequestInputSchema.safeParse({
      ...validRequest(),
      internalNotes: "Customer should not control this field.",
    }).success,
    false,
  );
});

test("parsing does not mutate the original input object", () => {
  const input = {
    ...validRequest(),
    senderName: "  Hamza Mare  ",
    senderEmail: " Hamza@Example.COM ",
    recipientNotes: "  Call before pickup.  ",
  };
  const originalInput = structuredClone(input);

  createShipmentRequestInputSchema.parse(input);

  assert.deepEqual(input, originalInput);
});
