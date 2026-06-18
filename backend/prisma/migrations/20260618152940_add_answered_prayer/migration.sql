-- AlterTable
ALTER TABLE "prayer_requests" ADD COLUMN     "answeredAt" TIMESTAMP(3),
ADD COLUMN     "isAnswered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "testimonyMessage" TEXT;
