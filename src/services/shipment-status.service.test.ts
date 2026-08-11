import assert from "node:assert/strict";
import test from "node:test";

import { Prisma, ShipmentStatus } from "@prisma/client";

import {
  advanceShipmentStatus,
  ShipmentNotFoundError,
  ShipmentStatusStateInconsistentError,
  ShipmentStatusTransitionConflictError,
  ShipmentStatusTransitionNotAllowedError,
} from "./shipment-status.service";

const milestone = new Date("2026-08-10T14:15:00.000Z");
const earlier = new Date("2026-08-09T12:00:00.000Z");

function shipment(
  overrides: Partial<{
    id: string;
    trackingNumber: string;
    status: ShipmentStatus;
    packageReceivedAt: Date | null;
    paymentConfirmedAt: Date | null;
    arrivedDestinationAt: Date | null;
    readyForPickupAt: Date | null;
    deliveredAt: Date | null;
    cancelledAt: Date | null;
  }> = {},
) {
  return {
    id: "shipment_1",
    trackingNumber: "PAT-2026-ABCDEFGH",
    status: ShipmentStatus.AWAITING_PACKAGE,
    packageReceivedAt: null,
    paymentConfirmedAt: null,
    arrivedDestinationAt: null,
    readyForPickupAt: null,
    deliveredAt: null,
    cancelledAt: null,
    ...overrides,
  };
}

function dependencies(
  record: ReturnType<typeof shipment> | null,
  options: {
    updateCount?: number;
    updateError?: Error;
    onUpdate?: (args: Prisma.ShipmentUpdateManyArgs) => void;
    onNow?: () => void;
  } = {},
) {
  return {
    findShipment: async () => record,
    conditionallyUpdateShipment: async (
      args: Prisma.ShipmentUpdateManyArgs,
    ) => {
      options.onUpdate?.(args);
      if (options.updateError) throw options.updateError;
      return { count: options.updateCount ?? 1 };
    },
    now: () => {
      options.onNow?.();
      return milestone;
    },
  };
}

test("throws a specific error when the shipment is missing", async () => {
  await assert.rejects(
    advanceShipmentStatus(
      "missing",
      ShipmentStatus.PACKAGE_RECEIVED,
      dependencies(null),
    ),
    ShipmentNotFoundError,
  );
});

test("rejects transitions not owned by generic staff advancement", async () => {
  for (const [record, toStatus] of [
    [
      shipment({ status: ShipmentStatus.AWAITING_QUOTE }),
      ShipmentStatus.AWAITING_PAYMENT,
    ],
    [
      shipment({ status: ShipmentStatus.AWAITING_PAYMENT }),
      ShipmentStatus.PAYMENT_CONFIRMED,
    ],
    [shipment(), ShipmentStatus.CANCELLED],
    [shipment(), ShipmentStatus.ARRIVED_DESTINATION],
  ] as const) {
    await assert.rejects(
      advanceShipmentStatus("shipment_1", toStatus, dependencies(record)),
      ShipmentStatusTransitionNotAllowedError,
    );
  }
});

test("receives a package with one server-generated milestone", async () => {
  let updateArgs: Prisma.ShipmentUpdateManyArgs | undefined;
  let nowCalls = 0;

  const result = await advanceShipmentStatus(
    "shipment_1",
    ShipmentStatus.PACKAGE_RECEIVED,
    dependencies(shipment(), {
      onUpdate: (args) => {
        updateArgs = args;
      },
      onNow: () => {
        nowCalls += 1;
      },
    }),
  );

  assert.equal(nowCalls, 1);
  assert.deepEqual(updateArgs, {
    where: {
      id: "shipment_1",
      status: ShipmentStatus.AWAITING_PACKAGE,
      cancelledAt: null,
      packageReceivedAt: null,
    },
    data: {
      status: ShipmentStatus.PACKAGE_RECEIVED,
      packageReceivedAt: milestone,
    },
  });
  assert.deepEqual(result, {
    id: "shipment_1",
    trackingNumber: "PAT-2026-ABCDEFGH",
    previousStatus: ShipmentStatus.AWAITING_PACKAGE,
    status: ShipmentStatus.PACKAGE_RECEIVED,
    milestoneAt: milestone,
  });
});

test("does not overwrite an existing package receipt timestamp", async () => {
  await assert.rejects(
    advanceShipmentStatus(
      "shipment_1",
      ShipmentStatus.PACKAGE_RECEIVED,
      dependencies(shipment({ packageReceivedAt: earlier })),
    ),
    ShipmentStatusStateInconsistentError,
  );
});

test("moving to awaiting quote requires receipt and creates no timestamp", async () => {
  await assert.rejects(
    advanceShipmentStatus(
      "shipment_1",
      ShipmentStatus.AWAITING_QUOTE,
      dependencies(shipment({ status: ShipmentStatus.PACKAGE_RECEIVED })),
    ),
    ShipmentStatusStateInconsistentError,
  );

  let updateArgs: Prisma.ShipmentUpdateManyArgs | undefined;
  let nowCalls = 0;
  const result = await advanceShipmentStatus(
    "shipment_1",
    ShipmentStatus.AWAITING_QUOTE,
    dependencies(
      shipment({
        status: ShipmentStatus.PACKAGE_RECEIVED,
        packageReceivedAt: earlier,
      }),
      {
        onUpdate: (args) => {
          updateArgs = args;
        },
        onNow: () => {
          nowCalls += 1;
        },
      },
    ),
  );

  assert.equal(nowCalls, 0);
  assert.equal(result.milestoneAt, null);
  assert.deepEqual(updateArgs, {
    where: {
      id: "shipment_1",
      status: ShipmentStatus.PACKAGE_RECEIVED,
      cancelledAt: null,
      packageReceivedAt: { not: null },
    },
    data: { status: ShipmentStatus.AWAITING_QUOTE },
  });
});

test("starting transit requires payment confirmation and creates no timestamp", async () => {
  const current = shipment({ status: ShipmentStatus.PAYMENT_CONFIRMED });

  await assert.rejects(
    advanceShipmentStatus(
      current.id,
      ShipmentStatus.IN_TRANSIT,
      dependencies(current),
    ),
    ShipmentStatusStateInconsistentError,
  );

  let nowCalls = 0;
  let updateArgs: Prisma.ShipmentUpdateManyArgs | undefined;
  const result = await advanceShipmentStatus(
    current.id,
    ShipmentStatus.IN_TRANSIT,
    dependencies(
      shipment({
        status: ShipmentStatus.PAYMENT_CONFIRMED,
        paymentConfirmedAt: earlier,
      }),
      {
        onNow: () => {
          nowCalls += 1;
        },
        onUpdate: (args) => {
          updateArgs = args;
        },
      },
    ),
  );

  assert.equal(nowCalls, 0);
  assert.equal(result.milestoneAt, null);
  assert.deepEqual(updateArgs?.where, {
    id: "shipment_1",
    status: ShipmentStatus.PAYMENT_CONFIRMED,
    cancelledAt: null,
    paymentConfirmedAt: { not: null },
  });
});

test("arrival records arrivedDestinationAt and protects an existing timestamp", async () => {
  let updateArgs: Prisma.ShipmentUpdateManyArgs | undefined;
  const result = await advanceShipmentStatus(
    "shipment_1",
    ShipmentStatus.ARRIVED_DESTINATION,
    dependencies(shipment({ status: ShipmentStatus.IN_TRANSIT }), {
      onUpdate: (args) => {
        updateArgs = args;
      },
    }),
  );

  assert.equal(result.milestoneAt, milestone);
  assert.deepEqual(updateArgs?.data, {
    status: ShipmentStatus.ARRIVED_DESTINATION,
    arrivedDestinationAt: milestone,
  });
  assert.equal(
    (updateArgs?.where as Prisma.ShipmentWhereInput).arrivedDestinationAt,
    null,
  );

  await assert.rejects(
    advanceShipmentStatus(
      "shipment_1",
      ShipmentStatus.ARRIVED_DESTINATION,
      dependencies(
        shipment({
          status: ShipmentStatus.IN_TRANSIT,
          arrivedDestinationAt: earlier,
        }),
      ),
    ),
    ShipmentStatusStateInconsistentError,
  );
});

test("ready for pickup requires arrival and stores its milestone", async () => {
  await assert.rejects(
    advanceShipmentStatus(
      "shipment_1",
      ShipmentStatus.READY_FOR_PICKUP,
      dependencies(shipment({ status: ShipmentStatus.ARRIVED_DESTINATION })),
    ),
    ShipmentStatusStateInconsistentError,
  );

  let updateArgs: Prisma.ShipmentUpdateManyArgs | undefined;
  const result = await advanceShipmentStatus(
    "shipment_1",
    ShipmentStatus.READY_FOR_PICKUP,
    dependencies(
      shipment({ status: ShipmentStatus.ARRIVED_DESTINATION, arrivedDestinationAt: earlier }),
      {
        onUpdate: (args) => {
          updateArgs = args;
        },
      },
    ),
  );

  assert.equal(result.milestoneAt, milestone);
  assert.deepEqual(updateArgs?.data, {
    status: ShipmentStatus.READY_FOR_PICKUP,
    readyForPickupAt: milestone,
  });
  assert.deepEqual(updateArgs?.where, {
    id: "shipment_1",
    status: ShipmentStatus.ARRIVED_DESTINATION,
    cancelledAt: null,
    arrivedDestinationAt: { not: null },
    readyForPickupAt: null,
  });
});

test("ready for pickup does not overwrite an existing timestamp", async () => {
  await assert.rejects(
    advanceShipmentStatus(
      "shipment_1",
      ShipmentStatus.READY_FOR_PICKUP,
      dependencies(
        shipment({
          status: ShipmentStatus.ARRIVED_DESTINATION,
          arrivedDestinationAt: earlier,
          readyForPickupAt: earlier,
        }),
      ),
    ),
    ShipmentStatusStateInconsistentError,
  );
});

test("delivery requires pickup readiness and stores deliveredAt", async () => {
  await assert.rejects(
    advanceShipmentStatus(
      "shipment_1",
      ShipmentStatus.DELIVERED,
      dependencies(shipment({ status: ShipmentStatus.READY_FOR_PICKUP })),
    ),
    ShipmentStatusStateInconsistentError,
  );

  let updateArgs: Prisma.ShipmentUpdateManyArgs | undefined;
  const result = await advanceShipmentStatus(
    "shipment_1",
    ShipmentStatus.DELIVERED,
    dependencies(
      shipment({
        status: ShipmentStatus.READY_FOR_PICKUP,
        readyForPickupAt: earlier,
      }),
      {
        onUpdate: (args) => {
          updateArgs = args;
        },
      },
    ),
  );

  assert.equal(result.milestoneAt, milestone);
  assert.deepEqual(updateArgs?.data, {
    status: ShipmentStatus.DELIVERED,
    deliveredAt: milestone,
  });
  assert.deepEqual(updateArgs?.where, {
    id: "shipment_1",
    status: ShipmentStatus.READY_FOR_PICKUP,
    cancelledAt: null,
    readyForPickupAt: { not: null },
    deliveredAt: null,
  });
});

test("delivery does not overwrite an existing timestamp", async () => {
  await assert.rejects(
    advanceShipmentStatus(
      "shipment_1",
      ShipmentStatus.DELIVERED,
      dependencies(
        shipment({
          status: ShipmentStatus.READY_FOR_PICKUP,
          readyForPickupAt: earlier,
          deliveredAt: earlier,
        }),
      ),
    ),
    ShipmentStatusStateInconsistentError,
  );
});

test("an unexpected cancellation milestone blocks active advancement", async () => {
  await assert.rejects(
    advanceShipmentStatus(
      "shipment_1",
      ShipmentStatus.PACKAGE_RECEIVED,
      dependencies(shipment({ cancelledAt: earlier })),
    ),
    ShipmentStatusStateInconsistentError,
  );
});

test("a zero-row conditional update reports conflict without retry", async () => {
  let updateCalls = 0;

  await assert.rejects(
    advanceShipmentStatus(
      "shipment_1",
      ShipmentStatus.PACKAGE_RECEIVED,
      dependencies(shipment(), {
        updateCount: 0,
        onUpdate: () => {
          updateCalls += 1;
        },
      }),
    ),
    ShipmentStatusTransitionConflictError,
  );
  assert.equal(updateCalls, 1);
});

test("rethrows unrelated database errors without retrying", async () => {
  const databaseError = new Error("database unavailable");
  let updateCalls = 0;

  await assert.rejects(
    advanceShipmentStatus(
      "shipment_1",
      ShipmentStatus.PACKAGE_RECEIVED,
      dependencies(shipment(), {
        updateError: databaseError,
        onUpdate: () => {
          updateCalls += 1;
        },
      }),
    ),
    (error) => error === databaseError,
  );
  assert.equal(updateCalls, 1);
});
