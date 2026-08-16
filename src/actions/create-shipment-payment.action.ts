"use server";

import type {
  ShipmentPaymentMethod,
  ShipmentPaymentStatus,
  ShipmentQuoteCurrency,
} from "@prisma/client";

import { executeProtectedCreateShipmentPaymentAction } from "./create-shipment-payment.action-authorization";

export type CreateShipmentPaymentActionState =
  | { status: "idle" }
  | {
      status: "validation_error";
      message: string;
      fieldErrors: Record<string, string[]>;
    }
  | {
      status: "success";
      message: string;
      payment: {
        id: string;
        shipmentId: string;
        method: ShipmentPaymentMethod;
        status: ShipmentPaymentStatus;
        amount: string;
        currency: ShipmentQuoteCurrency;
        zelleName: string | null;
        mobileMoneyPayerName: string | null;
        createdAt: string;
      };
    }
  | { status: "error"; message: string };

export async function createShipmentPaymentAction(
  previousState: CreateShipmentPaymentActionState,
  formData: FormData,
): Promise<CreateShipmentPaymentActionState> {
  return executeProtectedCreateShipmentPaymentAction(previousState, formData);
}
