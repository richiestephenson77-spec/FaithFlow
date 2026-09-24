-- ============================================================================
-- Profile field visibility (church / location)
-- ============================================================================
-- STRICTLY ADDITIVE: one new table. No DROP, no column removed, and NO ALTER
-- on "users" — it appears only on the right-hand side of REFERENCES. A
-- previous migration that altered "users" broke login; this one issues no
-- statement against it.
--
-- WHY A TABLE AND NOT TWO BOOLEAN COLUMNS ON users:
-- The obvious shape would be `users.showChurch` / `users.showLocation`
-- alongside the existing notify* flags, but the users table is off limits.
-- Keeping display preferences in their own row is also better shaped for what
-- comes next — more per-field visibility can be added here without ever
-- touching the account record.
--
-- SAFE DEFAULT FOR EXISTING USERS: absence means visible. Nobody gets a row
-- from this migration, and the resolver treats a missing row as "show it", so
-- every existing profile looks exactly as it did until its owner chooses to
-- hide something. There is no backfill, and no new private data is published
-- by default.
--
-- Rollback is a plain DROP of this one table; no existing row is read or
-- written.
-- ============================================================================

CREATE TABLE "user_profile_visibility" (
    "userId" TEXT NOT NULL,
    -- false hides the church name from anyone but the owner
    "showChurch" BOOLEAN NOT NULL DEFAULT true,
    -- false hides the broad location from anyone but the owner
    "showLocation" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profile_visibility_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "user_profile_visibility" ADD CONSTRAINT "user_profile_visibility_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
