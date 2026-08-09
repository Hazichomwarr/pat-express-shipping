import { ShipmentStatus } from "@prisma/client";

import type { AdvanceShipmentStatusActionState } from "./advance-shipment-status.action";
import {
  advanceShipmentStatus,
  type AdvanceShipmentStatusResult,
  ShipmentNotFoundError,
  ShipmentStatusStateInconsistentError,
  ShipmentStatusTransitionConflictError,
  ShipmentStatusTransitionNotAllowedError,
} from "../services/shipment-status.service";

const SUCCESS_MESSAGE = "Le statut de l’envoi a bien été mis à jour.";
const MISSING_SHIPMENT_VALIDATION_MESSAGE =
  "Veuillez vérifier l’envoi sélectionné.";
const MISSING_SHIPMENT_MESSAGE = "L’envoi à mettre à jour est introuvable.";
const INVALID_STATUS_VALIDATION_MESSAGE =
  "Veuillez vérifier l’étape sélectionnée.";
const INVALID_STATUS_MESSAGE = "L’étape demandée est invalide.";
const NOT_FOUND_MESSAGE = "Cet envoi est introuvable.";
const TRANSITION_NOT_ALLOWED_MESSAGE =
  "Cette étape n’est pas autorisée pour l’envoi dans son état actuel.";
const INCONSISTENT_STATE_MESSAGE =
  "L’historique de cet envoi est incohérent. Actualisez la page ou contactez un administrateur.";
const CONFLICT_MESSAGE =
  "Cet envoi a été modifié entre-temps. Actualisez la page avant de réessayer.";
const GENERAL_ERROR_MESSAGE =
  "Une erreur est survenue lors de la mise à jour de l’envoi. Veuillez réessayer.";

type AdvanceShipmentStatus = (
  shipmentId: string,
  toStatus: ShipmentStatus,
) => Promise<AdvanceShipmentStatusResult>;

type AdvanceShipmentStatusActionDependencies = {
  advanceShipmentStatus: AdvanceShipmentStatus;
};

const defaultDependencies: AdvanceShipmentStatusActionDependencies = {
  advanceShipmentStatus,
};

const shipmentStatuses = new Set<string>(Object.values(ShipmentStatus));

function getStringFormValue(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value : undefined;
}

function parseShipmentStatus(value: string | undefined) {
  return value !== undefined && shipmentStatuses.has(value)
    ? (value as ShipmentStatus)
    : undefined;
}

export async function executeAdvanceShipmentStatusAction(
  previousState: AdvanceShipmentStatusActionState,
  formData: FormData,
  dependencies: AdvanceShipmentStatusActionDependencies = defaultDependencies,
): Promise<AdvanceShipmentStatusActionState> {
  void previousState;

  const shipmentId = getStringFormValue(formData, "shipmentId")?.trim();

  if (!shipmentId) {
    return {
      status: "validation_error",
      message: MISSING_SHIPMENT_VALIDATION_MESSAGE,
      fieldErrors: { shipmentId: [MISSING_SHIPMENT_MESSAGE] },
    };
  }

  const toStatus = parseShipmentStatus(
    getStringFormValue(formData, "toStatus"),
  );

  if (!toStatus) {
    return {
      status: "validation_error",
      message: INVALID_STATUS_VALIDATION_MESSAGE,
      fieldErrors: { toStatus: [INVALID_STATUS_MESSAGE] },
    };
  }

  try {
    const shipment = await dependencies.advanceShipmentStatus(
      shipmentId,
      toStatus,
    );

    return {
      status: "success",
      message: SUCCESS_MESSAGE,
      shipment: {
        id: shipment.id,
        trackingNumber: shipment.trackingNumber,
        previousStatus: shipment.previousStatus,
        status: shipment.status,
        milestoneAt: shipment.milestoneAt?.toISOString() ?? null,
      },
    };
  } catch (error) {
    if (error instanceof ShipmentNotFoundError) {
      return { status: "error", message: NOT_FOUND_MESSAGE };
    }

    if (error instanceof ShipmentStatusTransitionNotAllowedError) {
      return { status: "error", message: TRANSITION_NOT_ALLOWED_MESSAGE };
    }

    if (error instanceof ShipmentStatusStateInconsistentError) {
      return { status: "error", message: INCONSISTENT_STATE_MESSAGE };
    }

    if (error instanceof ShipmentStatusTransitionConflictError) {
      return { status: "error", message: CONFLICT_MESSAGE };
    }

    return { status: "error", message: GENERAL_ERROR_MESSAGE };
  }
}
