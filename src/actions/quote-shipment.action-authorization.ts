import type { QuoteShipmentActionState } from "./quote-shipment.action";
import { executeQuoteShipmentAction } from "./quote-shipment.action-handler";
import { requireStaff } from "../services/_shared/require-staff";

const AUTHENTICATION_REQUIRED_MESSAGE =
  "Vous devez être connecté en tant que membre du personnel pour effectuer cette action.";

type RequireStaff = () => Promise<unknown>;

type HandleQuoteShipment = (
  previousState: QuoteShipmentActionState,
  formData: FormData,
) => Promise<QuoteShipmentActionState>;

type ProtectedQuoteShipmentActionDependencies = {
  requireStaff: RequireStaff;
  handleQuoteShipment: HandleQuoteShipment;
};

const defaultDependencies: ProtectedQuoteShipmentActionDependencies = {
  requireStaff,
  handleQuoteShipment: executeQuoteShipmentAction,
};

export async function executeProtectedQuoteShipmentAction(
  previousState: QuoteShipmentActionState,
  formData: FormData,
  dependencies: ProtectedQuoteShipmentActionDependencies = defaultDependencies,
): Promise<QuoteShipmentActionState> {
  try {
    await dependencies.requireStaff();
  } catch {
    return {
      status: "error",
      message: AUTHENTICATION_REQUIRED_MESSAGE,
    };
  }

  return dependencies.handleQuoteShipment(previousState, formData);
}
