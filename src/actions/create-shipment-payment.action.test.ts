import assert from "node:assert/strict";
import test from "node:test";

import {
  Prisma,
  ShipmentPaymentMethod,
  ShipmentPaymentStatus,
  ShipmentQuoteCurrency,
  StaffRole,
} from "@prisma/client";

import {
  createShipmentPaymentAction,
  type CreateShipmentPaymentActionState,
} from "./create-shipment-payment.action";
import { executeProtectedCreateShipmentPaymentAction } from "./create-shipment-payment.action-authorization";
import { executeCreateShipmentPaymentAction } from "./create-shipment-payment.action-handler";
import { StaffAuthenticationRequiredError } from "../services/_shared/require-staff";
import {
  type CreateShipmentPaymentResult,
  ShipmentNotFoundError,
  ShipmentPaymentAmountMismatchError,
  ShipmentPaymentCurrencyMismatchError,
  ShipmentPaymentNotAllowedError,
  ShipmentPendingPaymentAlreadyExistsError,
  ShipmentQuoteIncompleteError,
} from "../services/shipment-payment.service";
import { shipmentPaymentInputSchema } from "../validations/shipment-payment.schema";

const IDLE_STATE: CreateShipmentPaymentActionState = { status: "idle" };
const SHIPMENT_ID = "shipment_1";
const CREATED_AT = new Date("2026-08-08T22:00:00.000Z");

const SUCCESS_RESULT: CreateShipmentPaymentResult = {
  id: "payment_1",
  shipmentId: SHIPMENT_ID,
  method: ShipmentPaymentMethod.ZELLE,
  status: ShipmentPaymentStatus.PENDING,
  amount: "149.99",
  currency: ShipmentQuoteCurrency.USD,
  zelleName: "Ada Sender",
  mobileMoneyPayerName: null,
  createdAt: CREATED_AT,
};

function validFormData() {
  const formData = new FormData();
  formData.set("shipmentId", SHIPMENT_ID);
  formData.set("method", ShipmentPaymentMethod.ZELLE);
  formData.set("amount", "149.99");
  formData.set("currency", ShipmentQuoteCurrency.USD);
  formData.set("zelleName", "Ada Sender");

  return formData;
}

function runHandler(
  formData: FormData,
  createShipmentPayment: (
    shipmentId: string,
    input: unknown,
  ) => Promise<CreateShipmentPaymentResult>,
) {
  return executeCreateShipmentPaymentAction(IDLE_STATE, formData, {
    createShipmentPayment,
  });
}

function knownRequestError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(
    "private database details",
    {
      code,
      clientVersion: Prisma.prismaVersion.client,
    },
  );
}

test("exports the two-parameter framework action signature", () => {
  const action: (
    previousState: CreateShipmentPaymentActionState,
    formData: FormData,
  ) => Promise<CreateShipmentPaymentActionState> =
    createShipmentPaymentAction;

  assert.equal(action.length, 2);
});

for (const role of [StaffRole.ADMIN, StaffRole.STAFF]) {
  test(`allows an authenticated active ${role} before payment creation`, async () => {
    const callOrder: string[] = [];
    const expectedState: CreateShipmentPaymentActionState = {
      status: "error",
      message: "handler result",
    };

    const state = await executeProtectedCreateShipmentPaymentAction(
      IDLE_STATE,
      validFormData(),
      {
        requireStaff: async () => {
          callOrder.push("authorize");
          return {
            id: "staff_1",
            name: "Staff Member",
            email: "staff@example.com",
            role,
          };
        },
        handleCreateShipmentPayment: async () => {
          callOrder.push("handle");
          return expectedState;
        },
      },
    );

    assert.deepEqual(callOrder, ["authorize", "handle"]);
    assert.strictEqual(state, expectedState);
  });
}

for (const scenario of ["anonymous", "inactive", "deleted"] as const) {
  test(`rejects ${scenario} staff before FormData processing`, async () => {
    let handlerCalls = 0;

    const state = await executeProtectedCreateShipmentPaymentAction(
      IDLE_STATE,
      validFormData(),
      {
        requireStaff: async () => {
          throw new StaffAuthenticationRequiredError();
        },
        handleCreateShipmentPayment: async () => {
          handlerCalls += 1;
          return IDLE_STATE;
        },
      },
    );

    assert.deepEqual(state, {
      status: "error",
      message:
        "Vous devez être connecté en tant que membre du personnel pour effectuer cette action.",
    });
    assert.equal(handlerCalls, 0);
  });
}

test("hides unexpected authorization details", async () => {
  const state = await executeProtectedCreateShipmentPaymentAction(
    IDLE_STATE,
    validFormData(),
    {
      requireStaff: async () => {
        throw new Error("private JWT and database details");
      },
      handleCreateShipmentPayment: async () => IDLE_STATE,
    },
  );

  assert.deepEqual(state, {
    status: "error",
    message:
      "Vous devez être connecté en tant que membre du personnel pour effectuer cette action.",
  });
  assert.equal(JSON.stringify(state).includes("JWT"), false);
});

test("requires shipment ID without calling the service", async () => {
  for (const shipmentId of [undefined, "", "   "]) {
    const formData = validFormData();
    if (shipmentId === undefined) {
      formData.delete("shipmentId");
    } else {
      formData.set("shipmentId", shipmentId);
    }
    let serviceCalls = 0;

    const state = await runHandler(formData, async () => {
      serviceCalls += 1;
      return SUCCESS_RESULT;
    });

    assert.deepEqual(state, {
      status: "validation_error",
      message: "Veuillez vérifier les informations du paiement.",
      fieldErrors: {
        shipmentId: ["L’envoi associé au paiement est introuvable."],
      },
    });
    assert.equal(serviceCalls, 0);
  }
});

test("trims shipment ID and converts payment FormData representation", async () => {
  const formData = validFormData();
  formData.set("shipmentId", `  ${SHIPMENT_ID}  `);
  formData.set("method", ShipmentPaymentMethod.CASH);
  formData.set("amount", "120.50");
  formData.set("currency", "XOF");
  formData.set("zelleName", "");
  let receivedShipmentId: string | undefined;
  let receivedInput: unknown;

  await runHandler(formData, async (shipmentId, input) => {
    receivedShipmentId = shipmentId;
    receivedInput = input;
    return SUCCESS_RESULT;
  });

  assert.equal(receivedShipmentId, SHIPMENT_ID);
  assert.deepEqual(receivedInput, {
    method: ShipmentPaymentMethod.CASH,
    amount: 120.5,
    currency: "XOF",
    zelleName: "",
    mobileMoneyPayerName: undefined,
  });
});

test("converts empty and invalid amounts to NaN", async () => {
  for (const amount of ["", "   ", "abc"]) {
    const formData = validFormData();
    formData.set("amount", amount);
    let receivedInput: unknown;

    await runHandler(formData, async (_shipmentId, input) => {
      receivedInput = input;
      return SUCCESS_RESULT;
    });

    assert.equal(
      Number.isNaN((receivedInput as { amount: unknown }).amount),
      true,
    );
  }
});

test("ignores caller-supplied server-controlled fields", async () => {
  const formData = validFormData();
  formData.set("status", ShipmentPaymentStatus.CONFIRMED);
  formData.set("confirmedAt", "2020-01-01T00:00:00.000Z");
  formData.set("confirmedByStaffId", "attacker_staff");
  formData.set("cancelledAt", "2020-01-01T00:00:00.000Z");
  formData.set("paymentId", "attacker_payment");
  formData.set("staffId", "attacker_staff");
  let receivedInput: unknown;

  await runHandler(formData, async (_shipmentId, input) => {
    receivedInput = input;
    return SUCCESS_RESULT;
  });

  assert.deepEqual(Object.keys(receivedInput as object).sort(), [
    "amount",
    "currency",
    "method",
    "mobileMoneyPayerName",
    "zelleName",
  ]);
});

test("passes Orange Money payer identity through the action boundary", async () => {
  const formData = validFormData();
  formData.set("method", ShipmentPaymentMethod.ORANGE_MONEY);
  formData.set("zelleName", "");
  formData.set("mobileMoneyPayerName", "  Awa Ouédraogo  ");
  let receivedInput: unknown;

  await runHandler(formData, async (_shipmentId, input) => {
    receivedInput = input;
    return SUCCESS_RESULT;
  });

  assert.deepEqual(receivedInput, {
    method: ShipmentPaymentMethod.ORANGE_MONEY,
    amount: 149.99,
    currency: ShipmentQuoteCurrency.USD,
    zelleName: "",
    mobileMoneyPayerName: "  Awa Ouédraogo  ",
  });
});

test("maps Zod field paths and preserves French validation messages", async () => {
  const formData = validFormData();
  formData.set("amount", "0");

  const state = await runHandler(formData, async (_shipmentId, input) => {
    shipmentPaymentInputSchema.parse(input);
    return SUCCESS_RESULT;
  });

  assert.deepEqual(state, {
    status: "validation_error",
    message: "Veuillez corriger les informations du paiement.",
    fieldErrors: {
      amount: ["Le montant du paiement doit être supérieur à 0."],
    },
  });
  assert.equal(JSON.stringify(state).includes("ZodError"), false);
});

test("maps unknown Zod fields to a safe form error", async () => {
  const state = await runHandler(
    validFormData(),
    async (_shipmentId, input) => {
      shipmentPaymentInputSchema.parse({
        ...(input as object),
        status: ShipmentPaymentStatus.PENDING,
      });
      return SUCCESS_RESULT;
    },
  );

  assert.deepEqual(state, {
    status: "validation_error",
    message: "Veuillez corriger les informations du paiement.",
    fieldErrors: {
      _form: ["Certaines informations du paiement ne sont pas autorisées."],
    },
  });
});

test("maps every payment-creation domain error to safe French", async () => {
  const cases = [
    [ShipmentNotFoundError, "Cet envoi est introuvable."],
    [
      ShipmentPaymentNotAllowedError,
      "Cet envoi ne peut pas recevoir de paiement dans son état actuel.",
    ],
    [
      ShipmentQuoteIncompleteError,
      "Le devis de cet envoi est incomplet. Le paiement ne peut pas être enregistré.",
    ],
    [
      ShipmentPaymentAmountMismatchError,
      "Le montant du paiement doit correspondre au montant du devis.",
    ],
    [
      ShipmentPaymentCurrencyMismatchError,
      "La devise du paiement doit correspondre à celle du devis.",
    ],
    [
      ShipmentPendingPaymentAlreadyExistsError,
      "Un paiement est déjà en attente pour cet envoi.",
    ],
  ] as const;

  for (const [ErrorType, expectedMessage] of cases) {
    const state = await runHandler(validFormData(), async () => {
      throw new ErrorType();
    });

    assert.deepEqual(state, { status: "error", message: expectedMessage });
  }
});

test("maps transaction serialization conflicts to refresh guidance", async () => {
  const state = await runHandler(validFormData(), async () => {
    throw knownRequestError("P2034");
  });

  assert.deepEqual(state, {
    status: "error",
    message:
      "Une erreur est survenue lors de l’enregistrement du paiement. Actualisez la page et réessayez.",
  });
});

test("hides unexpected service errors behind the general French message", async () => {
  const state = await runHandler(validFormData(), async () => {
    throw knownRequestError("P2024");
  });

  assert.deepEqual(state, {
    status: "error",
    message:
      "Une erreur est survenue lors de l’enregistrement du paiement. Veuillez réessayer.",
  });
  assert.equal(JSON.stringify(state).includes("P2024"), false);
  assert.equal(JSON.stringify(state).includes("database details"), false);
});

test("returns only safe pending-payment fields with an ISO timestamp", async () => {
  const serviceResult = {
    ...SUCCESS_RESULT,
    privatePaymentData: "hidden",
    senderEmail: "private@example.com",
  };

  const state = await runHandler(validFormData(), async () => serviceResult);

  assert.deepEqual(state, {
    status: "success",
    message: "Le paiement a bien été enregistré.",
    payment: {
      id: "payment_1",
      shipmentId: SHIPMENT_ID,
      method: ShipmentPaymentMethod.ZELLE,
      status: ShipmentPaymentStatus.PENDING,
      amount: "149.99",
      currency: ShipmentQuoteCurrency.USD,
      zelleName: "Ada Sender",
      mobileMoneyPayerName: null,
      createdAt: "2026-08-08T22:00:00.000Z",
    },
  });
  assert.equal(state.message.includes("confirmé"), false);
  assert.equal(state.message.includes("reçu"), false);
});

test("does not mutate FormData", async () => {
  const formData = validFormData();
  formData.set("status", ShipmentPaymentStatus.CONFIRMED);
  const before = [...formData.entries()];

  await runHandler(formData, async () => SUCCESS_RESULT);

  assert.deepEqual([...formData.entries()], before);
});
