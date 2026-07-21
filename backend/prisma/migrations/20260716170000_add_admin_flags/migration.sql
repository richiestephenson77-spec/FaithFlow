-- Admin + suspension flags (set your own account isAdmin=true manually)
ALTER TABLE "users" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "isSuspended" BOOLEAN NOT NULL DEFAULT false;
