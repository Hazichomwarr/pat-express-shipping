-- Bidirectional Shipment Domain Foundation (Ticket 6A)
--
-- This migration corrects the original domain assumption that every shipment
-- travels United States -> Burkina Faso. It:
--   1. Renames the three geography-specific ShipmentStatus values to their
--      geography-neutral equivalents, in place, preserving every existing row's
--      historical status meaning (ALTER TYPE ... RENAME VALUE never touches
--      row data -- rows referencing the old label transparently read as the
--      new label).
--   2. Introduces ShipmentDirection and backfills every pre-existing shipment
--      (created before the app tracked direction) to US_TO_BF, since that was
--      the only direction the application ever created shipments under.
--   3. Renames the arrivedBfAt column to arrivedDestinationAt via a real
--      column rename (ALTER TABLE ... RENAME COLUMN), which preserves the
--      exact historical timestamp values without a copy/drop round-trip.

-- Rename geography-specific ShipmentStatus values in place. Existing rows
-- keep their historical meaning: PACKAGE_RECEIVED_US rows become
-- PACKAGE_RECEIVED rows, etc. No row is reset, deleted, or reinterpreted.
ALTER TYPE "ShipmentStatus" RENAME VALUE 'PACKAGE_RECEIVED_US' TO 'PACKAGE_RECEIVED';
ALTER TYPE "ShipmentStatus" RENAME VALUE 'IN_TRANSIT_TO_BF' TO 'IN_TRANSIT';
ALTER TYPE "ShipmentStatus" RENAME VALUE 'ARRIVED_BF' TO 'ARRIVED_DESTINATION';

-- CreateEnum
CREATE TYPE "ShipmentDirection" AS ENUM ('US_TO_BF', 'BF_TO_US');

-- Add the column nullable first so existing rows can be safely backfilled
-- before the NOT NULL constraint is enforced.
ALTER TABLE "Shipment" ADD COLUMN "direction" "ShipmentDirection";

-- Every shipment created before this refactor was created under the
-- application's original single-direction assumption (US -> BF). This is a
-- one-time backfill of historical rows, not a permanent schema default.
UPDATE "Shipment" SET "direction" = 'US_TO_BF' WHERE "direction" IS NULL;

-- Enforce direction as required going forward. No @default is applied in the
-- Prisma schema, so all future inserts must supply direction explicitly.
ALTER TABLE "Shipment" ALTER COLUMN "direction" SET NOT NULL;

-- Rename the destination-arrival timestamp column in place, preserving the
-- exact historical instant for every existing row.
ALTER TABLE "Shipment" RENAME COLUMN "arrivedBfAt" TO "arrivedDestinationAt";
