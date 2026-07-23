-- ============================================================================
-- Prayer Cells → persistent GROUP communities (with live audio sessions)
-- Reworks the old transient 1-host live room into a persistent group.
-- Existing cells are migrated sanely: the old host becomes creator + admin.
-- ============================================================================

-- 1. Extend prayer_cells into a persistent group -----------------------------
ALTER TABLE "prayer_cells" ADD COLUMN "name" TEXT;
ALTER TABLE "prayer_cells" ADD COLUMN "description" TEXT;
ALTER TABLE "prayer_cells" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "prayer_cells" ADD COLUMN "creatorId" TEXT;
ALTER TABLE "prayer_cells" ADD COLUMN "joinPolicy" TEXT NOT NULL DEFAULT 'open';
ALTER TABLE "prayer_cells" ADD COLUMN "totalSessions" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "prayer_cells" ADD COLUMN "totalMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "prayer_cells" ADD COLUMN "lastActiveAt" TIMESTAMP(3);
ALTER TABLE "prayer_cells" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill from the old host-centric shape
UPDATE "prayer_cells" SET
  "creatorId"     = "hostId",
  "name"          = 'Prayer Cell',
  "totalSessions" = COALESCE("sessionCount", 0),
  "lastActiveAt"  = COALESCE("endedAt", "startedAt"),
  "createdAt"     = COALESCE("startedAt", CURRENT_TIMESTAMP);

-- Enforce NOT NULL + FK on the new required columns
ALTER TABLE "prayer_cells" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "prayer_cells" ALTER COLUMN "creatorId" SET NOT NULL;
ALTER TABLE "prayer_cells" ADD CONSTRAINT "prayer_cells_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "prayer_cells_creatorId_idx" ON "prayer_cells"("creatorId");

-- Drop the retired host-centric columns (their FK/constraints drop with them)
ALTER TABLE "prayer_cells" DROP COLUMN "hostId";
ALTER TABLE "prayer_cells" DROP COLUMN "isActive";
ALTER TABLE "prayer_cells" DROP COLUMN "startedAt";
ALTER TABLE "prayer_cells" DROP COLUMN "endedAt";
ALTER TABLE "prayer_cells" DROP COLUMN "sessionCount";

-- 2. Membership + role -------------------------------------------------------
CREATE TABLE "prayer_cell_members" (
  "id"       TEXT NOT NULL,
  "cellId"   TEXT NOT NULL,
  "userId"   TEXT NOT NULL,
  "role"     TEXT NOT NULL DEFAULT 'member',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "prayer_cell_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "prayer_cell_members_cellId_userId_key" ON "prayer_cell_members"("cellId", "userId");
CREATE INDEX "prayer_cell_members_userId_idx" ON "prayer_cell_members"("userId");
ALTER TABLE "prayer_cell_members" ADD CONSTRAINT "prayer_cell_members_cellId_fkey"
  FOREIGN KEY ("cellId") REFERENCES "prayer_cells"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prayer_cell_members" ADD CONSTRAINT "prayer_cell_members_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: each existing cell's creator becomes its admin member
INSERT INTO "prayer_cell_members" ("id", "cellId", "userId", "role", "joinedAt")
SELECT gen_random_uuid()::text, "id", "creatorId", 'admin', "createdAt" FROM "prayer_cells";

-- 3. Join requests (only used when joinPolicy = 'request') --------------------
CREATE TABLE "prayer_cell_join_requests" (
  "id"        TEXT NOT NULL,
  "cellId"    TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "status"    TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "prayer_cell_join_requests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "prayer_cell_join_requests_cellId_userId_key" ON "prayer_cell_join_requests"("cellId", "userId");
CREATE INDEX "prayer_cell_join_requests_cellId_status_idx" ON "prayer_cell_join_requests"("cellId", "status");
ALTER TABLE "prayer_cell_join_requests" ADD CONSTRAINT "prayer_cell_join_requests_cellId_fkey"
  FOREIGN KEY ("cellId") REFERENCES "prayer_cells"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prayer_cell_join_requests" ADD CONSTRAINT "prayer_cell_join_requests_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Sessions: retire the old host-guest join records, recreate as live sessions
DROP TABLE "prayer_cell_sessions";
CREATE TABLE "prayer_cell_sessions" (
  "id"          TEXT NOT NULL,
  "cellId"      TEXT NOT NULL,
  "startedById" TEXT NOT NULL,
  "startedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt"     TIMESTAMP(3),
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "prayer_cell_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "prayer_cell_sessions_cellId_idx" ON "prayer_cell_sessions"("cellId");
ALTER TABLE "prayer_cell_sessions" ADD CONSTRAINT "prayer_cell_sessions_cellId_fkey"
  FOREIGN KEY ("cellId") REFERENCES "prayer_cells"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prayer_cell_sessions" ADD CONSTRAINT "prayer_cell_sessions_startedById_fkey"
  FOREIGN KEY ("startedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "prayer_cell_session_participants" (
  "id"        TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "joinedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt"    TIMESTAMP(3),
  CONSTRAINT "prayer_cell_session_participants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "prayer_cell_session_participants_sessionId_userId_key" ON "prayer_cell_session_participants"("sessionId", "userId");
ALTER TABLE "prayer_cell_session_participants" ADD CONSTRAINT "prayer_cell_session_participants_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "prayer_cell_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prayer_cell_session_participants" ADD CONSTRAINT "prayer_cell_session_participants_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
