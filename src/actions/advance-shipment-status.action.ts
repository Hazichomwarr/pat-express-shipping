"use server";

import type { ShipmentStatus } from "@prisma/client";

import { executeProtectedAdvanceShipmentStatusAction } from "./advance-shipment-status.action-authorization";

export type AdvanceShipmentStatusActionState =
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
        previousStatus: ShipmentStatus;
        status: ShipmentStatus;
        milestoneAt: string | null;
      };
    }
  | { status: "error"; message: string };

export async function advanceShipmentStatusAction(
  previousState: AdvanceShipmentStatusActionState,
  formData: FormData,
): Promise<AdvanceShipmentStatusActionState> {
  return executeProtectedAdvanceShipmentStatusAction(previousState, formData);
}
