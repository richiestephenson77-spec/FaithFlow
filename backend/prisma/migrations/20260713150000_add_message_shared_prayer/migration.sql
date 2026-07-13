-- Share a prayer request into a chat: optional reference to a PrayerRequest.
-- Stored as a plain id (hydrated separately) — deliberately not a hard FK so a
-- later-deleted request simply resolves to nothing rather than blocking.
ALTER TABLE "messages" ADD COLUMN "sharedPrayerRequestId" TEXT;
