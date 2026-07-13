-- True confession anonymity: move authorship out of the confessions table
-- into a separate confession_authors table that is never joined into any
-- public query. Backfill existing authorship BEFORE dropping the column.

-- CreateTable
CREATE TABLE "confession_authors" (
    "id" TEXT NOT NULL,
    "confessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "confession_authors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "confession_authors_confessionId_key" ON "confession_authors"("confessionId");

-- Backfill authorship from existing confessions BEFORE the userId column is dropped
INSERT INTO "confession_authors" ("id", "confessionId", "userId", "createdAt")
SELECT gen_random_uuid()::text, "id", "userId", now() FROM "confessions";

-- AddForeignKey
ALTER TABLE "confession_authors" ADD CONSTRAINT "confession_authors_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop the direct authorship link from confessions
ALTER TABLE "confessions" DROP CONSTRAINT IF EXISTS "confessions_userId_fkey";
ALTER TABLE "confessions" DROP COLUMN "userId";
