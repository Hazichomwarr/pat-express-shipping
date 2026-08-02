import {
  ShipmentIntakeMethod,
  ShipmentItemCategory,
} from "@prisma/client";
import { z } from "zod";

const MAX_DECLARED_VALUE = 9_999_999_999.99;
const PHONE_PATTERN = /^[0-9 +().-]+$/;

const requiredNameSchema = z.string().trim().min(2).max(120);
const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(30)
  .regex(PHONE_PATTERN, "Phone numbers may contain only common formatting characters.");
const emailSchema = z.string().trim().toLowerCase().max(254).email();

function emptyStringToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

function optionalTrimmedText(maxLength: number) {
  return z.preprocess(
    emptyStringToUndefined,
    z.string().trim().max(maxLength).optional(),
  );
}

const optionalEmailSchema = z.preprocess(
  emptyStringToUndefined,
  emailSchema.optional(),
);

export const shipmentItemInputSchema = z.strictObject({
  description: z.string().trim().min(2).max(200),
  category: z.enum(ShipmentItemCategory),
  quantity: z.number().int().min(1).max(999),
  declaredValue: z
    .number()
    .finite()
    .min(0)
    .max(MAX_DECLARED_VALUE)
    .multipleOf(0.01)
    .optional(),
});

export const createShipmentRequestInputSchema = z.strictObject({
  intakeMethod: z.enum(ShipmentIntakeMethod),
  senderName: requiredNameSchema,
  senderPhone: phoneSchema,
  senderEmail: emailSchema,
  recipientName: requiredNameSchema,
  recipientPhone: phoneSchema,
  recipientEmail: optionalEmailSchema,
  recipientCity: z.string().trim().min(2).max(120),
  recipientNotes: optionalTrimmedText(500),
  customerNotes: optionalTrimmedText(1000),
  items: z.array(shipmentItemInputSchema).min(1).max(50),
});

export type ShipmentItemInput = z.infer<typeof shipmentItemInputSchema>;
export type CreateShipmentRequestInput = z.infer<
  typeof createShipmentRequestInputSchema
>;
