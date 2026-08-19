-- Data-preserving reconciliation for databases that were originally created
-- with `prisma db push`, plus short-lived Stripe checkout tracking.

ALTER TABLE "bookings"
  ALTER COLUMN "taxPercentage" DROP DEFAULT,
  ADD COLUMN IF NOT EXISTS "checkoutSessionId" TEXT,
  ADD COLUMN IF NOT EXISTS "checkoutExpiresAt" TIMESTAMP(3);

ALTER TABLE "drop_off_charges"
  ADD COLUMN IF NOT EXISTS "distanceKm" DECIMAL(10,2);

ALTER TABLE "features"
  ALTER COLUMN "charge" SET DATA TYPE DECIMAL(10,2)
  USING "charge"::DECIMAL(10,2);

ALTER TABLE "pricings"
  ALTER COLUMN "gpsCharge" DROP DEFAULT,
  ALTER COLUMN "fullInsuranceCharge" DROP DEFAULT,
  ALTER COLUMN "additionalDriverCharge" DROP DEFAULT,
  ALTER COLUMN "childSeatCharge" DROP DEFAULT;

CREATE UNIQUE INDEX IF NOT EXISTS "bookings_checkoutSessionId_key"
  ON "bookings"("checkoutSessionId");
CREATE INDEX IF NOT EXISTS "bookings_vehicleId_pickupDate_dropOffDate_idx"
  ON "bookings"("vehicleId", "pickupDate", "dropOffDate");
CREATE INDEX IF NOT EXISTS "bookings_assignedDriverId_pickupDate_dropOffDate_idx"
  ON "bookings"("assignedDriverId", "pickupDate", "dropOffDate");
CREATE INDEX IF NOT EXISTS "bookings_userId_createdAt_idx"
  ON "bookings"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "drop_off_charges_pickupLocationId_dropOffLocationId_status_isDeleted_idx"
  ON "drop_off_charges"("pickupLocationId", "dropOffLocationId", "status", "isDeleted");
CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_createdAt_idx"
  ON "notifications"("userId", "isRead", "createdAt");
CREATE INDEX IF NOT EXISTS "payments_bookingId_createdAt_idx"
  ON "payments"("bookingId", "createdAt");
CREATE INDEX IF NOT EXISTS "support_tickets_status_createdAt_idx"
  ON "support_tickets"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "user_documents_userId_createdAt_idx"
  ON "user_documents"("userId", "createdAt");
