/*
  Warnings:

  - You are about to drop the column `seasonalMultiplier` on the `drop_off_charges` table. All the data in the column will be lost.
  - You are about to drop the column `extraDayCharge` on the `pricings` table. All the data in the column will be lost.
  - You are about to drop the column `extraMileageCharge` on the `pricings` table. All the data in the column will be lost.
  - You are about to drop the column `lateReturnHourlyCharge` on the `pricings` table. All the data in the column will be lost.
  - You are about to drop the column `seasonalMultiplier` on the `pricings` table. All the data in the column will be lost.
  - You are about to drop the column `selfDriveRate` on the `pricings` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `emergencyContactEmail` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `emergencyContactName` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `emergencyContactPhone` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `emergencyContactRelation` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `idPassportNumber` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isDeleted` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNumber` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `photoUrl` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `dailyRate` on the `vehicles` table. All the data in the column will be lost.
  - You are about to drop the column `features` on the `vehicles` table. All the data in the column will be lost.
  - You are about to drop the column `locationId` on the `vehicles` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyRate` on the `vehicles` table. All the data in the column will be lost.
  - You are about to drop the column `weeklyRate` on the `vehicles` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `vehicles` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "VehicleFuelType" ADD VALUE 'DIESEL_PETROL';

-- DropForeignKey
ALTER TABLE "vehicles" DROP CONSTRAINT "vehicles_locationId_fkey";

-- AlterTable
ALTER TABLE "drop_off_charges" DROP COLUMN "seasonalMultiplier";

-- AlterTable
ALTER TABLE "pricings" DROP COLUMN "extraDayCharge",
DROP COLUMN "extraMileageCharge",
DROP COLUMN "lateReturnHourlyCharge",
DROP COLUMN "seasonalMultiplier",
DROP COLUMN "selfDriveRate",
ADD COLUMN     "discountValidFrom" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" DROP COLUMN "address",
DROP COLUMN "emergencyContactEmail",
DROP COLUMN "emergencyContactName",
DROP COLUMN "emergencyContactPhone",
DROP COLUMN "emergencyContactRelation",
DROP COLUMN "idPassportNumber",
DROP COLUMN "isDeleted",
DROP COLUMN "phoneNumber",
DROP COLUMN "photoUrl",
DROP COLUMN "status";

-- AlterTable
ALTER TABLE "vehicles" DROP COLUMN "dailyRate",
DROP COLUMN "features",
DROP COLUMN "locationId",
DROP COLUMN "monthlyRate",
DROP COLUMN "weeklyRate",
DROP COLUMN "year";
