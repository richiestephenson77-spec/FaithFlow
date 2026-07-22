-- Vanish-mode disappearing messages: flag + recipient-seen timestamp
ALTER TABLE "messages" ADD COLUMN "isVanish" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "messages" ADD COLUMN "seenAt" TIMESTAMP(3);
