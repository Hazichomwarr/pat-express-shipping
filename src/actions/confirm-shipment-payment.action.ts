"use server";

import type {
  ShipmentPaymentMethod,
  ShipmentPaymentStatus,
  ShipmentQuoteCurrency,
  ShipmentStatus,
} from "@prisma/client";

import { executeProtectedConfirmShipmentPaymentAction } from "./confirm-shipment-payment.action-authorization";

export type ConfirmShipmentPaymentActionState =
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
        confirmedAt: string;
        confirmedByStaffId: string;
      };
      shipment: {
        id: string;
        trackingNumber: string;
        status: ShipmentStatus;
        paymentConfirmedAt: string;
      };
    }
  | { status: "error"; message: string };

export async function confirmShipmentPaymentAction(
  previousState: ConfirmShipmentPaymentActionState,
  formData: FormData,
): Promise<ConfirmShipmentPaymentActionState> {
  return executeProtectedConfirmShipmentPaymentAction(previousState, formData);
}
