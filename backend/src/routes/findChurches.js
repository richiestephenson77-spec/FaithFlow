const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');
const places = require('../services/googlePlaces');

// Church directory — Phase 1.
//
// Every Google call goes through services/googlePlaces.js (Places API NEW).
// Nothing here builds a Google URL, and the API key never reaches the client.
//
// COST SHAPE, since this is the billing surface:
//   GET /nearby             1 Nearby Search (Pro)          per search
//   GET /details/:placeId   1 Place Details (Enterprise)   per church OPENED
//   GET /:placeId/reviews   1 Place Details (Atmosphere)   per reviews OPEN
//   GET /photo              1 Photo request                per image ACTUALLY shown
//   GET /locations          1 Text Search (Pro)            per submitted search
// There is deliberately no details fanout: a list of 20 cards costs one
// Nearby request, not 20 Details requests.

/** Google spend is per request, so the endpoints that cost money are capped. */
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id || 'anon',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: 'Too many searches. Please slow down.' }),
});

// The photo endpoint is the ONE route here without `authenticate`, and that is
// a deliberate trade, not an oversight: a browser <img src> cannot send an
// Authorization header, and the alternatives are worse — a JWT in a query
// string ends up in logs and Referer headers, and fetching every thumbnail as
// an authenticated blob would defeat lazy loading and browser caching.
//
// What stops it being abused:
//   * it returns nothing but a redirect to a Google image — no user data,
//   * the ref is strictly validated against the `places/<id>/photos/<ref>`
//     shape, so it cannot be used as an open proxy to arbitrary URLs,
//   * refs are only obtainable from the authenticated search endpoints,
//   * and it is rate limited per client IP, which is what actually bounds
//     Photo-SKU spend. IP derivation matches middleware/authRateLimit.js so
//     the global trust-proxy setup stays untouched.
const photoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const fwd = req.headers['x-forwarded-for'];
    const ip = (typeof fwd === 'string' && fwd.split(',')[0].trim()) || req.ip || 'unknown';
    return ipKeyGenerator(ip);
  },
  validate: { xForwardedForHeader: false, trustProxy: false },
  handler: (req, res) => res.status(429).send(''),
});

const h = (fn) => (req, res) => fn(req, res).catch((err) => {
  if (err?.status) return res.status(err.status).json({ error: err.message });
  console.error('[churches]', req.method, req.path, err);
  res.status(500).json({ error: 'Something went wrong' });
});

/**
 * Google detail payloads are display-only. Marking them no-store keeps them
 * out of intermediary caches, the browser's HTTP cache and any service worker,
 * which is what "do not persist provider content" means in practice.
 */
function noStore(res) {
  res.set('Cache-Control', 'no-store, private');
}

function parseCoord(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

/**
 * GET /api/find-churches/nearby?lat&lng&radius
 *
 * Bounded nearby results (Google returns at most 20), nearest first. This is
 * NOT an exhaustive directory of a city and the client says so.
 */
router.get('/nearby', authenticate, searchLimiter, h(async (req, res) => {
  const lat = parseCoord(req.query.lat, -90, 90);
  const lng = parseCoord(req.query.lng, -180, 180);
  if (lat === null || lng === null) {
    return res.status(400).json({ error: 'A valid location is required' });
  }
  const radius = Math.min(Math.max(parseInt(req.query.radius, 10) || 5000, 500), 50000);

  const churches = await places.searchNearbyChurches({ lat, lng, radius });
  noStore(res);
  res.json({
    churches,
    radius,
    origin: { lat, lng },
    // Honest framing, carried in the payload so the UI cannot forget it.
    resultsAreBounded: true,
    attribution: 'Powered by Google',
  });
}));

/**
 * GET /api/find-churches/locations?q&country
 * Resolve a typed city / PIN / ZIP. More than one result means ambiguous and
 * the client must ask which one — it never guesses.
 */
router.get('/locations', authenticate, searchLimiter, h(async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (query.length < 2) return res.status(400).json({ error: 'Type a place, PIN or ZIP code' });
  const country = String(req.query.country || '').trim().slice(0, 2) || null;

  const results = await places.searchLocations({ query, regionCode: country });
  noStore(res);
  res.json({ results, ambiguous: results.length > 1 });
}));

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

/**
 * GET /api/find-churches/details/:placeId
 *
 * One Enterprise Details request, made only when a church is opened. Reviews
 * are NOT included — they are a separate SKU and a separate endpoint.
 *
 * The response keeps Google-sourced sections explicitly labelled and separate
 * from independent content, of which Phase 1 has none.
 */
router.get('/details/:placeId', authenticate, searchLimiter, h(async (req, res) => {
  const details = await places.getPlaceDetails(req.params.placeId);
  noStore(res);
  res.json({
    google: details,
    // Everything independent is empty in Phase 1, and says why rather than
    // rendering as a broken or missing section.
    independent: {
      available: false,
      reason: 'NOT_CLAIMED',
      worshipServices: [],
      weeklyActivities: [],
      denomination: null,
      languages: [],
      leadership: [],
      officeHours: [],
      photos: [],
      socialLinks: [],
    },
    // Source disclosure, per section, so the UI never has to invent a label.
    sources: {
      profile: { kind: 'GOOGLE', label: 'From Google', retrievedAt: new Date().toISOString() },
      worshipServices: { kind: 'NONE', label: 'Not available' },
      buildingHours: details.openingHours
        ? { kind: 'GOOGLE', label: 'Building / office hours — Google listing' }
        : { kind: 'NONE', label: 'Not available' },
    },
    managedByChurch: false,
    attribution: 'Powered by Google',
  });
}));

/**
 * GET /api/find-churches/details/:placeId/reviews
 * Separate on purpose: Atmosphere data is only billed for readers who open
 * the section. Google returns a selection, never the full set.
 */
router.get('/details/:placeId/reviews', authenticate, searchLimiter, h(async (req, res) => {
  const data = await places.getPlaceReviews(req.params.placeId);
  noStore(res);
  res.json({
    ...data,
    partial: true,
    note: 'A selection of Google reviews, not all of them.',
    attribution: 'Powered by Google',
  });
}));

/**
 * GET /api/find-churches/photo?ref=<photo resource name>&w=400
 *
 * The whole reason this endpoint exists: the previous implementation built
 * photo URLs containing the server API key and shipped them to the browser.
 * Here the key stays on the server, and the client is redirected to a
 * short-lived Google URL that carries no credential of ours.
 *
 * Nothing is stored. Photo references expire; that is expected and correct.
 */
router.get('/photo', photoLimiter, h(async (req, res) => {
  const ref = String(req.query.ref || '');
  const uri = await places.photoMediaUri(ref, { maxWidthPx: req.query.w });
  // Short private cache: enough that one screen's scroll does not re-bill the
  // same image, far short of anything that would count as retention.
  res.set('Cache-Control', 'private, max-age=300');
  // A bare 302 with NO body. res.redirect() would attach a small text/html
  // body, and Chrome's Opaque Response Blocking then refuses the whole
  // response for a cross-origin <img> — ERR_BLOCKED_BY_ORB, and every photo
  // silently falls back to the illustration. Nothing to sniff, nothing to
  // block; the browser just follows the Location to the image.
  res.status(302).set('Location', uri).end();
}));

// ---------------------------------------------------------------------------
// Listing identity
// ---------------------------------------------------------------------------

/**
 * POST /api/find-churches/:placeId/listing
 *
 * Idempotently exchange a Google place ID for our own ID-only listing shell,
 * so independent facts have something stable to attach to.
 *
 * Deliberately NOT called on read. A normal browse must not write rows, or the
 * table becomes a mirror of everything anyone happened to scroll past — which
 * is the "bulk copied Google directory" the policy forbids. Phase 2 calls this
 * at the moment a user actually acts (claim, correction, add).
 */
router.post('/:placeId/listing', authenticate, h(async (req, res) => {
  const placeId = String(req.params.placeId || '').trim();
  if (!placeId) return res.status(400).json({ error: 'placeId is required' });

  const existing = await prisma.churchPlaceLink.findUnique({
    where: { placeId },
    select: { listingId: true },
  });
  if (existing) return res.json({ listingId: existing.listingId, created: false });

  // Only the ID is written. No name, address or coordinates — there is nothing
  // independent to record yet, and copying Google's is exactly what must not
  // happen.
  const listing = await prisma.churchListing.create({
    data: { placeLinks: { create: { placeId } } },
    select: { id: true },
  });
  res.status(201).json({ listingId: listing.id, created: true });
}));

module.exports = router;
