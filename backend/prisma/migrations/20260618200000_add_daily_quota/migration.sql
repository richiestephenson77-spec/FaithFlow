ALTER TABLE "users" ADD COLUMN "dailyPrayerQuota" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "users" ADD COLUMN "prayerWarriorBadge" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "totalPeoplesPrayedFor" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "prayerWarriorEarnedAt" TIMESTAMP(3);

CREATE TABLE "daily_quota_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "completed" INTEGER NOT NULL DEFAULT 0,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "daily_quota_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "daily_quota_logs" ADD CONSTRAINT "daily_quota_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "daily_quota_logs_userId_date_key" ON "daily_quota_logs"("userId", "date");
