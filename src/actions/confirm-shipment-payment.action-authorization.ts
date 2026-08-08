import type { ConfirmShipmentPaymentActionState } from "./confirm-shipment-payment.action";
import { executeConfirmShipmentPaymentAction } from "./confirm-shipment-payment.action-handler";
import {
  requireStaff,
  type RequiredStaffIdentity,
} from "../services/_shared/require-staff";

const AUTHENTICATION_REQUIRED_MESSAGE =
  "Vous devez être connecté en tant que membre du personnel pour effectuer cette action.";

type RequireStaff = () => Promise<RequiredStaffIdentity>;

type HandleConfirmShipmentPayment = (
  previousState: ConfirmShipmentPaymentActionState,
  formData: FormData,
  staffId: string,
) => Promise<ConfirmShipmentPaymentActionState>;

type ProtectedConfirmShipmentPaymentActionDependencies = {
  requireStaff: RequireStaff;
  handleConfirmShipmentPayment: HandleConfirmShipmentPayment;
};

const defaultDependencies: ProtectedConfirmShipmentPaymentActionDependencies = {
  requireStaff,
  handleConfirmShipmentPayment: executeConfirmShipmentPaymentAction,
};

export async function executeProtectedConfirmShipmentPaymentAction(
  previousState: ConfirmShipmentPaymentActionState,
  formData: FormData,
  dependencies: ProtectedConfirmShipmentPaymentActionDependencies =
    defaultDependencies,
): Promise<ConfirmShipmentPaymentActionState> {
  let staff: RequiredStaffIdentity;

  try {
    staff = await dependencies.requireStaff();
  } catch {
    return {
      status: "error",
      message: AUTHENTICATION_REQUIRED_MESSAGE,
    };
  }

  return dependencies.handleConfirmShipmentPayment(
    previousState,
    formData,
    staff.id,
  );
}
