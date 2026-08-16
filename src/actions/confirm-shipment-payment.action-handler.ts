import type { ConfirmShipmentPaymentActionState } from "./confirm-shipment-payment.action";
import {
  confirmShipmentPayment,
  type ConfirmShipmentPaymentResult,
  ShipmentPaymentConfirmationConflictError,
  ShipmentPaymentConfirmationNotAllowedError,
  ShipmentPaymentConfirmerRequiredError,
  ShipmentPaymentNotFoundError,
  ShipmentPaymentShipmentStateError,
  ShipmentPaymentStateInconsistentError,
} from "../services/shipment-payment-confirmation.service";

const SUCCESS_MESSAGE = "Le paiement a bien été confirmé.";
const VALIDATION_MESSAGE = "Veuillez vérifier le paiement sélectionné.";
const MISSING_PAYMENT_MESSAGE = "Le paiement à confirmer est introuvable.";
const NOT_FOUND_MESSAGE = "Ce paiement est introuvable.";
const CONFIRMER_REQUIRED_MESSAGE =
  "Impossible de confirmer ce paiement avec l’identité actuelle.";
const NOT_ALLOWED_MESSAGE =
  "Ce paiement ne peut pas être confirmé dans son état actuel.";
const INCONSISTENT_STATE_MESSAGE =
  "Les informations de ce paiement sont incohérentes. Actualisez la page ou contactez un administrateur.";
const SHIPMENT_STATE_MESSAGE =
  "L’envoi associé ne peut pas être marqué comme payé dans son état actuel.";
const CONFLICT_MESSAGE =
  "Ce paiement ou cet envoi a été modifié entre-temps. Actualisez la page avant de réessayer.";
const GENERAL_ERROR_MESSAGE =
  "Une erreur est survenue lors de la confirmation du paiement. Veuillez réessayer.";

type ConfirmShipmentPayment = (
  paymentId: string,
  staffId: string,
) => Promise<ConfirmShipmentPaymentResult>;

type ConfirmShipmentPaymentActionDependencies = {
  confirmShipmentPayment: ConfirmShipmentPayment;
};

const defaultDependencies: ConfirmShipmentPaymentActionDependencies = {
  confirmShipmentPayment,
};

function getPaymentId(formData: FormData): string | undefined {
  const value = formData.get("paymentId");

  return typeof value === "string" ? value.trim() || undefined : undefined;
}

export async function executeConfirmShipmentPaymentAction(
  previousState: ConfirmShipmentPaymentActionState,
  formData: FormData,
  staffId: string,
  dependencies: ConfirmShipmentPaymentActionDependencies = defaultDependencies,
): Promise<ConfirmShipmentPaymentActionState> {
  void previousState;

  const paymentId = getPaymentId(formData);

  if (!paymentId) {
    return {
      status: "validation_error",
      message: VALIDATION_MESSAGE,
      fieldErrors: { paymentId: [MISSING_PAYMENT_MESSAGE] },
    };
  }

  try {
    const result = await dependencies.confirmShipmentPayment(
      paymentId,
      staffId,
    );

    return {
      status: "success",
      message: SUCCESS_MESSAGE,
      payment: {
        id: result.payment.id,
        shipmentId: result.payment.shipmentId,
        method: result.payment.method,
        status: result.payment.status,
        amount: result.payment.amount,
        currency: result.payment.currency,
        zelleName: result.payment.zelleName,
        mobileMoneyPayerName: result.payment.mobileMoneyPayerName,
        confirmedAt: result.payment.confirmedAt.toISOString(),
        confirmedByStaffId: result.payment.confirmedByStaffId,
      },
      shipment: {
        id: result.shipment.id,
        trackingNumber: result.shipment.trackingNumber,
        status: result.shipment.status,
        paymentConfirmedAt:
          result.shipment.paymentConfirmedAt.toISOString(),
      },
    };
  } catch (error) {
    if (error instanceof ShipmentPaymentNotFoundError) {
      return { status: "error", message: NOT_FOUND_MESSAGE };
    }

    if (error instanceof ShipmentPaymentConfirmerRequiredError) {
      return { status: "error", message: CONFIRMER_REQUIRED_MESSAGE };
    }

    if (error instanceof ShipmentPaymentConfirmationNotAllowedError) {
      return { status: "error", message: NOT_ALLOWED_MESSAGE };
    }

    if (error instanceof ShipmentPaymentStateInconsistentError) {
      return { status: "error", message: INCONSISTENT_STATE_MESSAGE };
    }

    if (error instanceof ShipmentPaymentShipmentStateError) {
      return { status: "error", message: SHIPMENT_STATE_MESSAGE };
    }

    if (error instanceof ShipmentPaymentConfirmationConflictError) {
      return { status: "error", message: CONFLICT_MESSAGE };
    }

    return { status: "error", message: GENERAL_ERROR_MESSAGE };
  }
}
