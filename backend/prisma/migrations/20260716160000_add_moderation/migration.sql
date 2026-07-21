-- Reports
CREATE TABLE "reports" (
  "id" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "contentType" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "reportedUserId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "reports_status_idx" ON "reports"("status");
CREATE INDEX "reports_reporterId_contentType_contentId_idx" ON "reports"("reporterId", "contentType", "contentId");
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Blocks
CREATE TABLE "blocks" (
  "id" TEXT NOT NULL,
  "blockerId" TEXT NOT NULL,
  "blockedId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "blocks_blockerId_blockedId_key" ON "blocks"("blockerId", "blockedId");
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Soft-delete flags on reportable content (audit trail, not hard delete)
ALTER TABLE "prayer_requests"    ADD COLUMN "isRemoved" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "removedReason" TEXT;
ALTER TABLE "confessions"        ADD COLUMN "isRemoved" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "removedReason" TEXT;
ALTER TABLE "confession_comments" ADD COLUMN "isRemoved" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "removedReason" TEXT;
ALTER TABLE "messages"           ADD COLUMN "isRemoved" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "removedReason" TEXT;
