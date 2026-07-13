-- Voice messages: optional audio URL + duration (seconds) on a message
ALTER TABLE "messages" ADD COLUMN "audioUrl" TEXT;
ALTER TABLE "messages" ADD COLUMN "audioDuration" INTEGER;
