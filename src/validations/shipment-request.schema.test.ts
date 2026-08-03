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

function assertFirstErrorMessage(
  result: ReturnType<typeof shipmentItemInputSchema.safeParse>,
  expectedMessage: string,
): void;
function assertFirstErrorMessage(
  result: ReturnType<typeof createShipmentRequestInputSchema.safeParse>,
  expectedMessage: string,
): void;
function assertFirstErrorMessage(
  result:
    | ReturnType<typeof shipmentItemInputSchema.safeParse>
    | ReturnType<typeof createShipmentRequestInputSchema.safeParse>,
  expectedMessage: string,
) {
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues[0].message, expectedMessage);
  }
}

test("uses the approved French messages for customer contact fields", () => {
  assertFirstErrorMessage(
    createShipmentRequestInputSchema.safeParse({
      ...validRequest(),
      senderName: "A",
    }),
    "Le nom doit contenir au moins 2 caractères.",
  );
  assertFirstErrorMessage(
    createShipmentRequestInputSchema.safeParse({
      ...validRequest(),
      recipientName: "A".repeat(121),
    }),
    "Le nom ne peut pas dépasser 120 caractères.",
  );
  assertFirstErrorMessage(
    createShipmentRequestInputSchema.safeParse({
      ...validRequest(),
      senderPhone: "123",
    }),
    "Le numéro de téléphone doit contenir au moins 7 caractères.",
  );
  assertFirstErrorMessage(
    createShipmentRequestInputSchema.safeParse({
      ...validRequest(),
      senderPhone: "1".repeat(31),
    }),
    "Le numéro de téléphone ne peut pas dépasser 30 caractères.",
  );
  assertFirstErrorMessage(
    createShipmentRequestInputSchema.safeParse({
      ...validRequest(),
      senderPhone: "555-ABC-1234",
    }),
    "Le numéro de téléphone contient des caractères non autorisés.",
  );
  assertFirstErrorMessage(
    createShipmentRequestInputSchema.safeParse({
      ...validRequest(),
      senderEmail: "adresse-invalide",
    }),
    "Veuillez saisir une adresse e-mail valide.",
  );
});

test("uses the approved French messages for city and item fields", () => {
  assertFirstErrorMessage(
    createShipmentRequestInputSchema.safeParse({
      ...validRequest(),
      recipientCity: "O",
    }),
    "La ville doit contenir au moins 2 caractères.",
  );
  assertFirstErrorMessage(
    shipmentItemInputSchema.safeParse({
      ...validRequest().items[0],
      description: "A",
    }),
    "La description doit contenir au moins 2 caractères.",
  );
  assertFirstErrorMessage(
    shipmentItemInputSchema.safeParse({
      ...validRequest().items[0],
      category: "INVALID",
    }),
    "Choisissez une catégorie d’article valide.",
  );
  assertFirstErrorMessage(
    createShipmentRequestInputSchema.safeParse({
      ...validRequest(),
      intakeMethod: "INVALID",
    }),
    "Choisissez un mode de dépôt valide.",
  );
});

test("uses distinct French quantity messages", () => {
  for (const [quantity, expectedMessage] of [
    ["3", "Veuillez saisir une quantité valide."],
    [1.5, "La quantité doit être un nombre entier."],
    [0, "La quantité doit être au moins égale à 1."],
    [1000, "La quantité ne peut pas dépasser 999."],
  ] as const) {
    assertFirstErrorMessage(
      shipmentItemInputSchema.safeParse({
        ...validRequest().items[0],
        quantity,
      }),
      expectedMessage,
    );
  }
});

test("uses distinct French declared-value messages", () => {
  for (const [declaredValue, expectedMessage] of [
    [Number.NaN, "Veuillez saisir une valeur déclarée valide."],
    [-1, "La valeur déclarée ne peut pas être négative."],
    [10_000_000_000, "La valeur déclarée dépasse la limite autorisée."],
    [12.345, "La valeur déclarée ne peut pas avoir plus de deux décimales."],
  ] as const) {
    assertFirstErrorMessage(
      shipmentItemInputSchema.safeParse({
        ...validRequest().items[0],
        declaredValue,
      }),
      expectedMessage,
    );
  }
});

test("uses French item-count and note-length messages", () => {
  assertFirstErrorMessage(
    createShipmentRequestInputSchema.safeParse({
      ...validRequest(),
      items: [],
    }),
    "Ajoutez au moins un article à l’envoi.",
  );
  assertFirstErrorMessage(
    createShipmentRequestInputSchema.safeParse({
      ...validRequest(),
      items: Array.from({ length: 51 }, () => validRequest().items[0]),
    }),
    "Un envoi ne peut pas contenir plus de 50 articles.",
  );
  assertFirstErrorMessage(
    createShipmentRequestInputSchema.safeParse({
      ...validRequest(),
      recipientNotes: "N".repeat(501),
    }),
    "Les notes pour le destinataire ne peuvent pas dépasser 500 caractères.",
  );
  assertFirstErrorMessage(
    createShipmentRequestInputSchema.safeParse({
      ...validRequest(),
      customerNotes: "N".repeat(1001),
    }),
    "Les notes concernant l’envoi ne peuvent pas dépasser 1 000 caractères.",
  );
});
