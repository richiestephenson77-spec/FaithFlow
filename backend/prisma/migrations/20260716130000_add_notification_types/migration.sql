-- New notification types
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SOMEONE_PRAYED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PRAYER_ANSWERED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CONFESSION_COMMENT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'STREAK_AT_RISK';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PARTNER_SHARED_PRAYER';

-- Per-type notification preferences (default on, matching existing prefs)
ALTER TABLE "users" ADD COLUMN "notifyPrayerAnswered"    BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "notifyConfessionComment" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "notifyStreakReminder"    BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "notifyPartnerActivity"   BOOLEAN NOT NULL DEFAULT true;
