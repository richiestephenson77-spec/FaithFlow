-- ============================================================================
-- Prayer Rooms — room admissions (the 25-person cap)
-- ============================================================================
-- STRICTLY ADDITIVE: one new table. No DROP, no column removed, no existing
-- table altered. "users", "prayer_cells", "prayer_cell_members" and the
-- existing prayer_room_* tables appear only to the right of REFERENCES — they
-- are pointed AT, never modified. A previous migration that altered "users"
-- broke login; this one issues no statement against it.
--
-- WHY A SEPARATE TABLE FROM prayer_room_attendance:
-- Attendance is history, written only from confirmed media-connection events.
-- An admission is a LIVE RESERVATION taken at the moment a room token is
-- issued, which is what the cap has to count — the cap must be decided BEFORE
-- anyone is handed a token, not discovered afterwards from attendance that
-- only exists once they have already connected.
--
-- The unique key on (occurrenceId, userId) is load-bearing: it is what makes a
-- RECONNECT free. A user who drops and comes back re-takes the same row rather
-- than consuming a second place.
--
-- Rollback is a plain DROP of this one table; no existing row is touched.
-- ============================================================================

CREATE TABLE "prayer_room_admissions" (
    "id" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "admittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Null while the place is held. Set on leave, on room end, or by the
    -- sweeper when an admission was never followed by a real connection.
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "prayer_room_admissions_pkey" PRIMARY KEY ("id")
);

-- One place per person per room. This is the reconnect guarantee.
CREATE UNIQUE INDEX "prayer_room_admissions_occurrenceId_userId_key" ON "prayer_room_admissions"("occurrenceId", "userId");
-- The cap counts held places for one occurrence; this index serves that count.
CREATE INDEX "prayer_room_admissions_occurrenceId_releasedAt_idx" ON "prayer_room_admissions"("occurrenceId", "releasedAt");

ALTER TABLE "prayer_room_admissions" ADD CONSTRAINT "prayer_room_admissions_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "prayer_room_occurrences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prayer_room_admissions" ADD CONSTRAINT "prayer_room_admissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
