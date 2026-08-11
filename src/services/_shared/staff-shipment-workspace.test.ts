import assert from "node:assert/strict";
import test from "node:test";

import { ShipmentDirection, ShipmentStatus } from "@prisma/client";

import {
  getShipmentQuoteState,
  getStaffShipmentStatusActionPresentation,
  getStaffShipmentWorkspaceAction,
} from "./staff-shipment-workspace";

test("maps the direction-neutral operational statuses to their contextual next steps", () => {
  const expected = [
    [
      ShipmentStatus.PACKAGE_RECEIVED,
      ShipmentStatus.AWAITING_QUOTE,
      "Mettre en attente de devis",
    ],
    [
      ShipmentStatus.ARRIVED_DESTINATION,
      ShipmentStatus.READY_FOR_PICKUP,
      "Marquer prêt pour le retrait",
    ],
    [
      ShipmentStatus.READY_FOR_PICKUP,
      ShipmentStatus.DELIVERED,
      "Marquer comme livré",
    ],
  ] as const;

  for (const [from, to, label] of expected) {
    for (const direction of Object.values(ShipmentDirection)) {
      const presentation = getStaffShipmentStatusActionPresentation(
        from,
        direction,
      );
      assert.equal(presentation?.toStatus, to);
      assert.equal(presentation?.label, label);
    }
  }
});

test("varies AWAITING_PACKAGE description by direction while keeping a generic label", () => {
  const expected = {
    US_TO_BF: "Confirme que le colis a été physiquement reçu aux États-Unis.",
    BF_TO_US: "Confirme que le colis a été physiquement reçu au Burkina Faso.",
  } satisfies Record<ShipmentDirection, string>;

  for (const direction of Object.values(ShipmentDirection)) {
    const presentation = getStaffShipmentStatusActionPresentation(
      ShipmentStatus.AWAITING_PACKAGE,
      direction,
    );
    assert.equal(presentation?.toStatus, ShipmentStatus.PACKAGE_RECEIVED);
    assert.equal(presentation?.label, "Réceptionner le colis");
    assert.equal(presentation?.description, expected[direction]);
  }
});

test("PAYMENT_CONFIRMED references the correct destination for both directions", () => {
  const usToBf = getStaffShipmentStatusActionPresentation(
    ShipmentStatus.PAYMENT_CONFIRMED,
    ShipmentDirection.US_TO_BF,
  );
  assert.equal(usToBf?.toStatus, ShipmentStatus.IN_TRANSIT);
  assert.equal(usToBf?.label, "Marquer en transit vers le Burkina Faso");
  assert.match(usToBf?.description ?? "", /Burkina Faso/);

  const bfToUs = getStaffShipmentStatusActionPresentation(
    ShipmentStatus.PAYMENT_CONFIRMED,
    ShipmentDirection.BF_TO_US,
  );
  assert.equal(bfToUs?.toStatus, ShipmentStatus.IN_TRANSIT);
  assert.equal(bfToUs?.label, "Marquer en transit vers les États-Unis");
  assert.match(bfToUs?.description ?? "", /États-Unis/);
});

test("IN_TRANSIT references the correct destination for both directions", () => {
  const usToBf = getStaffShipmentStatusActionPresentation(
    ShipmentStatus.IN_TRANSIT,
    ShipmentDirection.US_TO_BF,
  );
  assert.equal(usToBf?.toStatus, ShipmentStatus.ARRIVED_DESTINATION);
  assert.equal(usToBf?.label, "Marquer arrivé au Burkina Faso");
  assert.match(usToBf?.description ?? "", /Burkina Faso/);

  const bfToUs = getStaffShipmentStatusActionPresentation(
    ShipmentStatus.IN_TRANSIT,
    ShipmentDirection.BF_TO_US,
  );
  assert.equal(bfToUs?.toStatus, ShipmentStatus.ARRIVED_DESTINATION);
  assert.equal(bfToUs?.label, "Marquer arrivé aux États-Unis");
  assert.match(bfToUs?.description ?? "", /États-Unis/);
});

test("requires explicit UI confirmation before delivery, for both directions", () => {
  for (const direction of Object.values(ShipmentDirection)) {
    assert.equal(
      getStaffShipmentStatusActionPresentation(
        ShipmentStatus.READY_FOR_PICKUP,
        direction,
      )?.requiresConfirmation,
      true,
    );
  }
});

test("specialized and terminal states have no generic operational mutation", () => {
  for (const status of [
    ShipmentStatus.AWAITING_QUOTE,
    ShipmentStatus.AWAITING_PAYMENT,
    ShipmentStatus.DELIVERED,
    ShipmentStatus.CANCELLED,
  ]) {
    for (const direction of Object.values(ShipmentDirection)) {
      assert.equal(
        getStaffShipmentStatusActionPresentation(status, direction),
        null,
      );
    }
  }
});

test("points awaiting-quote shipments to the quotation page", () => {
  assert.deepEqual(
    getStaffShipmentWorkspaceAction(
      ShipmentStatus.AWAITING_QUOTE,
      ShipmentDirection.US_TO_BF,
      "shipment/one",
    ),
    {
      title: "Établir le devis",
      description:
        "Enregistrez le poids mesuré et les conditions commerciales officielles de cet envoi.",
      href: "/staff/shipments/shipment%2Fone/quote",
      linkLabel: "Établir le devis",
    },
  );
});

test("points awaiting-payment shipments to the payment page", () => {
  assert.equal(
    getStaffShipmentWorkspaceAction(
      ShipmentStatus.AWAITING_PAYMENT,
      ShipmentDirection.BF_TO_US,
      "shipment_1",
    ).href,
    "/staff/shipments/shipment_1/payment",
  );
});

test("terminal shipment states expose no action destination", () => {
  for (const status of [ShipmentStatus.DELIVERED, ShipmentStatus.CANCELLED]) {
    for (const direction of Object.values(ShipmentDirection)) {
      const action = getStaffShipmentWorkspaceAction(
        status,
        direction,
        "shipment_1",
      );
      assert.equal(action.href, undefined);
      assert.equal(action.linkLabel, undefined);
    }
  }
});

test("detects an empty quotation snapshot", () => {
  assert.equal(
    getShipmentQuoteState({
      measuredWeightKg: null,
      ratePerKg: null,
      quotedAmount: null,
      quoteCurrency: null,
      quotedAt: null,
    }),
    "empty",
  );
});

test("detects a complete quotation snapshot", () => {
  assert.equal(
    getShipmentQuoteState({
      measuredWeightKg: "10.500",
      ratePerKg: "8.50",
      quotedAmount: "89.25",
      quoteCurrency: "USD",
      quotedAt: new Date("2026-08-08T18:00:00.000Z"),
    }),
    "complete",
  );
});

test("detects a partial quotation snapshot", () => {
  assert.equal(
    getShipmentQuoteState({
      measuredWeightKg: "10.500",
      ratePerKg: null,
      quotedAmount: "89.25",
      quoteCurrency: "USD",
      quotedAt: null,
    }),
    "partial",
  );
});
