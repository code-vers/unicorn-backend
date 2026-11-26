-- Preserve historic Stripe/manual payment rows while introducing Paystack.
CREATE TYPE "PaymentProvider" AS ENUM ('MANUAL', 'STRIPE', 'PAYSTACK');

ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'PAYSTACK';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REVIEW_REQUIRED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUND_PENDING';

ALTER TABLE "payments"
  ADD COLUMN "provider" "PaymentProvider" NOT NULL DEFAULT 'MANUAL';

UPDATE "payments"
SET "provider" = 'STRIPE'
WHERE "paymentMethod" = 'STRIPE';

ALTER TABLE "bookings"
  RENAME COLUMN "checkoutSessionId" TO "paymentReference";
ALTER TABLE "bookings"
  RENAME COLUMN "checkoutExpiresAt" TO "paymentExpiresAt";

DROP INDEX IF EXISTS "bookings_checkoutSessionId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_paymentReference_key"
  ON "bookings"("paymentReference");
