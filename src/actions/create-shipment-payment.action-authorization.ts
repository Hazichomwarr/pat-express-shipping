import type { CreateShipmentPaymentActionState } from "./create-shipment-payment.action";
import { executeCreateShipmentPaymentAction } from "./create-shipment-payment.action-handler";
import { requireStaff } from "../services/_shared/require-staff";

const AUTHENTICATION_REQUIRED_MESSAGE =
  "Vous devez être connecté en tant que membre du personnel pour effectuer cette action.";

type RequireStaff = () => Promise<unknown>;

type HandleCreateShipmentPayment = (
  previousState: CreateShipmentPaymentActionState,
  formData: FormData,
) => Promise<CreateShipmentPaymentActionState>;

type ProtectedCreateShipmentPaymentActionDependencies = {
  requireStaff: RequireStaff;
  handleCreateShipmentPayment: HandleCreateShipmentPayment;
};

const defaultDependencies: ProtectedCreateShipmentPaymentActionDependencies = {
  requireStaff,
  handleCreateShipmentPayment: executeCreateShipmentPaymentAction,
};

export async function executeProtectedCreateShipmentPaymentAction(
  previousState: CreateShipmentPaymentActionState,
  formData: FormData,
  dependencies: ProtectedCreateShipmentPaymentActionDependencies =
    defaultDependencies,
): Promise<CreateShipmentPaymentActionState> {
  try {
    await dependencies.requireStaff();
  } catch {
    return {
      status: "error",
      message: AUTHENTICATION_REQUIRED_MESSAGE,
    };
  }

  return dependencies.handleCreateShipmentPayment(previousState, formData);
}
