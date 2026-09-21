-- ============================================================================
-- Prayer Rooms — scheduled + live audio prayer sessions
-- ============================================================================
-- STRICTLY ADDITIVE. Seven new tables, nothing else. In particular:
--   * "users" is NEVER a DDL target here. It appears only on the right-hand
--     side of REFERENCES, i.e. the new tables point AT it. The Prisma relation
--     fields added to model User are virtual back-relations and generate no
--     column. A previous migration that altered "users" broke login; this one
--     cannot, because it issues no statement against that table.
--   * prayer_cells, prayer_cell_members, prayer_cell_sessions and
--     prayer_requests are likewise only referenced, never altered. Prayer
--     Cells keep their own membership, admins, join requests and live-session
--     flow exactly as they are; a Prayer Room may optionally belong to a cell.
--
-- Rollback is a plain DROP of the seven tables in reverse FK order; no
-- existing row is modified, so nothing needs restoring.
-- ============================================================================

-- 1. Series — the template, holding the recurrence rule as a LOCAL WALL CLOCK
--    ("every day at 07:00 in Europe/London"), never as an interval. See
--    src/utils/zonedTime.js: occurrence instants are derived from
--    (startLocalDate, localTime, timeZone, recurrence, weekdays).
CREATE TABLE "prayer_room_series" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "hostId" TEXT NOT NULL,
    "cellId" TEXT,
    "timeZone" TEXT NOT NULL,                                 -- IANA zone id
    "localTime" TEXT NOT NULL,                                -- "HH:MM"
    "startLocalDate" TEXT NOT NULL,                           -- "YYYY-MM-DD"
    "untilLocalDate" TEXT,                                    -- inclusive, nullable
    "recurrence" TEXT NOT NULL DEFAULT 'NONE',                -- NONE | DAILY | WEEKLY
    "weekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],          -- WEEKLY only, 0=Sun
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "audience" TEXT NOT NULL DEFAULT 'PUBLIC',                -- PUBLIC | CELL | INVITE
    "kind" TEXT NOT NULL DEFAULT 'STANDARD',                  -- STANDARD | DAILY_PRAYER
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',                  -- ACTIVE | CANCELED
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prayer_room_series_pkey" PRIMARY KEY ("id")
);

-- 2. Occurrences — concrete instances. Schedule-bearing fields are COPIED from
--    the series at materialization so that editing the series later cannot
--    rewrite what already happened.
CREATE TABLE "prayer_room_occurrences" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "scheduledStartUtc" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "titleOverride" TEXT,                                     -- "edit this occurrence"
    "descriptionOverride" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',               -- SCHEDULED | LIVE | ENDED | CANCELED
    "actualStartedAt" TIMESTAMP(3),
    "actualEndedAt" TIMESTAMP(3),
    "rescheduledFromUtc" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "canceledReason" TEXT,
    "hostNoShow" BOOLEAN NOT NULL DEFAULT false,
    "mediaRoomId" TEXT,                                       -- provider room id, null until live

    CONSTRAINT "prayer_room_occurrences_pkey" PRIMARY KEY ("id")
);

-- 3. Attendance — one CONNECTED INTERVAL per row, not one participant. A
--    reconnect opens a second row rather than overwriting the first, so
--    connected time is the SUM of intervals and a flaky network cannot erase
--    earlier time. Written from confirmed media-connection events only.
CREATE TABLE "prayer_room_attendance" (
    "id" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL,
    "leftAt" TIMESTAMP(3),
    "connectedSeconds" INTEGER,                               -- server-computed on close
    "mediaSessionId" TEXT,                                    -- provider connection id
    "closedBy" TEXT,                                          -- MEDIA | SWEEPER

    CONSTRAINT "prayer_room_attendance_pkey" PRIMARY KEY ("id")
);

-- 4. Subscriptions — either a series subscription or a single-occurrence
--    reminder. `muted` on an occurrence row is the opt-out for one instance of
--    a series you are otherwise subscribed to.
CREATE TABLE "prayer_room_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seriesId" TEXT,
    "occurrenceId" TEXT,
    "remindMinutesBefore" INTEGER NOT NULL DEFAULT 10,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prayer_room_subscriptions_pkey" PRIMARY KEY ("id")
);

-- 5. Roles — co-hosts and invitations, at series level so both persist across
--    occurrences. INVITEE is also what grants access when audience = 'INVITE'.
CREATE TABLE "prayer_room_roles" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,                                     -- COHOST | INVITEE
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prayer_room_roles_pkey" PRIMARY KEY ("id")
);

-- 6. Linked requests — a LINK to an existing Prayer-page request, never a
--    copy. The request keeps its own row, owner and visibility.
CREATE TABLE "prayer_room_linked_requests" (
    "id" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "prayerRequestId" TEXT NOT NULL,
    "linkedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prayer_room_linked_requests_pkey" PRIMARY KEY ("id")
);

-- 7. Notification ledger — idempotency for the reminder sweeper, which runs on
--    an interval and may overlap itself or restart mid-pass.
CREATE TABLE "prayer_room_notification_log" (
    "id" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,                                     -- REMINDER | STARTED | RESCHEDULED | CANCELED | INVITED
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prayer_room_notification_log_pkey" PRIMARY KEY ("id")
);

-- Indexes -------------------------------------------------------------------
CREATE INDEX "prayer_room_series_hostId_idx" ON "prayer_room_series"("hostId");
CREATE INDEX "prayer_room_series_cellId_idx" ON "prayer_room_series"("cellId");
CREATE INDEX "prayer_room_series_kind_status_idx" ON "prayer_room_series"("kind", "status");

-- The unique key is what stops the materializer writing the same occurrence
-- twice when two requests expand a series concurrently.
CREATE UNIQUE INDEX "prayer_room_occurrences_seriesId_scheduledStartUtc_key" ON "prayer_room_occurrences"("seriesId", "scheduledStartUtc");
CREATE INDEX "prayer_room_occurrences_status_scheduledStartUtc_idx" ON "prayer_room_occurrences"("status", "scheduledStartUtc");
CREATE INDEX "prayer_room_occurrences_scheduledStartUtc_idx" ON "prayer_room_occurrences"("scheduledStartUtc");

-- Duplicate and out-of-order webhook deliveries are made idempotent by this
-- key: the provider's own connection id may appear at most once per occurrence.
CREATE UNIQUE INDEX "prayer_room_attendance_occurrenceId_mediaSessionId_key" ON "prayer_room_attendance"("occurrenceId", "mediaSessionId");
CREATE INDEX "prayer_room_attendance_occurrenceId_userId_idx" ON "prayer_room_attendance"("occurrenceId", "userId");
CREATE INDEX "prayer_room_attendance_userId_idx" ON "prayer_room_attendance"("userId");

-- Postgres treats NULLs as distinct in a unique index, so these two keys allow
-- ONE series row and MANY occurrence rows per user, which is exactly the shape
-- we want.
CREATE UNIQUE INDEX "prayer_room_subscriptions_userId_seriesId_key" ON "prayer_room_subscriptions"("userId", "seriesId");
CREATE UNIQUE INDEX "prayer_room_subscriptions_userId_occurrenceId_key" ON "prayer_room_subscriptions"("userId", "occurrenceId");
CREATE INDEX "prayer_room_subscriptions_seriesId_idx" ON "prayer_room_subscriptions"("seriesId");
CREATE INDEX "prayer_room_subscriptions_occurrenceId_idx" ON "prayer_room_subscriptions"("occurrenceId");

CREATE UNIQUE INDEX "prayer_room_roles_seriesId_userId_key" ON "prayer_room_roles"("seriesId", "userId");
CREATE INDEX "prayer_room_roles_userId_idx" ON "prayer_room_roles"("userId");

CREATE UNIQUE INDEX "prayer_room_linked_requests_occurrenceId_prayerRequestId_key" ON "prayer_room_linked_requests"("occurrenceId", "prayerRequestId");
CREATE INDEX "prayer_room_linked_requests_occurrenceId_idx" ON "prayer_room_linked_requests"("occurrenceId");

CREATE UNIQUE INDEX "prayer_room_notification_log_occurrenceId_userId_kind_key" ON "prayer_room_notification_log"("occurrenceId", "userId", "kind");
CREATE INDEX "prayer_room_notification_log_occurrenceId_idx" ON "prayer_room_notification_log"("occurrenceId");

-- Foreign keys --------------------------------------------------------------
-- NOTE: every ALTER below targets a prayer_room_* table. "users",
-- "prayer_cells" and "prayer_requests" are referenced, never altered.
ALTER TABLE "prayer_room_series" ADD CONSTRAINT "prayer_room_series_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prayer_room_series" ADD CONSTRAINT "prayer_room_series_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "prayer_cells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "prayer_room_occurrences" ADD CONSTRAINT "prayer_room_occurrences_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "prayer_room_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "prayer_room_attendance" ADD CONSTRAINT "prayer_room_attendance_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "prayer_room_occurrences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prayer_room_attendance" ADD CONSTRAINT "prayer_room_attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "prayer_room_subscriptions" ADD CONSTRAINT "prayer_room_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prayer_room_subscriptions" ADD CONSTRAINT "prayer_room_subscriptions_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "prayer_room_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prayer_room_subscriptions" ADD CONSTRAINT "prayer_room_subscriptions_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "prayer_room_occurrences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "prayer_room_roles" ADD CONSTRAINT "prayer_room_roles_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "prayer_room_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prayer_room_roles" ADD CONSTRAINT "prayer_room_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "prayer_room_linked_requests" ADD CONSTRAINT "prayer_room_linked_requests_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "prayer_room_occurrences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prayer_room_linked_requests" ADD CONSTRAINT "prayer_room_linked_requests_prayerRequestId_fkey" FOREIGN KEY ("prayerRequestId") REFERENCES "prayer_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prayer_room_linked_requests" ADD CONSTRAINT "prayer_room_linked_requests_linkedById_fkey" FOREIGN KEY ("linkedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "prayer_room_notification_log" ADD CONSTRAINT "prayer_room_notification_log_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "prayer_room_occurrences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prayer_room_notification_log" ADD CONSTRAINT "prayer_room_notification_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Integrity the Prisma schema cannot express -------------------------------
-- A subscription is either series-scoped or occurrence-scoped, never both and
-- never neither. Without this a NULL/NULL row would slip past both unique
-- keys and become an orphan the sweeper could never resolve.
ALTER TABLE "prayer_room_subscriptions"
  ADD CONSTRAINT "prayer_room_subscriptions_scope_check"
  CHECK (("seriesId" IS NOT NULL) <> ("occurrenceId" IS NOT NULL));

-- An interval cannot end before it began.
ALTER TABLE "prayer_room_attendance"
  ADD CONSTRAINT "prayer_room_attendance_interval_check"
  CHECK ("leftAt" IS NULL OR "leftAt" >= "joinedAt");
