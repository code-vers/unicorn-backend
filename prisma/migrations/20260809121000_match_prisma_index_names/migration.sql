-- Match Prisma's deterministic shortened name for the composite drop-off index.
ALTER INDEX IF EXISTS "drop_off_charges_pickupLocationId_dropOffLocationId_status_isDe"
  RENAME TO "drop_off_charges_pickupLocationId_dropOffLocationId_status__idx";
