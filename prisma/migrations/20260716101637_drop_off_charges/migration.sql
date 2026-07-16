-- CreateEnum
CREATE TYPE "ChargeType" AS ENUM ('FIXED', 'PER_KM');

-- CreateEnum
CREATE TYPE "DropOffChargeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "drop_off_charges" (
    "id" TEXT NOT NULL,
    "pickupLocationId" TEXT NOT NULL,
    "dropOffLocationId" TEXT NOT NULL,
    "vehicleCategory" "VehicleCategory",
    "vehicleId" TEXT,
    "chargeType" "ChargeType" NOT NULL DEFAULT 'FIXED',
    "amount" DECIMAL(10,2) NOT NULL,
    "seasonalMultiplier" DECIMAL(10,2),
    "status" "DropOffChargeStatus" NOT NULL DEFAULT 'ACTIVE',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drop_off_charges_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "drop_off_charges" ADD CONSTRAINT "drop_off_charges_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop_off_charges" ADD CONSTRAINT "drop_off_charges_dropOffLocationId_fkey" FOREIGN KEY ("dropOffLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop_off_charges" ADD CONSTRAINT "drop_off_charges_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
