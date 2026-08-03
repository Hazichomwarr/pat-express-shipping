import {
  ShipmentIntakeMethod,
  ShipmentItemCategory,
} from "@prisma/client";
import { z } from "zod";

const MAX_DECLARED_VALUE = 9_999_999_999.99;
const PHONE_PATTERN = /^[0-9 +().-]+$/;

const NAME_TOO_SHORT = "Le nom doit contenir au moins 2 caractères.";
const NAME_TOO_LONG = "Le nom ne peut pas dépasser 120 caractères.";
const PHONE_TOO_SHORT =
  "Le numéro de téléphone doit contenir au moins 7 caractères.";
const PHONE_TOO_LONG =
  "Le numéro de téléphone ne peut pas dépasser 30 caractères.";
const PHONE_INVALID_CHARACTERS =
  "Le numéro de téléphone contient des caractères non autorisés.";
const EMAIL_INVALID = "Veuillez saisir une adresse e-mail valide.";
const EMAIL_TOO_LONG = "L’adresse e-mail ne peut pas dépasser 254 caractères.";

const requiredNameSchema = z
  .string({ error: NAME_TOO_SHORT })
  .trim()
  .min(2, NAME_TOO_SHORT)
  .max(120, NAME_TOO_LONG);
const phoneSchema = z
  .string({ error: PHONE_TOO_SHORT })
  .trim()
  .min(7, PHONE_TOO_SHORT)
  .max(30, PHONE_TOO_LONG)
  .regex(PHONE_PATTERN, PHONE_INVALID_CHARACTERS);
const emailSchema = z
  .string({ error: EMAIL_INVALID })
  .trim()
  .toLowerCase()
  .max(254, EMAIL_TOO_LONG)
  .email(EMAIL_INVALID);

function emptyStringToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

function optionalTrimmedText(maxLength: number, tooLongMessage: string) {
  return z.preprocess(
    emptyStringToUndefined,
    z
      .string({ error: "Veuillez saisir un texte valide." })
      .trim()
      .max(maxLength, tooLongMessage)
      .optional(),
  );
}

const optionalEmailSchema = z.preprocess(
  emptyStringToUndefined,
  emailSchema.optional(),
);

export const shipmentItemInputSchema = z.strictObject(
  {
    description: z
      .string({
        error: "La description doit contenir au moins 2 caractères.",
      })
      .trim()
      .min(2, "La description doit contenir au moins 2 caractères.")
      .max(200, "La description ne peut pas dépasser 200 caractères."),
    category: z.enum(ShipmentItemCategory, {
      error: "Choisissez une catégorie d’article valide.",
    }),
    quantity: z
      .number({ error: "Veuillez saisir une quantité valide." })
      .int("La quantité doit être un nombre entier.")
      .min(1, "La quantité doit être au moins égale à 1.")
      .max(999, "La quantité ne peut pas dépasser 999."),
    declaredValue: z
      .number({ error: "Veuillez saisir une valeur déclarée valide." })
      .finite("Veuillez saisir une valeur déclarée valide.")
      .min(0, "La valeur déclarée ne peut pas être négative.")
      .max(
        MAX_DECLARED_VALUE,
        "La valeur déclarée dépasse la limite autorisée.",
      )
      .multipleOf(
        0.01,
        "La valeur déclarée ne peut pas avoir plus de deux décimales.",
      )
      .optional(),
  },
  { error: "Certaines informations de l’article ne sont pas autorisées." },
);

export const createShipmentRequestInputSchema = z.strictObject(
  {
    intakeMethod: z.enum(ShipmentIntakeMethod, {
      error: "Choisissez un mode de dépôt valide.",
    }),
    senderName: requiredNameSchema,
    senderPhone: phoneSchema,
    senderEmail: emailSchema,
    recipientName: requiredNameSchema,
    recipientPhone: phoneSchema,
    recipientEmail: optionalEmailSchema,
    recipientCity: z
      .string({ error: "La ville doit contenir au moins 2 caractères." })
      .trim()
      .min(2, "La ville doit contenir au moins 2 caractères.")
      .max(120, "La ville ne peut pas dépasser 120 caractères."),
    recipientNotes: optionalTrimmedText(
      500,
      "Les notes pour le destinataire ne peuvent pas dépasser 500 caractères.",
    ),
    customerNotes: optionalTrimmedText(
      1000,
      "Les notes concernant l’envoi ne peuvent pas dépasser 1 000 caractères.",
    ),
    items: z
      .array(shipmentItemInputSchema, {
        error: "Ajoutez au moins un article à l’envoi.",
      })
      .min(1, "Ajoutez au moins un article à l’envoi.")
      .max(50, "Un envoi ne peut pas contenir plus de 50 articles."),
  },
  { error: "Certaines informations envoyées ne sont pas autorisées." },
);

export type ShipmentItemInput = z.infer<typeof shipmentItemInputSchema>;
export type CreateShipmentRequestInput = z.infer<
  typeof createShipmentRequestInputSchema
>;
