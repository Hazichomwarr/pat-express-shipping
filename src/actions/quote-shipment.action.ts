"use server";

import type { ShipmentQuoteCurrency, ShipmentStatus } from "@prisma/client";

import { executeProtectedQuoteShipmentAction } from "./quote-shipment.action-authorization";

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

export async function quoteShipmentAction(
  previousState: QuoteShipmentActionState,
  formData: FormData,
): Promise<QuoteShipmentActionState> {
  return executeProtectedQuoteShipmentAction(previousState, formData);
}
