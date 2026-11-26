-- Remove legacy Stripe/Paystack payment records and replace Paystack with Pesapal.
DELETE FROM "payments"
WHERE "provider" IN ('PAYSTACK', 'STRIPE')
   OR "paymentMethod" IN ('PAYSTACK', 'STRIPE');

UPDATE "bookings"
SET "paymentReference" = NULL,
    "paymentExpiresAt" = NULL
WHERE "paymentReference" IS NOT NULL;

CREATE TYPE "PaymentProvider_new" AS ENUM ('MANUAL', 'PESAPAL');
ALTER TABLE "payments" ALTER COLUMN "provider" DROP DEFAULT;
ALTER TABLE "payments"
  ALTER COLUMN "provider" TYPE "PaymentProvider_new"
  USING ("provider"::text::"PaymentProvider_new");
ALTER TABLE "payments" ALTER COLUMN "provider" SET DEFAULT 'MANUAL';
DROP TYPE "PaymentProvider";
ALTER TYPE "PaymentProvider_new" RENAME TO "PaymentProvider";

CREATE TYPE "PaymentMethod_new" AS ENUM ('MPESA', 'AIRTEL', 'CARD', 'PESAPAL');
ALTER TABLE "payments"
  ALTER COLUMN "paymentMethod" TYPE "PaymentMethod_new"
  USING ("paymentMethod"::text::"PaymentMethod_new");
DROP TYPE "PaymentMethod";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "providerTrackingId" TEXT,
  ADD COLUMN IF NOT EXISTS "providerConfirmationCode" TEXT,
  ADD COLUMN IF NOT EXISTS "providerPaymentMethod" TEXT,
  ADD COLUMN IF NOT EXISTS "providerStatus" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "payments_providerTrackingId_key"
  ON "payments"("providerTrackingId");
