import { ZodError } from "zod";

import type { QuoteShipmentActionState } from "./quote-shipment.action";
import {
  quoteShipment,
  type QuoteShipmentResult,
  ShipmentNotFoundError,
  ShipmentQuotationAlreadyExistsError,
  ShipmentQuotationConflictError,
  ShipmentQuotationNotAllowedError,
} from "../services/shipment-quotation.service";

const SUCCESS_MESSAGE = "Le devis de l’envoi a bien été enregistré.";
const VALIDATION_MESSAGE = "Veuillez corriger les informations du devis.";
const MISSING_SHIPMENT_MESSAGE = "L’envoi à facturer est introuvable.";
const UNKNOWN_FIELD_MESSAGE =
  "Certaines informations du devis ne sont pas autorisées.";
const NOT_FOUND_MESSAGE = "Cet envoi est introuvable.";
const NOT_ALLOWED_MESSAGE =
  "Cet envoi ne peut pas être facturé dans son état actuel.";
const ALREADY_EXISTS_MESSAGE = "Un devis existe déjà pour cet envoi.";
const CONFLICT_MESSAGE =
  "Cet envoi a été modifié entre-temps. Actualisez la page avant de réessayer.";
const GENERAL_ERROR_MESSAGE =
  "Une erreur est survenue lors de l’enregistrement du devis. Veuillez réessayer.";

type QuoteShipment = (
  shipmentId: string,
  input: unknown,
) => Promise<QuoteShipmentResult>;

type QuoteShipmentActionDependencies = {
  quoteShipment: QuoteShipment;
};

const defaultDependencies: QuoteShipmentActionDependencies = {
  quoteShipment,
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

function quotationFromFormData(formData: FormData) {
  return {
    measuredWeightKg: numberFromFormValue(
      getStringFormValue(formData, "measuredWeightKg"),
    ),
    ratePerKg: numberFromFormValue(getStringFormValue(formData, "ratePerKg")),
    quotedAmount: numberFromFormValue(
      getStringFormValue(formData, "quotedAmount"),
    ),
    quoteCurrency: getStringFormValue(formData, "quoteCurrency"),
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

export async function executeQuoteShipmentAction(
  previousState: QuoteShipmentActionState,
  formData: FormData,
  dependencies: QuoteShipmentActionDependencies = defaultDependencies,
): Promise<QuoteShipmentActionState> {
  void previousState;

  const shipmentId = getStringFormValue(formData, "shipmentId")?.trim();

  if (!shipmentId) {
    return {
      status: "validation_error",
      message: VALIDATION_MESSAGE,
      fieldErrors: { shipmentId: [MISSING_SHIPMENT_MESSAGE] },
    };
  }

  try {
    const quotation = await dependencies.quoteShipment(
      shipmentId,
      quotationFromFormData(formData),
    );

    return {
      status: "success",
      message: SUCCESS_MESSAGE,
      quotation: {
        shipmentId: quotation.id,
        trackingNumber: quotation.trackingNumber,
        status: quotation.status,
        measuredWeightKg: quotation.measuredWeightKg,
        ratePerKg: quotation.ratePerKg,
        quotedAmount: quotation.quotedAmount,
        quoteCurrency: quotation.quoteCurrency,
        quotedAt: quotation.quotedAt.toISOString(),
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

    if (error instanceof ShipmentQuotationNotAllowedError) {
      return { status: "error", message: NOT_ALLOWED_MESSAGE };
    }

    if (error instanceof ShipmentQuotationAlreadyExistsError) {
      return { status: "error", message: ALREADY_EXISTS_MESSAGE };
    }

    if (error instanceof ShipmentQuotationConflictError) {
      return { status: "error", message: CONFLICT_MESSAGE };
    }

    return { status: "error", message: GENERAL_ERROR_MESSAGE };
  }
}
