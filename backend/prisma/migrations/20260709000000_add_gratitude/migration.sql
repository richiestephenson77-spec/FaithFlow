-- AlterTable: add gratitude tracking fields to users
ALTER TABLE "users" ADD COLUMN "gratitudeStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "lastGratitudeDate" TIMESTAMP(3);

-- CreateTable: gratitude entries
CREATE TABLE "gratitude_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mood" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gratitude_entries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "gratitude_entries" ADD CONSTRAINT "gratitude_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
