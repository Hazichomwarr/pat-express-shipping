-- CreateEnum
CREATE TYPE "ShipmentPaymentMethod" AS ENUM ('ZELLE', 'CASH');

-- CreateEnum
CREATE TYPE "ShipmentPaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ShipmentPayment" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "method" "ShipmentPaymentMethod" NOT NULL,
    "status" "ShipmentPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "ShipmentQuoteCurrency" NOT NULL,
    "zelleName" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "confirmedByStaffId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShipmentPayment_shipmentId_idx" ON "ShipmentPayment"("shipmentId");

-- CreateIndex
CREATE INDEX "ShipmentPayment_status_idx" ON "ShipmentPayment"("status");

-- CreateIndex
CREATE INDEX "ShipmentPayment_confirmedByStaffId_idx" ON "ShipmentPayment"("confirmedByStaffId");

-- AddForeignKey
ALTER TABLE "ShipmentPayment" ADD CONSTRAINT "ShipmentPayment_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentPayment" ADD CONSTRAINT "ShipmentPayment_confirmedByStaffId_fkey" FOREIGN KEY ("confirmedByStaffId") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
