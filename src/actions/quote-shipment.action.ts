"use server";

import type { ShipmentQuoteCurrency, ShipmentStatus } from "@prisma/client";

import { executeQuoteShipmentAction } from "./quote-shipment.action-handler";

export type QuoteShipmentActionState =
  | { status: "idle" }
  | {
      status: "validation_error";
      message: string;
      fieldErrors: Record<string, string[]>;
    }
  | {
      status: "success";
      message: string;
      quotation: {
        shipmentId: string;
        trackingNumber: string;
        status: ShipmentStatus;
        measuredWeightKg: string;
        ratePerKg: string;
        quotedAmount: string;
        quoteCurrency: ShipmentQuoteCurrency;
        quotedAt: string;
      };
    }
  | { status: "error"; message: string };

// SECURITY: Wire this action only to an authenticated staff surface once staff authorization exists.
export async function quoteShipmentAction(
  previousState: QuoteShipmentActionState,
  formData: FormData,
): Promise<QuoteShipmentActionState> {
  return executeQuoteShipmentAction(previousState, formData);
}
