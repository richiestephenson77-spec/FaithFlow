-- Vanish mode becomes a selectable string (off | after_seen | 24h | 7d | 30d).
-- Migrate existing boolean values: false -> 'off', true -> 'after_seen'.
ALTER TABLE "conversation_participants" ALTER COLUMN "vanishMode" DROP DEFAULT;
ALTER TABLE "conversation_participants" ALTER COLUMN "vanishMode" TYPE TEXT
  USING (CASE WHEN "vanishMode" THEN 'after_seen' ELSE 'off' END);
ALTER TABLE "conversation_participants" ALTER COLUMN "vanishMode" SET DEFAULT 'off';

-- Timed-vanish expiry (sentAt + duration); null for off/after_seen.
ALTER TABLE "messages" ADD COLUMN "expiresAt" TIMESTAMP(3);
