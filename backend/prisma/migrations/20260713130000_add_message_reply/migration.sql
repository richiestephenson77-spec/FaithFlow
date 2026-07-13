-- Reply-to-a-message: optional self-reference on a message
ALTER TABLE "messages" ADD COLUMN "replyToId" TEXT;
ALTER TABLE "messages" ADD CONSTRAINT "messages_replyToId_fkey"
  FOREIGN KEY ("replyToId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
