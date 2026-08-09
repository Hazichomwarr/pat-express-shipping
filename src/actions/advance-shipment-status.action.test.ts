import assert from "node:assert/strict";
import test from "node:test";

import { ShipmentStatus, StaffRole } from "@prisma/client";

import {
  advanceShipmentStatusAction,
  type AdvanceShipmentStatusActionState,
} from "./advance-shipment-status.action";
import { executeProtectedAdvanceShipmentStatusAction } from "./advance-shipment-status.action-authorization";
import { executeAdvanceShipmentStatusAction } from "./advance-shipment-status.action-handler";
import { StaffAuthenticationRequiredError } from "../services/_shared/require-staff";
import {
  type AdvanceShipmentStatusResult,
  ShipmentNotFoundError,
  ShipmentStatusStateInconsistentError,
  ShipmentStatusTransitionConflictError,
  ShipmentStatusTransitionNotAllowedError,
} from "../services/shipment-status.service";

const IDLE_STATE: AdvanceShipmentStatusActionState = { status: "idle" };
const SHIPMENT_ID = "shipment_1";
const MILESTONE_AT = new Date("2026-08-08T20:15:00.000Z");

const SUCCESS_RESULT: AdvanceShipmentStatusResult = {
  id: SHIPMENT_ID,
  trackingNumber: "PAT-2026-ABCDEFGH",
  previousStatus: ShipmentStatus.AWAITING_PACKAGE,
  status: ShipmentStatus.PACKAGE_RECEIVED_US,
  milestoneAt: MILESTONE_AT,
};

function validFormData() {
  const formData = new FormData();
  formData.set("shipmentId", SHIPMENT_ID);
  formData.set("toStatus", ShipmentStatus.PACKAGE_RECEIVED_US);

  return formData;
}

function runHandler(
  formData: FormData,
  advanceShipmentStatus: (
    shipmentId: string,
    toStatus: ShipmentStatus,
  ) => Promise<AdvanceShipmentStatusResult>,
) {
  return executeAdvanceShipmentStatusAction(IDLE_STATE, formData, {
    advanceShipmentStatus,
  });
}

test("exports the two-parameter framework action signature", () => {
  const action: (
    previousState: AdvanceShipmentStatusActionState,
    formData: FormData,
  ) => Promise<AdvanceShipmentStatusActionState> = advanceShipmentStatusAction;

  assert.equal(action.length, 2);
});

for (const role of [StaffRole.ADMIN, StaffRole.STAFF]) {
  test(`allows an authenticated active ${role} before status handling`, async () => {
    const callOrder: string[] = [];
    const expectedState: AdvanceShipmentStatusActionState = {
      status: "error",
      message: "handler result",
    };

    const state = await executeProtectedAdvanceShipmentStatusAction(
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
        handleAdvanceShipmentStatus: async () => {
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

    const state = await executeProtectedAdvanceShipmentStatusAction(
      IDLE_STATE,
      validFormData(),
      {
        requireStaff: async () => {
          throw new StaffAuthenticationRequiredError();
        },
        handleAdvanceShipmentStatus: async () => {
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
  const state = await executeProtectedAdvanceShipmentStatusAction(
    IDLE_STATE,
    validFormData(),
    {
      requireStaff: async () => {
        throw new Error("private JWT and database details");
      },
      handleAdvanceShipmentStatus: async () => IDLE_STATE,
    },
  );

  assert.deepEqual(state, {
    status: "error",
    message:
      "Vous devez être connecté en tant que membre du personnel pour effectuer cette action.",
  });
  assert.equal(JSON.stringify(state).includes("JWT"), false);
});

test("requires and trims the shipment ID without inventing CUID validation", async () => {
  for (const shipmentId of [undefined, "", "   "]) {
    const formData = validFormData();
    if (shipmentId === undefined) formData.delete("shipmentId");
    else formData.set("shipmentId", shipmentId);
    let serviceCalls = 0;

    const state = await runHandler(formData, async () => {
      serviceCalls += 1;
      return SUCCESS_RESULT;
    });

    assert.deepEqual(state, {
      status: "validation_error",
      message: "Veuillez vérifier l’envoi sélectionné.",
      fieldErrors: {
        shipmentId: ["L’envoi à mettre à jour est introuvable."],
      },
    });
    assert.equal(serviceCalls, 0);
  }

  const formData = validFormData();
  formData.set("shipmentId", `  ${SHIPMENT_ID}  `);
  let receivedShipmentId: string | undefined;

  await runHandler(formData, async (shipmentId) => {
    receivedShipmentId = shipmentId;
    return SUCCESS_RESULT;
  });

  assert.equal(receivedShipmentId, SHIPMENT_ID);
});

test("rejects a missing or invalid requested status without calling the service", async () => {
  for (const toStatus of [undefined, "", "WHATEVER", " AWAITING_QUOTE "]) {
    const formData = validFormData();
    if (toStatus === undefined) formData.delete("toStatus");
    else formData.set("toStatus", toStatus);
    let serviceCalls = 0;

    const state = await runHandler(formData, async () => {
      serviceCalls += 1;
      return SUCCESS_RESULT;
    });

    assert.deepEqual(state, {
      status: "validation_error",
      message: "Veuillez vérifier l’étape sélectionnée.",
      fieldErrors: { toStatus: ["L’étape demandée est invalide."] },
    });
    assert.equal(serviceCalls, 0);
  }
});

test("passes every generated ShipmentStatus through without deciding legality", async () => {
  for (const toStatus of Object.values(ShipmentStatus)) {
    const formData = validFormData();
    formData.set("toStatus", toStatus);
    let receivedArguments: unknown[] = [];

    await runHandler(formData, async (...arguments_) => {
      receivedArguments = arguments_;
      return { ...SUCCESS_RESULT, status: toStatus };
    });

    assert.deepEqual(receivedArguments, [SHIPMENT_ID, toStatus]);
  }
});

test("ignores caller-supplied lifecycle timestamps, from status, and staff ID", async () => {
  const formData = validFormData();
  formData.set("fromStatus", ShipmentStatus.DELIVERED);
  formData.set("packageReceivedAt", "2020-01-01T00:00:00.000Z");
  formData.set("paymentConfirmedAt", "2020-01-01T00:00:00.000Z");
  formData.set("arrivedBfAt", "2020-01-01T00:00:00.000Z");
  formData.set("readyForPickupAt", "2020-01-01T00:00:00.000Z");
  formData.set("deliveredAt", "2020-01-01T00:00:00.000Z");
  formData.set("cancelledAt", "2020-01-01T00:00:00.000Z");
  formData.set("staffId", "attacker_staff");
  let receivedArguments: unknown[] = [];

  await runHandler(formData, async (...arguments_) => {
    receivedArguments = arguments_;
    return SUCCESS_RESULT;
  });

  assert.deepEqual(receivedArguments, [
    SHIPMENT_ID,
    ShipmentStatus.PACKAGE_RECEIVED_US,
  ]);
});

test("returns only approved fields and serializes a milestone timestamp", async () => {
  const serviceResult = {
    ...SUCCESS_RESULT,
    senderEmail: "private@example.com",
    internalNotes: "hidden",
  };

  const state = await runHandler(validFormData(), async () => serviceResult);

  assert.deepEqual(state, {
    status: "success",
    message: "Le statut de l’envoi a bien été mis à jour.",
    shipment: {
      id: SHIPMENT_ID,
      trackingNumber: "PAT-2026-ABCDEFGH",
      previousStatus: ShipmentStatus.AWAITING_PACKAGE,
      status: ShipmentStatus.PACKAGE_RECEIVED_US,
      milestoneAt: "2026-08-08T20:15:00.000Z",
    },
  });
});

test("preserves a null milestone without inventing a timestamp", async () => {
  const state = await runHandler(validFormData(), async () => ({
    ...SUCCESS_RESULT,
    milestoneAt: null,
  }));

  assert.equal(state.status, "success");
  if (state.status === "success") assert.equal(state.shipment.milestoneAt, null);
});

test("maps every status domain error to safe French", async () => {
  const cases = [
    [ShipmentNotFoundError, "Cet envoi est introuvable."],
    [
      ShipmentStatusTransitionNotAllowedError,
      "Cette étape n’est pas autorisée pour l’envoi dans son état actuel.",
    ],
    [
      ShipmentStatusStateInconsistentError,
      "L’historique de cet envoi est incohérent. Actualisez la page ou contactez un administrateur.",
    ],
    [
      ShipmentStatusTransitionConflictError,
      "Cet envoi a été modifié entre-temps. Actualisez la page avant de réessayer.",
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
  const state = await runHandler(validFormData(), async () => {
    throw new Error("P2024 private SQL and database details");
  });

  assert.deepEqual(state, {
    status: "error",
    message:
      "Une erreur est survenue lors de la mise à jour de l’envoi. Veuillez réessayer.",
  });
  assert.equal(JSON.stringify(state).includes("P2024"), false);
  assert.equal(JSON.stringify(state).includes("SQL"), false);
});

test("does not mutate FormData", async () => {
  const formData = validFormData();
  formData.set("staffId", "attacker_staff");
  const before = [...formData.entries()];

  await runHandler(formData, async () => SUCCESS_RESULT);

  assert.deepEqual([...formData.entries()], before);
});
