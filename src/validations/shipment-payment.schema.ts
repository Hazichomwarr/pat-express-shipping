import {
  ShipmentPaymentMethod,
  ShipmentQuoteCurrency,
} from "@prisma/client";
import { z } from "zod";

const MAX_PAYMENT_AMOUNT = 9_999_999_999.99;
const MAX_PAYER_NAME_LENGTH = 120;

const ZELLE_NAME_REQUIRED =
  "Indiquez le nom utilisé pour le paiement Zelle.";
const ZELLE_NAME_TOO_SHORT =
  "Le nom Zelle doit contenir au moins 2 caractères.";
const ZELLE_NAME_TOO_LONG =
  "Le nom Zelle ne peut pas dépasser 120 caractères.";
const CASH_ZELLE_NAME_FORBIDDEN =
  "Le nom Zelle ne doit pas être renseigné pour un paiement en espèces.";
const ORANGE_MONEY_PAYER_NAME_REQUIRED =
  "Veuillez indiquer le nom associé au paiement Orange Money.";
const ORANGE_MONEY_PAYER_NAME_TOO_SHORT =
  "Le nom Orange Money doit contenir au moins 2 caractères.";
const ORANGE_MONEY_PAYER_NAME_TOO_LONG =
  "Le nom Orange Money ne peut pas dépasser 120 caractères.";
const ZELLE_MOBILE_MONEY_PAYER_NAME_FORBIDDEN =
  "Le nom Orange Money ne doit pas être renseigné pour un paiement Zelle.";
const CASH_MOBILE_MONEY_PAYER_NAME_FORBIDDEN =
  "Le nom Orange Money ne doit pas être renseigné pour un paiement en espèces.";
const ORANGE_MONEY_ZELLE_NAME_FORBIDDEN =
  "Le nom Zelle ne doit pas être renseigné pour un paiement Orange Money.";

function emptyStringToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

const optionalZelleNameSchema = z.preprocess(
  emptyStringToUndefined,
  z.string({ error: ZELLE_NAME_REQUIRED }).trim().optional(),
);

const optionalMobileMoneyPayerNameSchema = z.preprocess(
  emptyStringToUndefined,
  z.string({ error: ORANGE_MONEY_PAYER_NAME_REQUIRED }).trim().optional(),
);

export const shipmentPaymentInputSchema = z
  .strictObject(
    {
      method: z.enum(ShipmentPaymentMethod, {
        error: "Choisissez un mode de paiement valide.",
      }),
      amount: z
        .number({ error: "Veuillez saisir un montant valide." })
        .finite("Veuillez saisir un montant valide.")
        .positive("Le montant du paiement doit être supérieur à 0.")
        .max(MAX_PAYMENT_AMOUNT, "Le montant dépasse la limite autorisée.")
        .multipleOf(
          0.01,
          "Le montant ne peut pas avoir plus de deux décimales.",
        ),
      currency: z.enum(ShipmentQuoteCurrency, {
        error: "Choisissez une devise valide.",
      }),
      zelleName: optionalZelleNameSchema,
      mobileMoneyPayerName: optionalMobileMoneyPayerNameSchema,
    },
    { error: "Certaines informations du paiement ne sont pas autorisées." },
  )
  .superRefine((payment, context) => {
    if (payment.method === ShipmentPaymentMethod.ZELLE) {
      if (!payment.zelleName) {
        context.addIssue({
          code: "custom",
          path: ["zelleName"],
          message: ZELLE_NAME_REQUIRED,
        });
      } else if (payment.zelleName.length < 2) {
        context.addIssue({
          code: "custom",
          path: ["zelleName"],
          message: ZELLE_NAME_TOO_SHORT,
        });
      } else if (payment.zelleName.length > MAX_PAYER_NAME_LENGTH) {
        context.addIssue({
          code: "custom",
          path: ["zelleName"],
          message: ZELLE_NAME_TOO_LONG,
        });
      }

      if (payment.mobileMoneyPayerName !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["mobileMoneyPayerName"],
          message: ZELLE_MOBILE_MONEY_PAYER_NAME_FORBIDDEN,
        });
      }

      return;
    }

    if (payment.method === ShipmentPaymentMethod.ORANGE_MONEY) {
      if (!payment.mobileMoneyPayerName) {
        context.addIssue({
          code: "custom",
          path: ["mobileMoneyPayerName"],
          message: ORANGE_MONEY_PAYER_NAME_REQUIRED,
        });
      } else if (payment.mobileMoneyPayerName.length < 2) {
        context.addIssue({
          code: "custom",
          path: ["mobileMoneyPayerName"],
          message: ORANGE_MONEY_PAYER_NAME_TOO_SHORT,
        });
      } else if (
        payment.mobileMoneyPayerName.length > MAX_PAYER_NAME_LENGTH
      ) {
        context.addIssue({
          code: "custom",
          path: ["mobileMoneyPayerName"],
          message: ORANGE_MONEY_PAYER_NAME_TOO_LONG,
        });
      }

      if (payment.zelleName !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["zelleName"],
          message: ORANGE_MONEY_ZELLE_NAME_FORBIDDEN,
        });
      }

      return;
    }

    if (payment.zelleName !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["zelleName"],
        message: CASH_ZELLE_NAME_FORBIDDEN,
      });
    }

    if (payment.mobileMoneyPayerName !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["mobileMoneyPayerName"],
        message: CASH_MOBILE_MONEY_PAYER_NAME_FORBIDDEN,
      });
    }
  });

export type ShipmentPaymentInput = z.infer<
  typeof shipmentPaymentInputSchema
>;
