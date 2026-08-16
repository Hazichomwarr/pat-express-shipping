import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import type { CreateShipmentPaymentActionState } from "./create-shipment-payment.action";
import {
  createShipmentPayment,
  type CreateShipmentPaymentResult,
  ShipmentNotFoundError,
  ShipmentPaymentAmountMismatchError,
  ShipmentPaymentCurrencyMismatchError,
  ShipmentPaymentNotAllowedError,
  ShipmentPendingPaymentAlreadyExistsError,
  ShipmentQuoteIncompleteError,
} from "../services/shipment-payment.service";

const SUCCESS_MESSAGE = "Le paiement a bien été enregistré.";
const MISSING_SHIPMENT_VALIDATION_MESSAGE =
  "Veuillez vérifier les informations du paiement.";
const VALIDATION_MESSAGE =
  "Veuillez corriger les informations du paiement.";
const MISSING_SHIPMENT_MESSAGE =
  "L’envoi associé au paiement est introuvable.";
const UNKNOWN_FIELD_MESSAGE =
  "Certaines informations du paiement ne sont pas autorisées.";
const NOT_FOUND_MESSAGE = "Cet envoi est introuvable.";
const NOT_ALLOWED_MESSAGE =
  "Cet envoi ne peut pas recevoir de paiement dans son état actuel.";
const INCOMPLETE_QUOTE_MESSAGE =
  "Le devis de cet envoi est incomplet. Le paiement ne peut pas être enregistré.";
const AMOUNT_MISMATCH_MESSAGE =
  "Le montant du paiement doit correspondre au montant du devis.";
const CURRENCY_MISMATCH_MESSAGE =
  "La devise du paiement doit correspondre à celle du devis.";
const PENDING_PAYMENT_EXISTS_MESSAGE =
  "Un paiement est déjà en attente pour cet envoi.";
const TRANSACTION_CONFLICT_MESSAGE =
  "Une erreur est survenue lors de l’enregistrement du paiement. Actualisez la page et réessayez.";
const GENERAL_ERROR_MESSAGE =
  "Une erreur est survenue lors de l’enregistrement du paiement. Veuillez réessayer.";

type CreateShipmentPayment = (
  shipmentId: string,
  input: unknown,
) => Promise<CreateShipmentPaymentResult>;

type CreateShipmentPaymentActionDependencies = {
  createShipmentPayment: CreateShipmentPayment;
};

const defaultDependencies: CreateShipmentPaymentActionDependencies = {
  createShipmentPayment,
};

function getStringFormValue(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value : undefined;
}

function numberFromFormValue(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim() === "" ? Number.NaN : Number(value);
}

function paymentFromFormData(formData: FormData) {
  return {
    method: getStringFormValue(formData, "method"),
    amount: numberFromFormValue(getStringFormValue(formData, "amount")),
    currency: getStringFormValue(formData, "currency"),
    zelleName: getStringFormValue(formData, "zelleName"),
    mobileMoneyPayerName: getStringFormValue(
      formData,
      "mobileMoneyPayerName",
    ),
  };
}

function fieldErrorsFromZodError(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const isUnknownField = issue.code === "unrecognized_keys";
    const path = isUnknownField
      ? "_form"
      : issue.path.map(String).join(".") || "_form";
    const message = isUnknownField ? UNKNOWN_FIELD_MESSAGE : issue.message;

    fieldErrors[path] ??= [];
    fieldErrors[path].push(message);
  }

  return fieldErrors;
}

function isTransactionConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

export async function executeCreateShipmentPaymentAction(
  previousState: CreateShipmentPaymentActionState,
  formData: FormData,
  dependencies: CreateShipmentPaymentActionDependencies = defaultDependencies,
): Promise<CreateShipmentPaymentActionState> {
  void previousState;

  const shipmentId = getStringFormValue(formData, "shipmentId")?.trim();

  if (!shipmentId) {
    return {
      status: "validation_error",
      message: MISSING_SHIPMENT_VALIDATION_MESSAGE,
      fieldErrors: { shipmentId: [MISSING_SHIPMENT_MESSAGE] },
    };
  }

  try {
    const payment = await dependencies.createShipmentPayment(
      shipmentId,
      paymentFromFormData(formData),
    );

    return {
      status: "success",
      message: SUCCESS_MESSAGE,
      payment: {
        id: payment.id,
        shipmentId: payment.shipmentId,
        method: payment.method,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        zelleName: payment.zelleName,
        mobileMoneyPayerName: payment.mobileMoneyPayerName,
        createdAt: payment.createdAt.toISOString(),
      },
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        status: "validation_error",
        message: VALIDATION_MESSAGE,
        fieldErrors: fieldErrorsFromZodError(error),
      };
    }

    if (error instanceof ShipmentNotFoundError) {
      return { status: "error", message: NOT_FOUND_MESSAGE };
    }

    if (error instanceof ShipmentPaymentNotAllowedError) {
      return { status: "error", message: NOT_ALLOWED_MESSAGE };
    }

    if (error instanceof ShipmentQuoteIncompleteError) {
      return { status: "error", message: INCOMPLETE_QUOTE_MESSAGE };
    }

    if (error instanceof ShipmentPaymentAmountMismatchError) {
      return { status: "error", message: AMOUNT_MISMATCH_MESSAGE };
    }

    if (error instanceof ShipmentPaymentCurrencyMismatchError) {
      return { status: "error", message: CURRENCY_MISMATCH_MESSAGE };
    }

    if (error instanceof ShipmentPendingPaymentAlreadyExistsError) {
      return { status: "error", message: PENDING_PAYMENT_EXISTS_MESSAGE };
    }

    if (isTransactionConflict(error)) {
      return { status: "error", message: TRANSACTION_CONFLICT_MESSAGE };
    }

    return { status: "error", message: GENERAL_ERROR_MESSAGE };
  }
}
