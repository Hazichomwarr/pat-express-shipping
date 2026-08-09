import type { AdvanceShipmentStatusActionState } from "./advance-shipment-status.action";
import { executeAdvanceShipmentStatusAction } from "./advance-shipment-status.action-handler";
import { requireStaff } from "../services/_shared/require-staff";

const AUTHENTICATION_REQUIRED_MESSAGE =
  "Vous devez être connecté en tant que membre du personnel pour effectuer cette action.";

type RequireStaff = () => Promise<unknown>;

type HandleAdvanceShipmentStatus = (
  previousState: AdvanceShipmentStatusActionState,
  formData: FormData,
) => Promise<AdvanceShipmentStatusActionState>;

type ProtectedAdvanceShipmentStatusActionDependencies = {
  requireStaff: RequireStaff;
  handleAdvanceShipmentStatus: HandleAdvanceShipmentStatus;
};

const defaultDependencies: ProtectedAdvanceShipmentStatusActionDependencies = {
  requireStaff,
  handleAdvanceShipmentStatus: executeAdvanceShipmentStatusAction,
};

export async function executeProtectedAdvanceShipmentStatusAction(
  previousState: AdvanceShipmentStatusActionState,
  formData: FormData,
  dependencies: ProtectedAdvanceShipmentStatusActionDependencies =
    defaultDependencies,
): Promise<AdvanceShipmentStatusActionState> {
  try {
    await dependencies.requireStaff();
  } catch {
    return {
      status: "error",
      message: AUTHENTICATION_REQUIRED_MESSAGE,
    };
  }

  return dependencies.handleAdvanceShipmentStatus(previousState, formData);
}
