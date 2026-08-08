import { ShipmentQuoteCurrency } from "@prisma/client";
import { z } from "zod";

const MAX_MEASURED_WEIGHT_KG = 9_999_999.999;
const MAX_MONEY_AMOUNT = 9_999_999_999.99;

export const shipmentQuotationInputSchema = z.strictObject(
  {
    measuredWeightKg: z
      .number({ error: "Veuillez saisir un poids valide." })
      .finite("Veuillez saisir un poids valide.")
      .positive("Le poids doit être supérieur à 0 kg.")
      .max(MAX_MEASURED_WEIGHT_KG, "Le poids dépasse la limite autorisée.")
      .multipleOf(
        0.001,
        "Le poids ne peut pas avoir plus de trois décimales.",
      ),
    ratePerKg: z
      .number({ error: "Veuillez saisir un tarif valide." })
      .finite("Veuillez saisir un tarif valide.")
      .positive("Le tarif par kilogramme doit être supérieur à 0.")
      .max(MAX_MONEY_AMOUNT, "Le tarif dépasse la limite autorisée.")
      .multipleOf(0.01, "Le tarif ne peut pas avoir plus de deux décimales."),
    quotedAmount: z
      .number({ error: "Veuillez saisir un montant valide." })
      .finite("Veuillez saisir un montant valide.")
      .positive("Le montant du devis doit être supérieur à 0.")
      .max(MAX_MONEY_AMOUNT, "Le montant dépasse la limite autorisée.")
      .multipleOf(
        0.01,
        "Le montant ne peut pas avoir plus de deux décimales.",
      ),
    quoteCurrency: z.enum(ShipmentQuoteCurrency, {
      error: "Choisissez une devise valide.",
    }),
  },
  { error: "Certaines informations du devis ne sont pas autorisées." },
);

export type ShipmentQuotationInput = z.infer<
  typeof shipmentQuotationInputSchema
>;
