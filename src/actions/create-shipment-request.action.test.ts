import assert from "node:assert/strict";
import test from "node:test";

import {
  Prisma,
  ShipmentDirection,
  ShipmentIntakeMethod,
  ShipmentItemCategory,
  ShipmentStatus,
} from "@prisma/client";

import {
  createShipmentRequestAction,
  type CreateShipmentRequestActionState,
} from "./create-shipment-request.action";
import {
  type CreateGuestShipmentRequestResult,
  ShipmentTrackingNumberGenerationError,
} from "../services/shipment-request.service";
import { createShipmentRequestInputSchema } from "../validations/shipment-request.schema";

const CREATED_AT = new Date("2026-08-03T14:15:16.000Z");
const SUCCESS_RESULT: CreateGuestShipmentRequestResult = {
  id: "shipment_1",
  trackingNumber: "PAT-2026-ABCDEFGH",
  status: ShipmentStatus.AWAITING_PACKAGE,
  createdAt: CREATED_AT,
};
const IDLE_STATE: CreateShipmentRequestActionState = { status: "idle" };

function validFormData(
  intakeMethod: ShipmentIntakeMethod = ShipmentIntakeMethod.DROP_OFF,
) {
  const formData = new FormData();
  formData.set("direction", ShipmentDirection.US_TO_BF);
  formData.set("intakeMethod", intakeMethod);
  formData.set("senderName", "Aminata Sawadogo");
  formData.set("senderPhone", "+1 (862) 555-0142");
  formData.set("senderEmail", "AMINATA@EXAMPLE.COM");
  formData.set("recipientName", "Moussa Ouédraogo");
  formData.set("recipientPhone", "70 12 34 56");
  formData.set("recipientEmail", "moussa@example.com");
  formData.set("recipientCity", "Ouagadougou");
  formData.set("recipientNotes", "Appelez avant le retrait.");
  formData.set("customerNotes", "Manipuler avec soin.");
  formData.set("items.0.description", "Ordinateur portable");
  formData.set("items.0.category", ShipmentItemCategory.ELECTRONICS);
  formData.set("items.0.quantity", "1");
  formData.set("items.0.declaredValue", "149.99");

  return formData;
}

async function runAction(
  formData: FormData,
  createShipmentRequest: (
    input: unknown,
  ) => Promise<CreateGuestShipmentRequestResult>,
) {
  return createShipmentRequestAction(IDLE_STATE, formData, {
    createShipmentRequest,
  });
}

test("passes a valid French DROP_OFF payload to the creation service", async () => {
  let receivedInput: unknown;

  const state = await runAction(validFormData(), async (input) => {
    receivedInput = input;
    return SUCCESS_RESULT;
  });

  assert.equal(state.status, "success");
  assert.equal(
    (receivedInput as { intakeMethod: unknown }).intakeMethod,
    ShipmentIntakeMethod.DROP_OFF,
  );
});

for (const direction of [ShipmentDirection.US_TO_BF, ShipmentDirection.BF_TO_US]) {
  test(`reaches the service with direction=${direction} unchanged`, async () => {
    const formData = validFormData();
    formData.set("direction", direction);
    let receivedInput: unknown;

    await runAction(formData, async (input) => {
      receivedInput = input;
      return SUCCESS_RESULT;
    });

    assert.equal((receivedInput as { direction: unknown }).direction, direction);
  });
}

test("does not inject a direction default when the field is missing", async () => {
  const formData = validFormData();
  formData.delete("direction");
  let receivedInput: unknown;

  const state = await runAction(formData, async (input) => {
    receivedInput = input;
    createShipmentRequestInputSchema.parse(input);
    return SUCCESS_RESULT;
  });

  assert.equal(
    (receivedInput as { direction: unknown }).direction,
    undefined,
  );
  assert.equal(state.status, "validation_error");
  if (state.status === "validation_error") {
    assert.deepEqual(state.fieldErrors.direction, [
      "Veuillez choisir le sens de l’envoi.",
    ]);
  }
});

test("an invalid direction produces a French field error", async () => {
  const formData = validFormData();
  formData.set("direction", "FR_TO_BF");

  const state = await runAction(formData, async (input) => {
    createShipmentRequestInputSchema.parse(input);
    return SUCCESS_RESULT;
  });

  assert.equal(state.status, "validation_error");
  if (state.status === "validation_error") {
    assert.deepEqual(state.fieldErrors.direction, [
      "Veuillez choisir le sens de l’envoi.",
    ]);
  }
});

test("parses MAIL_IN without translating the persisted enum", async () => {
  let receivedInput: unknown;

  await runAction(
    validFormData(ShipmentIntakeMethod.MAIL_IN),
    async (input) => {
      receivedInput = input;
      return SUCCESS_RESULT;
    },
  );

  assert.equal(
    (receivedInput as { intakeMethod: unknown }).intakeMethod,
    ShipmentIntakeMethod.MAIL_IN,
  );
});

test("reconstructs multiple item rows in numeric index order", async () => {
  const formData = validFormData();
  formData.delete("items.0.description");
  formData.delete("items.0.category");
  formData.delete("items.0.quantity");
  formData.delete("items.0.declaredValue");

  for (const [index, description] of [
    [10, "Dixième article"],
    [2, "Deuxième article"],
    [7, "Septième article"],
  ] as const) {
    formData.set(`items.${index}.description`, description);
    formData.set(`items.${index}.category`, ShipmentItemCategory.GENERAL);
    formData.set(`items.${index}.quantity`, "1");
    formData.set(`items.${index}.declaredValue`, "");
  }

  let receivedInput: unknown;
  await runAction(formData, async (input) => {
    receivedInput = input;
    return SUCCESS_RESULT;
  });

  const items = (receivedInput as { items: { description: string }[] }).items;
  assert.deepEqual(
    items.map((item) => item.description),
    ["Deuxième article", "Septième article", "Dixième article"],
  );
});

test("converts form numbers and preserves optional empty values", async () => {
  const formData = validFormData();
  formData.set("recipientEmail", "");
  formData.set("recipientNotes", "");
  formData.set("customerNotes", "");
  formData.set("items.0.quantity", "4");
  formData.set("items.0.declaredValue", "");
  formData.set("items.1.description", "Vêtements");
  formData.set("items.1.category", ShipmentItemCategory.CLOTHING);
  formData.set("items.1.quantity", "3");
  formData.set("items.1.declaredValue", "25.50");

  let receivedInput: unknown;
  await runAction(formData, async (input) => {
    receivedInput = input;
    return SUCCESS_RESULT;
  });

  const request = receivedInput as {
    recipientEmail: string;
    recipientNotes: string;
    customerNotes: string;
    items: { quantity: unknown; declaredValue: unknown }[];
  };
  assert.equal(request.recipientEmail, "");
  assert.equal(request.recipientNotes, "");
  assert.equal(request.customerNotes, "");
  assert.equal(request.items[0].quantity, 4);
  assert.equal(request.items[0].declaredValue, undefined);
  assert.equal(request.items[1].quantity, 3);
  assert.equal(request.items[1].declaredValue, 25.5);
});

test("returns only safe shipment fields with an ISO creation time", async () => {
  const serviceResult = {
    ...SUCCESS_RESULT,
    senderEmail: "private@example.com",
    internalNotes: "private",
  };

  const state = await runAction(validFormData(), async () => serviceResult);

  assert.deepEqual(state, {
    status: "success",
    message: "Votre demande d’envoi a bien été créée.",
    shipment: {
      id: "shipment_1",
      trackingNumber: "PAT-2026-ABCDEFGH",
      status: ShipmentStatus.AWAITING_PACKAGE,
      createdAt: "2026-08-03T14:15:16.000Z",
    },
  });
});

test("maps Zod issues to stable French field-error paths", async () => {
  const formData = validFormData();
  formData.set("senderEmail", "adresse-invalide");
  formData.set("items.0.quantity", "pas-un-nombre");

  const state = await runAction(formData, async (input) => {
    createShipmentRequestInputSchema.parse(input);
    return SUCCESS_RESULT;
  });

  assert.equal(state.status, "validation_error");
  if (state.status !== "validation_error") {
    return;
  }

  assert.equal(state.message, "Veuillez corriger les informations indiquées.");
  assert.deepEqual(state.fieldErrors.senderEmail, [
    "Veuillez saisir une adresse e-mail valide.",
  ]);
  assert.deepEqual(state.fieldErrors["items.0.quantity"], [
    "Veuillez saisir une quantité valide.",
  ]);
  assert.equal(JSON.stringify(state).includes("ZodError"), false);
  assert.equal(JSON.stringify(state).includes("invalid_type"), false);
});

test("accepts blank sender email without injecting a placeholder", async () => {
  const formData = validFormData();
  formData.set("senderEmail", "   ");
  let receivedInput: unknown;

  const state = await runAction(formData, async (input) => {
    receivedInput = createShipmentRequestInputSchema.parse(input);
    return SUCCESS_RESULT;
  });

  assert.equal(state.status, "success");
  assert.equal(
    (receivedInput as { senderEmail?: string }).senderEmail,
    undefined,
  );
  assert.equal(JSON.stringify(receivedInput).includes("no-email@example.com"), false);
});

test("an invalid or empty quantity returns validation state instead of throwing", async () => {
  for (const quantity of ["abc", ""]) {
    const formData = validFormData();
    formData.set("items.0.quantity", quantity);

    const state = await runAction(formData, async (input) => {
      createShipmentRequestInputSchema.parse(input);
      return SUCCESS_RESULT;
    });

    assert.equal(state.status, "validation_error");
  }
});

test("does not forward unknown or server-controlled form fields", async () => {
  const formData = validFormData();
  formData.set("status", ShipmentStatus.DELIVERED);
  formData.set("trackingNumber", "CUSTOMER-CONTROLLED");
  formData.set("internalNotes", "private");
  formData.set("quotedAmount", "1");
  formData.set("items.0.officialWeight", "100");

  let receivedInput: unknown;
  await runAction(formData, async (input) => {
    receivedInput = input;
    return SUCCESS_RESULT;
  });

  const request = receivedInput as Record<string, unknown> & {
    items: Record<string, unknown>[];
  };
  assert.equal("status" in request, false);
  assert.equal("trackingNumber" in request, false);
  assert.equal("internalNotes" in request, false);
  assert.equal("quotedAmount" in request, false);
  assert.equal("officialWeight" in request.items[0], false);
});

test("returns the dedicated French tracking-number exhaustion message", async () => {
  const state = await runAction(validFormData(), async () => {
    throw new ShipmentTrackingNumberGenerationError();
  });

  assert.deepEqual(state, {
    status: "error",
    message:
      "Impossible de générer un numéro de suivi pour le moment. Veuillez réessayer.",
  });
});

test("hides unexpected Prisma error details behind the general French message", async () => {
  const prismaError = new Prisma.PrismaClientKnownRequestError(
    "P2002 Shipment_trackingNumber_key secret details",
    {
      code: "P2002",
      clientVersion: Prisma.prismaVersion.client,
      meta: { target: ["senderEmail"] },
    },
  );

  const state = await runAction(validFormData(), async () => {
    throw prismaError;
  });

  assert.deepEqual(state, {
    status: "error",
    message:
      "Une erreur est survenue lors de la création de l’envoi. Veuillez réessayer.",
  });
  assert.equal(JSON.stringify(state).includes("P2002"), false);
  assert.equal(
    JSON.stringify(state).includes("Shipment_trackingNumber_key"),
    false,
  );
});

test("does not mutate the submitted FormData", async () => {
  const formData = validFormData();
  const before = [...formData.entries()];

  await runAction(formData, async () => SUCCESS_RESULT);

  assert.deepEqual([...formData.entries()], before);
});
