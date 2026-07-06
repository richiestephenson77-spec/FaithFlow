-- Add gender to users
ALTER TABLE "users" ADD COLUMN "gender" TEXT;

-- Add PRAYER_PARTNER_MATCHED to NotificationType enum
ALTER TYPE "NotificationType" ADD VALUE 'PRAYER_PARTNER_MATCHED';

-- Create prayer_partnerships table
CREATE TABLE "prayer_partnerships" (
    "id" TEXT NOT NULL,
    "user1Id" TEXT NOT NULL,
    "user2Id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prayer_partnerships_pkey" PRIMARY KEY ("id")
);

-- Create prayer_partner_requests table
CREATE TABLE "prayer_partner_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "gender" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prayer_partner_requests_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on partnerships
ALTER TABLE "prayer_partnerships" ADD CONSTRAINT "prayer_partnerships_user1Id_user2Id_key" UNIQUE ("user1Id", "user2Id");

-- Foreign keys
ALTER TABLE "prayer_partnerships" ADD CONSTRAINT "prayer_partnerships_user1Id_fkey" FOREIGN KEY ("user1Id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prayer_partnerships" ADD CONSTRAINT "prayer_partnerships_user2Id_fkey" FOREIGN KEY ("user2Id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prayer_partner_requests" ADD CONSTRAINT "prayer_partner_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
