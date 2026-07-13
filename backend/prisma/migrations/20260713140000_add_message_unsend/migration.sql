-- Unsend: soft-delete flag on a message (row kept, content/media blanked)
ALTER TABLE "messages" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
