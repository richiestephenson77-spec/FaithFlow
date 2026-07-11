-- AlterTable: single-emoji tapback reaction on a message (v1 — one reaction per message)
ALTER TABLE "messages" ADD COLUMN "reaction" TEXT;
