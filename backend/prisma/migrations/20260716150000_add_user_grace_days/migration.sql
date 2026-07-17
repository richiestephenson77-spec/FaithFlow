-- Streak freeze: grace days earned per Prayer Warrior level, auto-consumed on a missed day
ALTER TABLE "users" ADD COLUMN "graceDaysAvailable" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "graceDayUsedAt" TIMESTAMP(3);
