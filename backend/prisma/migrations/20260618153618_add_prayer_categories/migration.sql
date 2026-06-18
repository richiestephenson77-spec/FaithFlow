-- CreateEnum
CREATE TYPE "PrayerCategory" AS ENUM ('GENERAL', 'HEALTH', 'FAMILY', 'CAREER', 'FINANCIAL', 'RELATIONSHIP', 'SPIRITUAL');

-- AlterTable
ALTER TABLE "prayer_requests" ADD COLUMN     "category" "PrayerCategory" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN     "isUrgent" BOOLEAN NOT NULL DEFAULT false;
