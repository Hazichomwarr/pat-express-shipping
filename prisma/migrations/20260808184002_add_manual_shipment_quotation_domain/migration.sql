-- CreateEnum
CREATE TYPE "ShipmentQuoteCurrency" AS ENUM ('USD');

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "measuredWeightKg" DECIMAL(10,3),
ADD COLUMN     "quoteCurrency" "ShipmentQuoteCurrency",
ADD COLUMN     "quotedAmount" DECIMAL(12,2),
ADD COLUMN     "quotedAt" TIMESTAMP(3),
ADD COLUMN     "ratePerKg" DECIMAL(12,2);
