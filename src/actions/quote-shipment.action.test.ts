import assert from "node:assert/strict";
import test from "node:test";

import {
  Prisma,
  ShipmentQuoteCurrency,
  ShipmentStatus,
} from "@prisma/client";

import {
  quoteShipmentAction,
  type QuoteShipmentActionState,
} from "./quote-shipment.action";
import { executeQuoteShipmentAction } from "./quote-shipment.action-handler";
import {
  type QuoteShipmentResult,
  ShipmentNotFoundError,
  ShipmentQuotationAlreadyExistsError,
  ShipmentQuotationConflictError,
  ShipmentQuotationNotAllowedError,
} from "../services/shipment-quotation.service";
import { shipmentQuotationInputSchema } from "../validations/shipment-quotation.schema";

const IDLE_STATE: QuoteShipmentActionState = { status: "idle" };
const QUOTED_AT = new Date("2026-08-08T16:30:00.000Z");
const SUCCESS_RESULT: QuoteShipmentResult = {
  id: "shipment_1",
  trackingNumber: "PAT-2026-ABCDEFGH",
  status: ShipmentStatus.AWAITING_PAYMENT,
  measuredWeightKg: "12.375",
  ratePerKg: "8.5",
  quotedAmount: "105",
  quoteCurrency: ShipmentQuoteCurrency.USD,
  quotedAt: QUOTED_AT,
};

function validFormData() {
  const formData = new FormData();
  formData.set("shipmentId", "shipment_1");
  formData.set("measuredWeightKg", "12.375");
  formData.set("ratePerKg", "8.50");
  formData.set("quotedAmount", "105.00");
  formData.set("quoteCurrency", ShipmentQuoteCurrency.USD);

  return formData;
}

function runAction(
  formData: FormData,
  quoteShipment: (
    shipmentId: string,
    input: unknown,
  ) => Promise<QuoteShipmentResult>,
) {
  return executeQuoteShipmentAction(IDLE_STATE, formData, { quoteShipment });
}

test("exports the two-parameter framework action signature", () => {
  const action: (
    previousState: QuoteShipmentActionState,
    formData: FormData,
  ) => Promise<QuoteShipmentActionState> = quoteShipmentAction;

  assert.equal(action.length, 2);
});

test("passes the shipment ID separately and converts quotation numbers", async () => {
  let receivedShipmentId: string | undefined;
  let receivedInput: unknown;

  const state = await runAction(validFormData(), async (shipmentId, input) => {
    receivedShipmentId = shipmentId;
    receivedInput = input;
    return SUCCESS_RESULT;
  });

  assert.equal(state.status, "success");
  assert.equal(receivedShipmentId, "shipment_1");
  assert.deepEqual(receivedInput, {
    measuredWeightKg: 12.375,
    ratePerKg: 8.5,
    quotedAmount: 105,
    quoteCurrency: ShipmentQuoteCurrency.USD,
  });
});

test("converts empty and invalid numeric strings to NaN", async () => {
  const formData = validFormData();
  formData.set("measuredWeightKg", "");
  formData.set("ratePerKg", "abc");
  formData.set("quotedAmount", "   ");
  let receivedInput: unknown;

  await runAction(formData, async (_shipmentId, input) => {
    receivedInput = input;
    return SUCCESS_RESULT;
  });

  const quotation = receivedInput as Record<string, unknown>;
  assert.equal(Number.isNaN(quotation.measuredWeightKg), true);
  assert.equal(Number.isNaN(quotation.ratePerKg), true);
  assert.equal(Number.isNaN(quotation.quotedAmount), true);
});

test("passes currency through without hard-coding it", async () => {
  const formData = validFormData();
  formData.set("quoteCurrency", "XOF");
  let receivedInput: unknown;

  await runAction(formData, async (_shipmentId, input) => {
    receivedInput = input;
    return SUCCESS_RESULT;
  });

  assert.equal(
    (receivedInput as { quoteCurrency: unknown }).quoteCurrency,
    "XOF",
  );
});

test("ignores caller-supplied server-controlled fields", async () => {
  const formData = validFormData();
  formData.set("quotedAt", "2020-01-01T00:00:00.000Z");
  formData.set("status", ShipmentStatus.DELIVERED);
  formData.set("trackingNumber", "CUSTOMER-CONTROLLED");
  formData.set("paymentConfirmedAt", "2020-01-01T00:00:00.000Z");
  let receivedInput: unknown;

  await runAction(formData, async (_shipmentId, input) => {
    receivedInput = input;
    return SUCCESS_RESULT;
  });

  assert.deepEqual(Object.keys(receivedInput as object).sort(), [
    "measuredWeightKg",
    "quoteCurrency",
    "quotedAmount",
    "ratePerKg",
  ]);
});

test("returns a French field error when shipmentId is missing or empty", async () => {
  for (const shipmentId of [undefined, "", "   "]) {
    const formData = validFormData();
    if (shipmentId === undefined) {
      formData.delete("shipmentId");
    } else {
      formData.set("shipmentId", shipmentId);
    }
    let serviceCalls = 0;

    const state = await runAction(formData, async () => {
      serviceCalls += 1;
      return SUCCESS_RESULT;
    });

    assert.deepEqual(state, {
      status: "validation_error",
      message: "Veuillez corriger les informations du devis.",
      fieldErrors: {
        shipmentId: ["L’envoi à facturer est introuvable."],
      },
    });
    assert.equal(serviceCalls, 0);
  }
});

test("maps Zod field paths and preserves French validation messages", async () => {
  const formData = validFormData();
  formData.set("measuredWeightKg", "0");
  formData.set("ratePerKg", "abc");

  const state = await runAction(formData, async (_shipmentId, input) => {
    shipmentQuotationInputSchema.parse(input);
    return SUCCESS_RESULT;
  });

  assert.equal(state.status, "validation_error");
  if (state.status !== "validation_error") {
    return;
  }

  assert.equal(state.message, "Veuillez corriger les informations du devis.");
  assert.deepEqual(state.fieldErrors.measuredWeightKg, [
    "Le poids doit être supérieur à 0 kg.",
  ]);
  assert.deepEqual(state.fieldErrors.ratePerKg, [
    "Veuillez saisir un tarif valide.",
  ]);
  assert.equal(JSON.stringify(state).includes("ZodError"), false);
});

test("maps unknown-field Zod issues to a safe form error", async () => {
  const state = await runAction(validFormData(), async (_shipmentId, input) => {
    shipmentQuotationInputSchema.parse({
      ...(input as object),
      status: ShipmentStatus.AWAITING_PAYMENT,
    });
    return SUCCESS_RESULT;
  });

  assert.deepEqual(state, {
    status: "validation_error",
    message: "Veuillez corriger les informations du devis.",
    fieldErrors: {
      _form: ["Certaines informations du devis ne sont pas autorisées."],
    },
  });
});

test("returns only the approved serialized success fields", async () => {
  const serviceResult = {
    ...SUCCESS_RESULT,
    senderEmail: "private@example.com",
    internalNotes: "private",
  };

  const state = await runAction(validFormData(), async () => serviceResult);

  assert.deepEqual(state, {
    status: "success",
    message: "Le devis de l’envoi a bien été enregistré.",
    quotation: {
      shipmentId: "shipment_1",
      trackingNumber: "PAT-2026-ABCDEFGH",
      status: ShipmentStatus.AWAITING_PAYMENT,
      measuredWeightKg: "12.375",
      ratePerKg: "8.5",
      quotedAmount: "105",
      quoteCurrency: ShipmentQuoteCurrency.USD,
      quotedAt: "2026-08-08T16:30:00.000Z",
    },
  });
});

test("maps every quotation domain error to its French message", async () => {
  const cases = [
    [ShipmentNotFoundError, "Cet envoi est introuvable."],
    [
      ShipmentQuotationNotAllowedError,
      "Cet envoi ne peut pas être facturé dans son état actuel.",
    ],
    [
      ShipmentQuotationAlreadyExistsError,
      "Un devis existe déjà pour cet envoi.",
    ],
    [
      ShipmentQuotationConflictError,
      "Cet envoi a été modifié entre-temps. Actualisez la page avant de réessayer.",
    ],
  ] as const;

  for (const [ErrorType, expectedMessage] of cases) {
    const state = await runAction(validFormData(), async () => {
      throw new ErrorType();
    });

    assert.deepEqual(state, { status: "error", message: expectedMessage });
  }
});

test("hides unexpected database errors behind the general French message", async () => {
  const error = new Prisma.PrismaClientKnownRequestError(
    "P2024 private database details",
    {
      code: "P2024",
      clientVersion: Prisma.prismaVersion.client,
    },
  );

  const state = await runAction(validFormData(), async () => {
    throw error;
  });

  assert.deepEqual(state, {
    status: "error",
    message:
      "Une erreur est survenue lors de l’enregistrement du devis. Veuillez réessayer.",
  });
  assert.equal(JSON.stringify(state).includes("P2024"), false);
  assert.equal(JSON.stringify(state).includes("database details"), false);
});

test("does not mutate submitted FormData", async () => {
  const formData = validFormData();
  const before = [...formData.entries()];

  await runAction(formData, async () => SUCCESS_RESULT);

  assert.deepEqual([...formData.entries()], before);
});
