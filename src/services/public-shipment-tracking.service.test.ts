import assert from "node:assert/strict";
import test from "node:test";

import { ShipmentStatus } from "@prisma/client";

import { isShipmentTrackingNumber } from "./_shared/shipment-tracking-number";
import {
  getPublicShipmentTracking,
  InvalidShipmentTrackingNumberError,
  PublicShipmentNotFoundError,
} from "./public-shipment-tracking.service";

const trackingNumber = "PAT-2026-7K9M2QWX";

const milestoneDates = {
  createdAt: new Date("2026-08-08T13:00:00.000Z"),
  packageReceivedAt: new Date("2026-08-12T13:00:00.000Z"),
  quotedAt: new Date("2026-08-11T13:00:00.000Z"),
  paymentConfirmedAt: new Date("2026-08-13T13:00:00.000Z"),
  arrivedBfAt: new Date("2026-08-18T13:00:00.000Z"),
  readyForPickupAt: new Date("2026-08-19T13:00:00.000Z"),
  deliveredAt: new Date("2026-08-20T13:00:00.000Z"),
  cancelledAt: new Date("2026-08-09T13:00:00.000Z"),
};

function shipmentFixture(
  overrides: Partial<{
    trackingNumber: string;
    status: ShipmentStatus;
    createdAt: Date;
    packageReceivedAt: Date | null;
    quotedAt: Date | null;
    paymentConfirmedAt: Date | null;
    arrivedBfAt: Date | null;
    readyForPickupAt: Date | null;
    deliveredAt: Date | null;
    cancelledAt: Date | null;
  }> = {},
) {
  return {
    trackingNumber,
    status: ShipmentStatus.IN_TRANSIT_TO_BF,
    ...milestoneDates,
    ...overrides,
  };
}

function dependenciesReturning(shipment: ReturnType<typeof shipmentFixture> | null) {
  const lookups: unknown[] = [];

  return {
    lookups,
    dependencies: {
      findShipmentByTrackingNumber: async (lookup: unknown) => {
        lookups.push(lookup);
        return shipment;
      },
    },
  };
}

test("normalizes a valid tracking number and performs a focused lookup", async () => {
  const { lookups, dependencies } = dependenciesReturning(shipmentFixture());

  const result = await getPublicShipmentTracking(
    `  ${trackingNumber}  `,
    dependencies,
  );

  assert.equal(result.trackingNumber, trackingNumber);
  assert.deepEqual(lookups, [
    {
      where: { trackingNumber },
      select: {
        trackingNumber: true,
        status: true,
        createdAt: true,
        packageReceivedAt: true,
        quotedAt: true,
        paymentConfirmedAt: true,
        arrivedBfAt: true,
        readyForPickupAt: true,
        deliveredAt: true,
        cancelledAt: true,
      },
    },
  ]);
});

test("rejects non-string, empty, lowercase, and malformed tracking input before lookup", async () => {
  const invalidValues = [
    undefined,
    null,
    123,
    {},
    [],
    "",
    "   ",
    "pat-2026-7K9M2QWX",
    "PAT-26-7K9M2QWX",
    "PAT-2026-7K9M2QW",
    "PAT-2026-7K9M2QW!",
    "PAT-2026-ABCDEFGI",
  ];

  for (const invalidValue of invalidValues) {
    let lookupCalled = false;

    await assert.rejects(
      getPublicShipmentTracking(invalidValue, {
        findShipmentByTrackingNumber: async () => {
          lookupCalled = true;
          return shipmentFixture();
        },
      }),
      InvalidShipmentTrackingNumberError,
    );
    assert.equal(lookupCalled, false);
  }
});

test("follows the existing tracking-number helper's canonical alphabet", async () => {
  const ambiguousSuffix = "PAT-2026-ABCDEFGI";

  assert.equal(isShipmentTrackingNumber(ambiguousSuffix), false);
  await assert.rejects(
    getPublicShipmentTracking(ambiguousSuffix, {
      findShipmentByTrackingNumber: async () => shipmentFixture(),
    }),
    InvalidShipmentTrackingNumberError,
  );
});

test("throws a public not-found error for a valid unknown tracking number", async () => {
  const { dependencies } = dependenciesReturning(null);

  await assert.rejects(
    getPublicShipmentTracking(trackingNumber, dependencies),
    PublicShipmentNotFoundError,
  );
});

test("rethrows unrelated database errors", async () => {
  const databaseError = new Error("database unavailable");

  await assert.rejects(
    getPublicShipmentTracking(trackingNumber, {
      findShipmentByTrackingNumber: async () => {
        throw databaseError;
      },
    }),
    (error) => error === databaseError,
  );
});

test("returns customer-facing French status presentations for every status", async () => {
  const expectedPresentations: Record<
    ShipmentStatus,
    { label: string; description: string }
  > = {
    AWAITING_PACKAGE: {
      label: "En attente de réception du colis",
      description: "PatExpressShipping attend de recevoir votre colis.",
    },
    PACKAGE_RECEIVED_US: {
      label: "Colis reçu aux États-Unis",
      description: "Votre colis a bien été reçu aux États-Unis.",
    },
    AWAITING_QUOTE: {
      label: "Préparation du devis",
      description:
        "Votre colis est en cours de pesée et de préparation du devis.",
    },
    AWAITING_PAYMENT: {
      label: "En attente de paiement",
      description:
        "Le devis a été établi et l’envoi est en attente de paiement.",
    },
    PAYMENT_CONFIRMED: {
      label: "Paiement confirmé",
      description:
        "Le paiement a été confirmé. L’envoi peut poursuivre son traitement.",
    },
    IN_TRANSIT_TO_BF: {
      label: "En transit vers le Burkina Faso",
      description: "Votre colis est en route vers le Burkina Faso.",
    },
    ARRIVED_BF: {
      label: "Arrivé au Burkina Faso",
      description: "Votre colis est arrivé au Burkina Faso.",
    },
    READY_FOR_PICKUP: {
      label: "Prêt pour le retrait",
      description: "Votre colis est prêt à être retiré.",
    },
    DELIVERED: {
      label: "Livré",
      description: "Votre colis a été remis au destinataire.",
    },
    CANCELLED: {
      label: "Annulé",
      description: "Cet envoi a été annulé.",
    },
  };

  for (const status of Object.values(ShipmentStatus)) {
    const { dependencies } = dependenciesReturning(
      shipmentFixture({ status }),
    );
    const result = await getPublicShipmentTracking(
      trackingNumber,
      dependencies,
    );

    assert.equal(result.status, status);
    assert.equal(result.statusLabel, expectedPresentations[status].label);
    assert.equal(
      result.statusDescription,
      expectedPresentations[status].description,
    );
  }
});

test("uses the shipment terminal policy for active, delivered, and cancelled states", async () => {
  for (const status of Object.values(ShipmentStatus)) {
    const { dependencies } = dependenciesReturning(
      shipmentFixture({ status }),
    );
    const result = await getPublicShipmentTracking(
      trackingNumber,
      dependencies,
    );

    assert.equal(
      result.isTerminal,
      status === ShipmentStatus.DELIVERED || status === ShipmentStatus.CANCELLED,
    );
  }
});

test("builds milestones from persisted dates in deterministic business order", async () => {
  const { dependencies } = dependenciesReturning(shipmentFixture());

  const result = await getPublicShipmentTracking(trackingNumber, dependencies);

  assert.deepEqual(result.milestones, [
    {
      key: "created",
      label: "Demande créée",
      occurredAt: milestoneDates.createdAt,
    },
    {
      key: "package_received_us",
      label: "Colis reçu aux États-Unis",
      occurredAt: milestoneDates.packageReceivedAt,
    },
    {
      key: "quoted",
      label: "Devis établi",
      occurredAt: milestoneDates.quotedAt,
    },
    {
      key: "payment_confirmed",
      label: "Paiement confirmé",
      occurredAt: milestoneDates.paymentConfirmedAt,
    },
    {
      key: "arrived_bf",
      label: "Arrivé au Burkina Faso",
      occurredAt: milestoneDates.arrivedBfAt,
    },
    {
      key: "ready_for_pickup",
      label: "Prêt pour le retrait",
      occurredAt: milestoneDates.readyForPickupAt,
    },
    {
      key: "delivered",
      label: "Livré",
      occurredAt: milestoneDates.deliveredAt,
    },
    {
      key: "cancelled",
      label: "Envoi annulé",
      occurredAt: milestoneDates.cancelledAt,
    },
  ]);
});

test("omits null milestones without fabricating transit or updated events", async () => {
  const { dependencies } = dependenciesReturning(
    shipmentFixture({
      packageReceivedAt: null,
      quotedAt: null,
      paymentConfirmedAt: null,
      arrivedBfAt: null,
      readyForPickupAt: null,
      deliveredAt: null,
      cancelledAt: null,
    }),
  );

  const result = await getPublicShipmentTracking(trackingNumber, dependencies);

  assert.deepEqual(result.milestones, [
    {
      key: "created",
      label: "Demande créée",
      occurredAt: milestoneDates.createdAt,
    },
  ]);
  assert.equal(
    result.milestones.some((milestone) => milestone.key.includes("transit")),
    false,
  );
  assert.equal(
    result.milestones.some((milestone) => milestone.key.includes("updated")),
    false,
  );
});

test("returns only the approved public tracking shape", async () => {
  const privateShipment = {
    ...shipmentFixture(),
    id: "private-database-id",
    senderName: "Private Sender",
    senderEmail: "private@example.com",
    recipientName: "Private Recipient",
    recipientPhone: "+1 555 0100",
    customerNotes: "Private customer note",
    internalNotes: "Private staff note",
    quotedAmount: "120.00",
    payments: [{ amount: "120.00", method: "ZELLE" }],
    confirmedByStaffId: "private-staff-id",
    updatedAt: new Date("2026-08-21T13:00:00.000Z"),
  };
  const { dependencies } = dependenciesReturning(privateShipment);

  const result = await getPublicShipmentTracking(trackingNumber, dependencies);

  assert.deepEqual(Object.keys(result).sort(), [
    "isTerminal",
    "milestones",
    "status",
    "statusDescription",
    "statusLabel",
    "trackingNumber",
  ]);

  const serializedResult = JSON.stringify(result);
  for (const privateValue of [
    "private-database-id",
    "Private Sender",
    "private@example.com",
    "Private Recipient",
    "+1 555 0100",
    "Private customer note",
    "Private staff note",
    "120.00",
    "ZELLE",
    "private-staff-id",
    "2026-08-21T13:00:00.000Z",
  ]) {
    assert.equal(serializedResult.includes(privateValue), false);
  }
});
