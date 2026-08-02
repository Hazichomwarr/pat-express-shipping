-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('AWAITING_PACKAGE', 'PACKAGE_RECEIVED_US', 'AWAITING_QUOTE', 'AWAITING_PAYMENT', 'PAYMENT_CONFIRMED', 'IN_TRANSIT_TO_BF', 'ARRIVED_BF', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShipmentIntakeMethod" AS ENUM ('DROP_OFF', 'MAIL_IN');

-- CreateEnum
CREATE TYPE "ShipmentItemCategory" AS ENUM ('GENERAL', 'CLOTHING', 'ELECTRONICS', 'DOCUMENTS', 'FOOD', 'HOUSEHOLD', 'COMMERCIAL_GOODS', 'OTHER');

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'AWAITING_PACKAGE',
    "intakeMethod" "ShipmentIntakeMethod" NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderPhone" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "recipientCity" TEXT NOT NULL,
    "recipientNotes" TEXT,
    "customerNotes" TEXT,
    "internalNotes" TEXT,
    "packageReceivedAt" TIMESTAMP(3),
    "paymentConfirmedAt" TIMESTAMP(3),
    "arrivedBfAt" TIMESTAMP(3),
    "readyForPickupAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentItem" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ShipmentItemCategory" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "declaredValue" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_trackingNumber_key" ON "Shipment"("trackingNumber");

-- CreateIndex
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");

-- CreateIndex
CREATE INDEX "Shipment_senderPhone_idx" ON "Shipment"("senderPhone");

-- CreateIndex
CREATE INDEX "Shipment_senderEmail_idx" ON "Shipment"("senderEmail");

-- CreateIndex
CREATE INDEX "Shipment_recipientPhone_idx" ON "Shipment"("recipientPhone");

-- CreateIndex
CREATE INDEX "Shipment_createdAt_idx" ON "Shipment"("createdAt");

-- CreateIndex
CREATE INDEX "ShipmentItem_shipmentId_idx" ON "ShipmentItem"("shipmentId");

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
