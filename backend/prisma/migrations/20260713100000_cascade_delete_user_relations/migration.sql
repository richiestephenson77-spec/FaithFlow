-- Add ON DELETE CASCADE to the User/PrayerCell relations that were missing it.
-- Without these, prisma.user.delete() (account deletion) fails with a foreign-key
-- violation for any user who has hosted a prayer cell, joined one as a guest, or
-- has a prayer partnership / partner request — leaving their PII undeletable.

-- PrayerCell.host -> users
ALTER TABLE "prayer_cells" DROP CONSTRAINT IF EXISTS "prayer_cells_hostId_fkey";
ALTER TABLE "prayer_cells" ADD CONSTRAINT "prayer_cells_hostId_fkey"
  FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PrayerCellSession.cell -> prayer_cells
ALTER TABLE "prayer_cell_sessions" DROP CONSTRAINT IF EXISTS "prayer_cell_sessions_cellId_fkey";
ALTER TABLE "prayer_cell_sessions" ADD CONSTRAINT "prayer_cell_sessions_cellId_fkey"
  FOREIGN KEY ("cellId") REFERENCES "prayer_cells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PrayerCellSession.guest -> users
ALTER TABLE "prayer_cell_sessions" DROP CONSTRAINT IF EXISTS "prayer_cell_sessions_guestId_fkey";
ALTER TABLE "prayer_cell_sessions" ADD CONSTRAINT "prayer_cell_sessions_guestId_fkey"
  FOREIGN KEY ("guestId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PrayerPartnership.user1 -> users
ALTER TABLE "prayer_partnerships" DROP CONSTRAINT IF EXISTS "prayer_partnerships_user1Id_fkey";
ALTER TABLE "prayer_partnerships" ADD CONSTRAINT "prayer_partnerships_user1Id_fkey"
  FOREIGN KEY ("user1Id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PrayerPartnership.user2 -> users
ALTER TABLE "prayer_partnerships" DROP CONSTRAINT IF EXISTS "prayer_partnerships_user2Id_fkey";
ALTER TABLE "prayer_partnerships" ADD CONSTRAINT "prayer_partnerships_user2Id_fkey"
  FOREIGN KEY ("user2Id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PrayerPartnerRequest.user -> users
ALTER TABLE "prayer_partner_requests" DROP CONSTRAINT IF EXISTS "prayer_partner_requests_userId_fkey";
ALTER TABLE "prayer_partner_requests" ADD CONSTRAINT "prayer_partner_requests_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
