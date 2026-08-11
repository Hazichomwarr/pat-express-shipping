import assert from "node:assert/strict";
import test from "node:test";

import { ShipmentDirection, ShipmentStatus } from "@prisma/client";

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
  arrivedDestinationAt: new Date("2026-08-18T13:00:00.000Z"),
  readyForPickupAt: new Date("2026-08-19T13:00:00.000Z"),
  deliveredAt: new Date("2026-08-20T13:00:00.000Z"),
  cancelledAt: new Date("2026-08-09T13:00:00.000Z"),
};

function shipmentFixture(
  overrides: Partial<{
    trackingNumber: string;
    direction: ShipmentDirection;
    status: ShipmentStatus;
    createdAt: Date;
    packageReceivedAt: Date | null;
    quotedAt: Date | null;
    paymentConfirmedAt: Date | null;
    arrivedDestinationAt: Date | null;
    readyForPickupAt: Date | null;
    deliveredAt: Date | null;
    cancelledAt: Date | null;
  }> = {},
) {
  return {
    trackingNumber,
    direction: ShipmentDirection.US_TO_BF,
    status: ShipmentStatus.IN_TRANSIT,
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
        direction: true,
        status: true,
        createdAt: true,
        packageReceivedAt: true,
        quotedAt: true,
        paymentConfirmedAt: true,
        arrivedDestinationAt: true,
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

test("returns direction-neutral French status presentations for direction-neutral statuses", async () => {
  const expectedPresentations: Partial<
    Record<ShipmentStatus, { label: string; description: string }>
  > = {
    AWAITING_PACKAGE: {
      label: "En attente de réception du colis",
      description: "PatExpressShipping attend de recevoir votre colis.",
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
    CANCELLED: {
      label: "Annulé",
      description: "Cet envoi a été annulé.",
    },
  };

  for (const [status, expected] of Object.entries(expectedPresentations) as [
    ShipmentStatus,
    { label: string; description: string },
  ][]) {
    for (const direction of Object.values(ShipmentDirection)) {
      const { dependencies } = dependenciesReturning(
        shipmentFixture({ status, direction }),
      );
      const result = await getPublicShipmentTracking(
        trackingNumber,
        dependencies,
      );

      assert.equal(result.status, status);
      assert.equal(result.statusLabel, expected.label);
      assert.equal(result.statusDescription, expected.description);
    }
  }
});

test("varies PACKAGE_RECEIVED, IN_TRANSIT, and ARRIVED_DESTINATION presentation by direction", async () => {
  const expectedByDirection: Record<
    ShipmentDirection,
    Partial<Record<ShipmentStatus, { label: string; description: string }>>
  > = {
    US_TO_BF: {
      PACKAGE_RECEIVED: {
        label: "Colis reçu aux États-Unis",
        description: "Votre colis a bien été reçu aux États-Unis.",
      },
      IN_TRANSIT: {
        label: "En transit vers le Burkina Faso",
        description: "Votre colis est en route vers le Burkina Faso.",
      },
      ARRIVED_DESTINATION: {
        label: "Arrivé au Burkina Faso",
        description: "Votre colis est arrivé au Burkina Faso.",
      },
    },
    BF_TO_US: {
      PACKAGE_RECEIVED: {
        label: "Colis reçu au Burkina Faso",
        description: "Votre colis a bien été reçu au Burkina Faso.",
      },
      IN_TRANSIT: {
        label: "En transit vers les États-Unis",
        description: "Votre colis est en route vers les États-Unis.",
      },
      ARRIVED_DESTINATION: {
        label: "Arrivé aux États-Unis",
        description: "Votre colis est arrivé aux États-Unis.",
      },
    },
  };

  for (const direction of Object.values(ShipmentDirection)) {
    for (const [status, expected] of Object.entries(
      expectedByDirection[direction],
    ) as [ShipmentStatus, { label: string; description: string }][]) {
      const { dependencies } = dependenciesReturning(
        shipmentFixture({ status, direction }),
      );
      const result = await getPublicShipmentTracking(
        trackingNumber,
        dependencies,
      );

      assert.equal(result.statusLabel, expected.label);
      assert.equal(result.statusDescription, expected.description);
    }
  }
});

test("references the correct destination for READY_FOR_PICKUP and DELIVERED", async () => {
  const expectedByDirection: Record<
    ShipmentDirection,
    Partial<Record<ShipmentStatus, string>>
  > = {
    US_TO_BF: {
      READY_FOR_PICKUP: "Votre colis est prêt à être retiré au Burkina Faso.",
      DELIVERED: "Votre colis a été remis au Burkina Faso.",
    },
    BF_TO_US: {
      READY_FOR_PICKUP: "Votre colis est prêt à être retiré aux États-Unis.",
      DELIVERED: "Votre colis a été remis aux États-Unis.",
    },
  };

  for (const direction of Object.values(ShipmentDirection)) {
    for (const [status, expectedDescription] of Object.entries(
      expectedByDirection[direction],
    ) as [ShipmentStatus, string][]) {
      const { dependencies } = dependenciesReturning(
        shipmentFixture({ status, direction }),
      );
      const result = await getPublicShipmentTracking(
        trackingNumber,
        dependencies,
      );

      assert.equal(result.statusLabel, status === "DELIVERED" ? "Livré" : "Prêt pour le retrait");
      assert.equal(result.statusDescription, expectedDescription);
    }
  }
});

test("never mentions the same country for both directions of a geography-dependent status", async () => {
  for (const status of [
    "PACKAGE_RECEIVED",
    "IN_TRANSIT",
    "ARRIVED_DESTINATION",
    "READY_FOR_PICKUP",
    "DELIVERED",
  ] as const) {
    const { dependencies: usToBfDeps } = dependenciesReturning(
      shipmentFixture({ status, direction: ShipmentDirection.US_TO_BF }),
    );
    const { dependencies: bfToUsDeps } = dependenciesReturning(
      shipmentFixture({ status, direction: ShipmentDirection.BF_TO_US }),
    );
    const usToBfResult = await getPublicShipmentTracking(
      trackingNumber,
      usToBfDeps,
    );
    const bfToUsResult = await getPublicShipmentTracking(
      trackingNumber,
      bfToUsDeps,
    );

    const usToBfMentionsBurkina =
      usToBfResult.statusDescription.includes("Burkina Faso");
    const bfToUsMentionsBurkina =
      bfToUsResult.statusDescription.includes("Burkina Faso");

    assert.equal(
      usToBfMentionsBurkina && bfToUsMentionsBurkina,
      false,
      `${status} should not mention Burkina Faso for both directions`,
    );
  }
});

test("returns the persisted direction and its French route label", async () => {
  const expectedLabels: Record<ShipmentDirection, string> = {
    US_TO_BF: "États-Unis → Burkina Faso",
    BF_TO_US: "Burkina Faso → États-Unis",
  };

  for (const direction of Object.values(ShipmentDirection)) {
    const { dependencies } = dependenciesReturning(
      shipmentFixture({ direction }),
    );
    const result = await getPublicShipmentTracking(
      trackingNumber,
      dependencies,
    );

    assert.equal(result.direction, direction);
    assert.equal(result.directionLabel, expectedLabels[direction]);
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
  const { dependencies } = dependenciesReturning(
    shipmentFixture({ direction: ShipmentDirection.US_TO_BF }),
  );

  const result = await getPublicShipmentTracking(trackingNumber, dependencies);

  assert.deepEqual(result.milestones, [
    {
      key: "created",
      label: "Demande créée",
      occurredAt: milestoneDates.createdAt,
    },
    {
      key: "package_received",
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
      key: "arrived_destination",
      label: "Arrivé au Burkina Faso",
      occurredAt: milestoneDates.arrivedDestinationAt,
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

test("uses BF_TO_US wording for the package-received and arrival milestones", async () => {
  const { dependencies } = dependenciesReturning(
    shipmentFixture({ direction: ShipmentDirection.BF_TO_US }),
  );

  const result = await getPublicShipmentTracking(trackingNumber, dependencies);

  const packageReceivedMilestone = result.milestones.find(
    (milestone) => milestone.key === "package_received",
  );
  const arrivedMilestone = result.milestones.find(
    (milestone) => milestone.key === "arrived_destination",
  );

  assert.equal(packageReceivedMilestone?.label, "Colis reçu au Burkina Faso");
  assert.equal(arrivedMilestone?.label, "Arrivé aux États-Unis");
});

test("omits null milestones without fabricating transit or updated events", async () => {
  const { dependencies } = dependenciesReturning(
    shipmentFixture({
      packageReceivedAt: null,
      quotedAt: null,
      paymentConfirmedAt: null,
      arrivedDestinationAt: null,
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
    "direction",
    "directionLabel",
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
