import assert from "node:assert/strict";
import test from "node:test";

import {
  Prisma,
  ShipmentPaymentMethod,
  ShipmentPaymentStatus,
  ShipmentQuoteCurrency,
  ShipmentStatus,
  StaffRole,
} from "@prisma/client";

import {
  confirmShipmentPaymentAction,
  type ConfirmShipmentPaymentActionState,
} from "./confirm-shipment-payment.action";
import { executeProtectedConfirmShipmentPaymentAction } from "./confirm-shipment-payment.action-authorization";
import { executeConfirmShipmentPaymentAction } from "./confirm-shipment-payment.action-handler";
import { StaffAuthenticationRequiredError } from "../services/_shared/require-staff";
import {
  type ConfirmShipmentPaymentResult,
  ShipmentPaymentConfirmationConflictError,
  ShipmentPaymentConfirmationNotAllowedError,
  ShipmentPaymentConfirmerRequiredError,
  ShipmentPaymentNotFoundError,
  ShipmentPaymentShipmentStateError,
  ShipmentPaymentStateInconsistentError,
} from "../services/shipment-payment-confirmation.service";

const IDLE_STATE: ConfirmShipmentPaymentActionState = { status: "idle" };
const PAYMENT_ID = "payment_1";
const STAFF_ID = "staff_1";
const CONFIRMED_AT = new Date("2026-08-08T21:15:00.000Z");

const SUCCESS_RESULT: ConfirmShipmentPaymentResult = {
  payment: {
    id: PAYMENT_ID,
    shipmentId: "shipment_1",
    method: ShipmentPaymentMethod.ZELLE,
    status: ShipmentPaymentStatus.CONFIRMED,
    amount: "149.99",
    currency: ShipmentQuoteCurrency.USD,
    zelleName: "Ada Sender",
    mobileMoneyPayerName: null,
    confirmedAt: CONFIRMED_AT,
    confirmedByStaffId: STAFF_ID,
  },
  shipment: {
    id: "shipment_1",
    trackingNumber: "PAT-2026-ABCDEFGH",
    status: ShipmentStatus.PAYMENT_CONFIRMED,
    paymentConfirmedAt: CONFIRMED_AT,
  },
};

function validFormData() {
  const formData = new FormData();
  formData.set("paymentId", PAYMENT_ID);

  return formData;
}

function runHandler(
  formData: FormData,
  confirmShipmentPayment: (
    paymentId: string,
    staffId: string,
  ) => Promise<ConfirmShipmentPaymentResult>,
  staffId = STAFF_ID,
) {
  return executeConfirmShipmentPaymentAction(
    IDLE_STATE,
    formData,
    staffId,
    { confirmShipmentPayment },
  );
}

test("exports the two-parameter framework action signature", () => {
  const action: (
    previousState: ConfirmShipmentPaymentActionState,
    formData: FormData,
  ) => Promise<ConfirmShipmentPaymentActionState> =
    confirmShipmentPaymentAction;

  assert.equal(action.length, 2);
});

for (const role of [StaffRole.ADMIN, StaffRole.STAFF]) {
  test(`allows an authenticated active ${role} before confirmation handling`, async () => {
    const callOrder: string[] = [];
    let receivedStaffId: string | undefined;
    const expectedState: ConfirmShipmentPaymentActionState = {
      status: "error",
      message: "handler result",
    };

    const state = await executeProtectedConfirmShipmentPaymentAction(
      IDLE_STATE,
      validFormData(),
      {
        requireStaff: async () => {
          callOrder.push("authorize");
          return {
            id: STAFF_ID,
            name: "Staff Member",
            email: "staff@example.com",
            role,
          };
        },
        handleConfirmShipmentPayment: async (
          _previousState,
          _formData,
          staffId,
        ) => {
          callOrder.push("handle");
          receivedStaffId = staffId;
          return expectedState;
        },
      },
    );

    assert.deepEqual(callOrder, ["authorize", "handle"]);
    assert.equal(receivedStaffId, STAFF_ID);
    assert.strictEqual(state, expectedState);
  });
}

for (const scenario of ["anonymous", "inactive", "deleted"] as const) {
  test(`rejects ${scenario} staff before payment processing`, async () => {
    let handlerCalls = 0;

    const state = await executeProtectedConfirmShipmentPaymentAction(
      IDLE_STATE,
      validFormData(),
      {
        requireStaff: async () => {
          throw new StaffAuthenticationRequiredError();
        },
        handleConfirmShipmentPayment: async () => {
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

test("hides unexpected authorization errors", async () => {
  const state = await executeProtectedConfirmShipmentPaymentAction(
    IDLE_STATE,
    validFormData(),
    {
      requireStaff: async () => {
        throw new Error("private JWT and database details");
      },
      handleConfirmShipmentPayment: async () => IDLE_STATE,
    },
  );

  assert.deepEqual(state, {
    status: "error",
    message:
      "Vous devez être connecté en tant que membre du personnel pour effectuer cette action.",
  });
  assert.equal(JSON.stringify(state).includes("JWT"), false);
  assert.equal(JSON.stringify(state).includes("database"), false);
});

test("requires a non-empty payment ID without calling the service", async () => {
  for (const paymentId of [undefined, "", "   "]) {
    const formData = validFormData();
    if (paymentId === undefined) {
      formData.delete("paymentId");
    } else {
      formData.set("paymentId", paymentId);
    }
    let serviceCalls = 0;

    const state = await runHandler(formData, async () => {
      serviceCalls += 1;
      return SUCCESS_RESULT;
    });

    assert.deepEqual(state, {
      status: "validation_error",
      message: "Veuillez vérifier le paiement sélectionné.",
      fieldErrors: {
        paymentId: ["Le paiement à confirmer est introuvable."],
      },
    });
    assert.equal(serviceCalls, 0);
  }
});

test("trims payment ID and passes authenticated staff ID to the service", async () => {
  const formData = validFormData();
  formData.set("paymentId", `  ${PAYMENT_ID}  `);
  let receivedPaymentId: string | undefined;
  let receivedStaffId: string | undefined;

  await runHandler(formData, async (paymentId, staffId) => {
    receivedPaymentId = paymentId;
    receivedStaffId = staffId;
    return SUCCESS_RESULT;
  });

  assert.equal(receivedPaymentId, PAYMENT_ID);
  assert.equal(receivedStaffId, STAFF_ID);
});

test("ignores all caller-supplied server-controlled fields", async () => {
  const formData = validFormData();
  formData.set("staffId", "attacker_staff");
  formData.set("confirmedByStaffId", "attacker_staff");
  formData.set("confirmedAt", "2020-01-01T00:00:00.000Z");
  formData.set("status", ShipmentPaymentStatus.CONFIRMED);
  formData.set("shipmentId", "attacker_shipment");
  let receivedArguments: unknown[] = [];

  await runHandler(formData, async (...arguments_) => {
    receivedArguments = arguments_;
    return SUCCESS_RESULT;
  });

  assert.deepEqual(receivedArguments, [PAYMENT_ID, STAFF_ID]);
});

test("takes staff identity from requireStaff rather than FormData", async () => {
  const formData = validFormData();
  formData.set("staffId", "attacker_staff");
  let receivedStaffId: string | undefined;

  const state = await executeProtectedConfirmShipmentPaymentAction(
    IDLE_STATE,
    formData,
    {
      requireStaff: async () => ({
        id: STAFF_ID,
        name: "Staff Member",
        email: "staff@example.com",
        role: StaffRole.STAFF,
      }),
      handleConfirmShipmentPayment: (
        previousState,
        protectedFormData,
        staffId,
      ) =>
        executeConfirmShipmentPaymentAction(
          previousState,
          protectedFormData,
          staffId,
          {
            confirmShipmentPayment: async (_paymentId, serviceStaffId) => {
              receivedStaffId = serviceStaffId;
              return SUCCESS_RESULT;
            },
          },
        ),
    },
  );

  assert.equal(state.status, "success");
  assert.equal(receivedStaffId, STAFF_ID);
});

test("returns only approved fields and serializes both timestamps", async () => {
  const serviceResult = {
    ...SUCCESS_RESULT,
    payment: {
      ...SUCCESS_RESULT.payment,
      privatePaymentData: "hidden",
    },
    shipment: {
      ...SUCCESS_RESULT.shipment,
      senderEmail: "private@example.com",
      internalNotes: "hidden",
    },
  };

  const state = await runHandler(validFormData(), async () => serviceResult);

  assert.deepEqual(state, {
    status: "success",
    message: "Le paiement a bien été confirmé.",
    payment: {
      id: PAYMENT_ID,
      shipmentId: "shipment_1",
      method: ShipmentPaymentMethod.ZELLE,
      status: ShipmentPaymentStatus.CONFIRMED,
      amount: "149.99",
      currency: ShipmentQuoteCurrency.USD,
      zelleName: "Ada Sender",
      mobileMoneyPayerName: null,
      confirmedAt: "2026-08-08T21:15:00.000Z",
      confirmedByStaffId: STAFF_ID,
    },
    shipment: {
      id: "shipment_1",
      trackingNumber: "PAT-2026-ABCDEFGH",
      status: ShipmentStatus.PAYMENT_CONFIRMED,
      paymentConfirmedAt: "2026-08-08T21:15:00.000Z",
    },
  });
});

test("maps every confirmation domain error to safe French", async () => {
  const cases = [
    [ShipmentPaymentNotFoundError, "Ce paiement est introuvable."],
    [
      ShipmentPaymentConfirmerRequiredError,
      "Impossible de confirmer ce paiement avec l’identité actuelle.",
    ],
    [
      ShipmentPaymentConfirmationNotAllowedError,
      "Ce paiement ne peut pas être confirmé dans son état actuel.",
    ],
    [
      ShipmentPaymentStateInconsistentError,
      "Les informations de ce paiement sont incohérentes. Actualisez la page ou contactez un administrateur.",
    ],
    [
      ShipmentPaymentShipmentStateError,
      "L’envoi associé ne peut pas être marqué comme payé dans son état actuel.",
    ],
    [
      ShipmentPaymentConfirmationConflictError,
      "Ce paiement ou cet envoi a été modifié entre-temps. Actualisez la page avant de réessayer.",
    ],
  ] as const;

  for (const [ErrorType, expectedMessage] of cases) {
    const state = await runHandler(validFormData(), async () => {
      throw new ErrorType();
    });

    assert.deepEqual(state, { status: "error", message: expectedMessage });
  }
});

test("hides unexpected database errors behind the general French message", async () => {
  const databaseError = new Prisma.PrismaClientKnownRequestError(
    "P2024 private database details",
    {
      code: "P2024",
      clientVersion: Prisma.prismaVersion.client,
    },
  );

  const state = await runHandler(validFormData(), async () => {
    throw databaseError;
  });

  assert.deepEqual(state, {
    status: "error",
    message:
      "Une erreur est survenue lors de la confirmation du paiement. Veuillez réessayer.",
  });
  assert.equal(JSON.stringify(state).includes("P2024"), false);
  assert.equal(JSON.stringify(state).includes("database details"), false);
});

test("does not mutate FormData", async () => {
  const formData = validFormData();
  formData.set("staffId", "attacker_staff");
  const before = [...formData.entries()];

  await runHandler(formData, async () => SUCCESS_RESULT);

  assert.deepEqual([...formData.entries()], before);
});
