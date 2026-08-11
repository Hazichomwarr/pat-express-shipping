"use server";

import type { ShipmentStatus } from "@prisma/client";
import { ZodError } from "zod";

import {
  createGuestShipmentRequest,
  type CreateGuestShipmentRequestResult,
  ShipmentTrackingNumberGenerationError,
} from "../services/shipment-request.service";

const SUCCESS_MESSAGE = "Votre demande d’envoi a bien été créée.";
const VALIDATION_MESSAGE = "Veuillez corriger les informations indiquées.";
const UNKNOWN_FIELD_MESSAGE =
  "Certaines informations envoyées ne sont pas autorisées.";
const TRACKING_NUMBER_ERROR_MESSAGE =
  "Impossible de générer un numéro de suivi pour le moment. Veuillez réessayer.";
const GENERAL_ERROR_MESSAGE =
  "Une erreur est survenue lors de la création de l’envoi. Veuillez réessayer.";

const ITEM_FIELD_PATTERN =
  /^items\.(\d+)\.(description|category|quantity|declaredValue)$/;

export type CreateShipmentRequestActionState =
  | { status: "idle" }
  | {
      status: "validation_error";
      message: string;
      fieldErrors: Record<string, string[]>;
    }
  | {
      status: "success";
      message: string;
      shipment: {
        id: string;
        trackingNumber: string;
        status: ShipmentStatus;
        createdAt: string;
      };
    }
  | { status: "error"; message: string };

type CreateShipmentRequest = (
  input: unknown,
) => Promise<CreateGuestShipmentRequestResult>;

type CreateShipmentRequestActionDependencies = {
  createShipmentRequest: CreateShipmentRequest;
};

const defaultDependencies: CreateShipmentRequestActionDependencies = {
  createShipmentRequest: createGuestShipmentRequest,
};

function getFormValue(formData: FormData, name: string): unknown {
  const value = formData.get(name);

  return typeof value === "string" ? value : undefined;
}

function requiredNumberFromForm(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim() === "" ? Number.NaN : Number(value);
}

function optionalNumberFromForm(value: unknown): unknown {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  return Number(value);
}

function getItemIndexes(formData: FormData): string[] {
  const indexes = new Map<number, string>();

  for (const [name] of formData.entries()) {
    const match = ITEM_FIELD_PATTERN.exec(name);

    if (!match) {
      continue;
    }

    const numericIndex = Number(match[1]);

    if (Number.isSafeInteger(numericIndex) && !indexes.has(numericIndex)) {
      indexes.set(numericIndex, match[1]);
    }
  }

  return [...indexes.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, originalIndex]) => originalIndex);
}

function shipmentRequestFromFormData(formData: FormData) {
  const items = getItemIndexes(formData).map((index) => {
    const prefix = `items.${index}`;

    return {
      description: getFormValue(formData, `${prefix}.description`),
      category: getFormValue(formData, `${prefix}.category`),
      quantity: requiredNumberFromForm(
        getFormValue(formData, `${prefix}.quantity`),
      ),
      declaredValue: optionalNumberFromForm(
        getFormValue(formData, `${prefix}.declaredValue`),
      ),
    };
  });

  return {
    direction: getFormValue(formData, "direction"),
    intakeMethod: getFormValue(formData, "intakeMethod"),
    senderName: getFormValue(formData, "senderName"),
    senderPhone: getFormValue(formData, "senderPhone"),
    senderEmail: getFormValue(formData, "senderEmail"),
    recipientName: getFormValue(formData, "recipientName"),
    recipientPhone: getFormValue(formData, "recipientPhone"),
    recipientEmail: getFormValue(formData, "recipientEmail"),
    recipientCity: getFormValue(formData, "recipientCity"),
    recipientNotes: getFormValue(formData, "recipientNotes"),
    customerNotes: getFormValue(formData, "customerNotes"),
    items,
  };
}

function fieldErrorsFromZodError(
  error: ZodError,
): Record<string, string[]> {
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

export async function createShipmentRequestAction(
  previousState: CreateShipmentRequestActionState,
  formData: FormData,
  dependencies: CreateShipmentRequestActionDependencies = defaultDependencies,
): Promise<CreateShipmentRequestActionState> {
  void previousState;

  try {
    const shipment = await dependencies.createShipmentRequest(
      shipmentRequestFromFormData(formData),
    );

    return {
      status: "success",
      message: SUCCESS_MESSAGE,
      shipment: {
        id: shipment.id,
        trackingNumber: shipment.trackingNumber,
        status: shipment.status,
        createdAt: shipment.createdAt.toISOString(),
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

    if (error instanceof ShipmentTrackingNumberGenerationError) {
      return { status: "error", message: TRACKING_NUMBER_ERROR_MESSAGE };
    }

    return { status: "error", message: GENERAL_ERROR_MESSAGE };
  }
}
