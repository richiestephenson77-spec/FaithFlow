-- Adds the "Share publicly" flag for answered-prayer testimonies.
-- Existing answered prayers default to public (true), matching prior behaviour.
ALTER TABLE "prayer_requests" ADD COLUMN "answeredIsPublic" BOOLEAN NOT NULL DEFAULT true;
