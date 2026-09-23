-- ============================================================================
-- Church directory — Phase 1 identity
-- ============================================================================
-- STRICTLY ADDITIVE: two new tables. No DROP, no column removed, no existing
-- table altered. "users" is not referenced at all here, let alone modified —
-- Phase 1 has no user-owned directory data. A previous migration that altered
-- "users" broke login; this one issues no statement against any existing table.
--
-- The app's own `churches` / `church_follows` / `church_posts` tables are a
-- DIFFERENT feature (church pages with followers and posts) and are untouched.
-- The directory's entity is `church_listings` to keep the two distinct.
--
-- WHAT IS DELIBERATELY NOT HERE:
--   * No Google names, addresses, phone numbers, websites, photos, photo
--     references, reviews, opening hours or response JSON. Those are
--     request-scoped display data. The place ID is the only provider
--     identifier retained long term.
--   * No GoogleLocationCache. The brief permits an optional coordinates cache
--     with a hard 30-day expiry, and equally says to omit it initially if it
--     complicates policy enforcement. Omitted: with no cache there is no
--     retention window to police, no expiry sweeper to get wrong, and no way
--     for provider coordinates to leak into independent records.
--   * No independent name/address/coordinate columns. Phase 1 establishes no
--     independent facts, so storing empty columns for them would invite
--     something to quietly relabel copied Google data as independent.
--
-- Phases 2 and 3 extend this without reworking it: they add their tables
-- against church_listings.id (IndependentLocation, SourceRecord,
-- FieldAssertion, ChurchClaim, ChurchMembership, ChurchWebsite,
-- EnrichmentJob). Nothing below has to change for that.
--
-- Rollback is a plain DROP of these two tables in reverse FK order; no
-- existing row is read or written.
-- ============================================================================

-- One campus / congregation. In Phase 1 this is an ID-ONLY SHELL: everything
-- displayed about it still comes live from Google on each request.
CREATE TABLE "church_listings" (
    "id" TEXT NOT NULL,
    -- DRAFT | PUBLISHED | DISPUTED | ARCHIVED
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    -- Duplicate campuses are merged by pointing here, never by deleting a row,
    -- so inbound references stay resolvable.
    "mergedIntoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "church_listings_pkey" PRIMARY KEY ("id")
);

-- The listing <-> Google place ID link. Historical IDs are retained with
-- isCurrent = false, because Google occasionally reissues an ID for the same
-- premises and dropping the old one would orphan whatever Phase 2 attached.
CREATE TABLE "church_place_links" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "firstLinkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- "this identifier still resolved at this time" — not a cache of content.
    "lastIdCheckedAt" TIMESTAMP(3),

    CONSTRAINT "church_place_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "church_listings_status_idx" ON "church_listings"("status");
CREATE INDEX "church_listings_mergedIntoId_idx" ON "church_listings"("mergedIntoId");

-- One place maps to at most one listing.
CREATE UNIQUE INDEX "church_place_links_placeId_key" ON "church_place_links"("placeId");
CREATE INDEX "church_place_links_listingId_isCurrent_idx" ON "church_place_links"("listingId", "isCurrent");

ALTER TABLE "church_listings" ADD CONSTRAINT "church_listings_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "church_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "church_place_links" ADD CONSTRAINT "church_place_links_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "church_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Integrity Prisma cannot express ------------------------------------------
-- Exactly one CURRENT place ID per listing. A plain unique index would also
-- collapse the historical rows, so it is partial on isCurrent.
CREATE UNIQUE INDEX "church_place_links_one_current_per_listing"
  ON "church_place_links"("listingId") WHERE "isCurrent";

-- A listing cannot be merged into itself.
ALTER TABLE "church_listings"
  ADD CONSTRAINT "church_listings_no_self_merge"
  CHECK ("mergedIntoId" IS NULL OR "mergedIntoId" <> "id");
