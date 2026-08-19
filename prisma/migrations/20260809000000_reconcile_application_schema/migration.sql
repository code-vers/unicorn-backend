-- Reconcile the database created by the existing migration history with the
-- application schema. Legacy user and vehicle columns are retained to avoid
-- destructive data loss; defaults/nullability make them compatible with new writes.

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING', 'PAYMENT', 'SYSTEM', 'CHAUFFEUR');
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'ONGOING', 'COMPLETED', 'CANCELLED');
CREATE TYPE "SupportStatus" AS ENUM ('PENDING', 'RESOLVED', 'CLOSED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');
CREATE TYPE "PaymentMethod" AS ENUM ('MPESA', 'AIRTEL', 'CARD', 'PESAPAL', 'STRIPE');
CREATE TYPE "ActivityType" AS ENUM ('BOOKING', 'PAYMENT', 'DRIVER', 'SERVICE', 'ASSIGNMENT');
CREATE TYPE "ActivityStatus" AS ENUM ('NEW', 'PENDING', 'COMPLETED', 'FAILED');

-- Normalize profiles while preserving the legacy user data.
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "photoUrl" TEXT,
    "phoneNumber" TEXT,
    "address" TEXT,
    "idPassportNumber" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactEmail" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRelation" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

INSERT INTO "user_profiles" (
    "id", "userId", "photoUrl", "phoneNumber", "address", "idPassportNumber",
    "emergencyContactName", "emergencyContactEmail", "emergencyContactPhone",
    "emergencyContactRelation", "status", "isDeleted", "createdAt", "updatedAt"
)
SELECT
    md5('user-profile:' || "id"), "id", "photoUrl", "phoneNumber", "address",
    "idPassportNumber", "emergencyContactName", "emergencyContactEmail",
    "emergencyContactPhone", "emergencyContactRelation", "status", "isDeleted",
    "createdAt", "updatedAt"
FROM "users";

CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The legacy vehicle columns remain as a compatibility/data-recovery source.
ALTER TABLE "vehicles" ALTER COLUMN "features" SET DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "vehicles" ALTER COLUMN "dailyRate" DROP NOT NULL;
ALTER TABLE "drop_off_charges" ADD COLUMN "distanceKm" DECIMAL(10,2);

CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "features" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "charge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isAddon" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pricings" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT,
    "dailyRate" DECIMAL(10,2) NOT NULL,
    "weeklyRate" DECIMAL(10,2) NOT NULL,
    "monthlyRate" DECIMAL(10,2) NOT NULL,
    "selfDriveRate" DECIMAL(10,2) NOT NULL,
    "chauffeurRate" DECIMAL(10,2) NOT NULL,
    "seasonalMultiplier" DECIMAL(10,2) NOT NULL DEFAULT 1.0,
    "extraDayCharge" DECIMAL(10,2) NOT NULL,
    "lateReturnHourlyCharge" DECIMAL(10,2) NOT NULL,
    "securityDeposit" DECIMAL(10,2) NOT NULL,
    "deliveryCollectionCharge" DECIMAL(10,2) NOT NULL,
    "airportPickupDropCharge" DECIMAL(10,2) NOT NULL,
    "extraMileageCharge" DECIMAL(10,2) NOT NULL,
    "gpsCharge" DECIMAL(10,2) NOT NULL,
    "fullInsuranceCharge" DECIMAL(10,2) NOT NULL,
    "additionalDriverCharge" DECIMAL(10,2) NOT NULL,
    "childSeatCharge" DECIMAL(10,2) NOT NULL,
    "discountPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "discountValidUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pricings_pkey" PRIMARY KEY ("id")
);

-- Preserve legacy vehicle rates as vehicle-specific pricing records.
INSERT INTO "pricings" (
    "id", "vehicleId", "dailyRate", "weeklyRate", "monthlyRate", "selfDriveRate",
    "chauffeurRate", "extraDayCharge", "lateReturnHourlyCharge", "securityDeposit",
    "deliveryCollectionCharge", "airportPickupDropCharge", "extraMileageCharge",
    "gpsCharge", "fullInsuranceCharge", "additionalDriverCharge", "childSeatCharge",
    "createdAt", "updatedAt"
)
SELECT
    md5('vehicle-pricing:' || "id"), "id", "dailyRate",
    COALESCE("weeklyRate", "dailyRate" * 7),
    COALESCE("monthlyRate", "dailyRate" * 30),
    "dailyRate", "dailyRate", "dailyRate", 0, 0, 0, 0, 0, 0, 0, 0, 0,
    "createdAt", "updatedAt"
FROM "vehicles"
WHERE "dailyRate" IS NOT NULL;

CREATE TABLE "_FeatureToVehicle" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_FeatureToVehicle_AB_pkey" PRIMARY KEY ("A", "B")
);

-- Convert legacy feature-name arrays to normalized feature relationships.
INSERT INTO "features" ("id", "name", "updatedAt")
SELECT md5('legacy-feature:' || feature_name), feature_name, CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT unnest("features") AS feature_name FROM "vehicles"
) AS legacy_features
WHERE feature_name <> '';

INSERT INTO "_FeatureToVehicle" ("A", "B")
SELECT md5('legacy-feature:' || feature_name), vehicle_id
FROM (
    SELECT "id" AS vehicle_id, unnest("features") AS feature_name FROM "vehicles"
) AS legacy_vehicle_features
WHERE feature_name <> '';

CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "assignedDriverId" TEXT,
    "pickupLocationId" TEXT NOT NULL,
    "dropOffLocationId" TEXT NOT NULL,
    "pickupDate" TIMESTAMP(3) NOT NULL,
    "dropOffDate" TIMESTAMP(3) NOT NULL,
    "rentalCost" DECIMAL(10,2) NOT NULL,
    "pickupFee" DECIMAL(10,2) NOT NULL,
    "dropOffFee" DECIMAL(10,2) NOT NULL,
    "hasGps" BOOLEAN NOT NULL DEFAULT false,
    "hasFullInsurance" BOOLEAN NOT NULL DEFAULT false,
    "hasAdditionalDriver" BOOLEAN NOT NULL DEFAULT false,
    "hasChildSeat" BOOLEAN NOT NULL DEFAULT false,
    "addonsCost" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "modificationFee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "taxPercentage" DECIMAL(5,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "bookingStatus" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "booking_driver_details" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "message" TEXT,
    CONSTRAINT "booking_driver_details_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_infos" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL,
    "zipCode" TEXT,
    "description" TEXT,
    CONSTRAINT "billing_infos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "transactionId" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentType" TEXT NOT NULL DEFAULT 'INITIAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "status" "SupportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ActivityStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- Unique and query indexes.
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");
CREATE UNIQUE INDEX "bookings_referenceId_key" ON "bookings"("referenceId");
CREATE UNIQUE INDEX "booking_driver_details_bookingId_key" ON "booking_driver_details"("bookingId");
CREATE UNIQUE INDEX "billing_infos_bookingId_key" ON "billing_infos"("bookingId");
CREATE UNIQUE INDEX "payments_transactionId_key" ON "payments"("transactionId");
CREATE UNIQUE INDEX "pricings_vehicleId_key" ON "pricings"("vehicleId");
CREATE UNIQUE INDEX "pricings_single_global_key" ON "pricings" ((1)) WHERE "vehicleId" IS NULL;
CREATE INDEX "user_documents_userId_createdAt_idx" ON "user_documents"("userId", "createdAt");
CREATE INDEX "drop_off_charges_pickupLocationId_dropOffLocationId_status_isDeleted_idx"
    ON "drop_off_charges"("pickupLocationId", "dropOffLocationId", "status", "isDeleted");
CREATE INDEX "bookings_vehicleId_pickupDate_dropOffDate_idx" ON "bookings"("vehicleId", "pickupDate", "dropOffDate");
CREATE INDEX "bookings_assignedDriverId_pickupDate_dropOffDate_idx" ON "bookings"("assignedDriverId", "pickupDate", "dropOffDate");
CREATE INDEX "bookings_userId_createdAt_idx" ON "bookings"("userId", "createdAt");
CREATE INDEX "payments_bookingId_createdAt_idx" ON "payments"("bookingId", "createdAt");
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt");
CREATE INDEX "support_tickets_status_createdAt_idx" ON "support_tickets"("status", "createdAt");
CREATE INDEX "_FeatureToVehicle_B_index" ON "_FeatureToVehicle"("B");

-- Relations.
ALTER TABLE "pricings" ADD CONSTRAINT "pricings_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_FeatureToVehicle" ADD CONSTRAINT "_FeatureToVehicle_A_fkey" FOREIGN KEY ("A") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_FeatureToVehicle" ADD CONSTRAINT "_FeatureToVehicle_B_fkey" FOREIGN KEY ("B") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_dropOffLocationId_fkey" FOREIGN KEY ("dropOffLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking_driver_details" ADD CONSTRAINT "booking_driver_details_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_infos" ADD CONSTRAINT "billing_infos_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
