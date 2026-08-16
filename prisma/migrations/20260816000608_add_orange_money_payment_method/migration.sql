-- AlterEnum
ALTER TYPE "ShipmentPaymentMethod" ADD VALUE 'ORANGE_MONEY';

-- AlterTable
ALTER TABLE "ShipmentPayment" ADD COLUMN     "mobileMoneyPayerName" TEXT;
