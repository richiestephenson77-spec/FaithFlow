-- Prayer request lifecycle: track last activity for staleness + activity sorting
ALTER TABLE "prayer_requests" ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill existing rows to the most recent real activity (latest prayer or creation)
UPDATE "prayer_requests" pr
SET "lastActivityAt" = GREATEST(
  pr."createdAt",
  COALESCE((SELECT MAX(ps."startedAt") FROM "prayer_sessions" ps WHERE ps."prayerRequestId" = pr."id"), pr."createdAt")
);

-- Notification type for the "still need prayer? bump it" nudge
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REQUEST_NEEDS_BUMP';
