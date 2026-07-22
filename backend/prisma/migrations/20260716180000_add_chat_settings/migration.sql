-- Per-user media auto-download preference
ALTER TABLE "users" ADD COLUMN "autoDownloadMedia" BOOLEAN NOT NULL DEFAULT true;

-- Per-user, per-conversation chat settings (theme + persisted UI toggles)
ALTER TABLE "conversation_participants" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'light';
ALTER TABLE "conversation_participants" ADD COLUMN "vanishMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "conversation_participants" ADD COLUMN "readReceiptsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "conversation_participants" ADD COLUMN "typingIndicatorEnabled" BOOLEAN NOT NULL DEFAULT true;
