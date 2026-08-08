import { ShipmentStatus } from "@prisma/client";

export type StaffShipmentListQuery = {
  search?: string;
  status?: ShipmentStatus;
};

const shipmentStatuses = new Set<ShipmentStatus>(
  Object.values(ShipmentStatus),
);

export function parseStaffShipmentStatus(
  value: unknown,
): ShipmentStatus | undefined {
  if (
    typeof value !== "string" ||
    !shipmentStatuses.has(value as ShipmentStatus)
  ) {
    return undefined;
  }

  return value as ShipmentStatus;
}

export function normalizeStaffShipmentSearch(
  value: unknown,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  return normalized || undefined;
}

export function parseStaffShipmentListQuery(input: {
  q?: unknown;
  status?: unknown;
}): StaffShipmentListQuery {
  return {
    search: normalizeStaffShipmentSearch(input.q),
    status: parseStaffShipmentStatus(input.status),
  };
}
