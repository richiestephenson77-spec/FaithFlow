-- Prayer Room notification types.
--
-- Kept in a SEPARATE migration from the table creation on purpose: Postgres
-- will not let a value added to an enum be USED in the same transaction that
-- adds it, and Prisma wraps each migration in one transaction. Splitting them
-- follows the same pattern as 20260723140000_cell_notification_types.
--
-- ADD VALUE IF NOT EXISTS is idempotent and safe to re-run on PG12+.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ROOM_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ROOM_STARTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ROOM_RESCHEDULED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ROOM_CANCELED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ROOM_INVITED';
