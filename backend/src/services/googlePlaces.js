// Google Places adapter — Places API (NEW), v1.
//
// ─────────────────────────────────────────────────────────────────────────────
// LEGACY vs NEW: this is a deliberate migration OFF the legacy endpoints
// (maps/api/place/nearbysearch|details|photo) that this feature used to call.
// The two are NOT mixed: nothing in this file touches maps.googleapis.com/
// maps/api/place, and nothing outside this file talks to Google at all.
//
// Why New:
//   * Legacy Places is on a sunset path and closed to new customers; building
//     a new directory on it means building on something being retired.
//   * The cost controls this feature is required to have — request exactly the
//     fields a screen needs, never more — are only expressible on New, via
//     X-Goog-FieldMask. Legacy returns a fixed payload per endpoint, so "don't
//     request reviews for every nearby card" is unenforceable there.
//   * The masks below map 1:1 onto New's SKU tiers, so the billing impact of
//     any change to this file is visible in this file.
//
// THE API KEY NEVER LEAVES THE SERVER. Legacy built photo URLs with
// `&key=...` and handed them to the browser, which published a server key in
// every <img> tag. Photos now go through photoMediaUri() below, which resolves
// a short-lived googleusercontent URI that carries no credential of ours.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = 'https://places.googleapis.com/v1';
const KEY = () => process.env.GOOGLE_PLACES_KEY;

// ── Field masks ─────────────────────────────────────────────────────────────
// Each constant is one SKU tier. Adding a field here can change what Google
// bills per request, so they are named for the tier they land in rather than
// inlined at call sites.

// Nearby Search — PRO tier. `photos` returns resource NAMES only; no image is
// fetched and nothing extra is billed until photoMediaUri() is called.
// Deliberately excludes rating, hours, phone and website: pulling those here
// would make every list request Enterprise and fan Details-tier cost across
// every card on screen.
const NEARBY_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.photos',
  'places.businessStatus',
  'places.googleMapsUri',
  'places.attributions',
].join(',');

// Place Details — ENTERPRISE tier, one request, only when a church is opened.
// No `reviews`: that is Enterprise + Atmosphere and is a separate request made
// only if the reader opens the reviews section.
const DETAILS_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'photos',
  'businessStatus',
  'googleMapsUri',
  'attributions',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'websiteUri',
  'regularOpeningHours',
  'currentOpeningHours',
  'utcOffsetMinutes',
  'rating',
  'userRatingCount',
].join(',');

// Reviews — ENTERPRISE + ATMOSPHERE. Requested on its own so the cost is only
// incurred by readers who actually open the section.
const REVIEWS_MASK = 'id,reviews,googleMapsUri';

// Text Search — PRO tier, for resolving a typed city / PIN / ZIP to a point.
// The Geocoding API would be cheaper but is not enabled on this project
// (verified: REQUEST_DENIED), and Text Search is already enabled.
const TEXT_SEARCH_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
].join(',');

class PlacesError extends Error {
  constructor(message, status, googleStatus) {
    super(message);
    this.status = status;
    this.googleStatus = googleStatus;
  }
}

/**
 * One place for every Google call, so logging, error shape and key handling
 * cannot drift between endpoints.
 *
 * Keeps the existing [PLACES] console.error contract: Google's own status and
 * message are logged server-side and never forwarded verbatim to the client,
 * because those strings can name the project and the key.
 */
async function callGoogle(path, { method = 'GET', mask, body } = {}) {
  const key = KEY();
  if (!key) throw new PlacesError('Church search is not configured', 503, 'NO_KEY');

  const headers = { 'X-Goog-Api-Key': key };
  if (mask) headers['X-Goog-FieldMask'] = mask;
  if (body) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    console.error('[PLACES] network', path, err.message);
    throw new PlacesError('Could not reach the church directory', 502, 'NETWORK');
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const g = json.error || {};
    console.error('[PLACES]', res.status, g.status || g.code, g.message);
    throw new PlacesError('Church directory is unavailable right now', 502, g.status || String(res.status));
  }
  return json;
}

// ── Normalisation ───────────────────────────────────────────────────────────
// Google's shapes are converted once, here, so no route or component learns
// the provider's response format.

/**
 * A photo is exposed to the client as an opaque REFERENCE plus its required
 * attribution — never as a URL we built. The client asks our own /photo
 * endpoint for the bytes, which is what keeps the key server-side and keeps
 * fetches lazy and countable.
 */
function normalizePhoto(p) {
  if (!p?.name) return null;
  return {
    ref: p.name,
    widthPx: p.widthPx ?? null,
    heightPx: p.heightPx ?? null,
    // Required attribution for Google photos: contributor name + profile link.
    attributions: (p.authorAttributions || []).map(a => ({
      displayName: a.displayName || null,
      uri: a.uri || null,
    })),
  };
}

/** The shape every list card is built from. Deliberately small. */
function normalizeNearbyPlace(p) {
  const photo = normalizePhoto(p.photos?.[0]);
  return {
    placeId: p.id,
    name: p.displayName?.text || null,
    nameLanguage: p.displayName?.languageCode || null,
    address: p.formattedAddress || null,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    businessStatus: p.businessStatus || null,
    googleMapsUri: p.googleMapsUri || null,
    // One photo per card, fetched lazily by the client.
    photo,
    photoCount: (p.photos || []).length,
    attributions: p.attributions || [],
  };
}

function normalizeDetails(p) {
  return {
    placeId: p.id,
    name: p.displayName?.text || null,
    nameLanguage: p.displayName?.languageCode || null,
    address: p.formattedAddress || null,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    businessStatus: p.businessStatus || null,
    googleMapsUri: p.googleMapsUri || null,
    phoneNational: p.nationalPhoneNumber || null,
    phoneInternational: p.internationalPhoneNumber || null,
    website: p.websiteUri || null,
    rating: p.rating ?? null,
    userRatingCount: p.userRatingCount ?? null,
    utcOffsetMinutes: p.utcOffsetMinutes ?? null,
    // BUILDING / OFFICE HOURS. These are Google's opening hours for the
    // premises. They are NOT worship service times and must never be rendered
    // as such, or used to derive one.
    openingHours: p.regularOpeningHours
      ? {
          weekdayDescriptions: p.regularOpeningHours.weekdayDescriptions || [],
          openNow: p.currentOpeningHours?.openNow ?? null,
        }
      : null,
    photos: (p.photos || []).map(normalizePhoto).filter(Boolean),
    attributions: p.attributions || [],
  };
}

// ── Public surface ──────────────────────────────────────────────────────────

/**
 * Churches near a point, nearest first.
 *
 * Bounded by Google (New Nearby Search returns at most 20) — this is a set of
 * nearby results, never an exhaustive directory of a city, and callers must
 * describe it that way.
 */
async function searchNearbyChurches({ lat, lng, radius }) {
  const json = await callGoogle('/places:searchNearby', {
    method: 'POST',
    mask: NEARBY_MASK,
    body: {
      includedTypes: ['church'],
      maxResultCount: 20,
      rankPreference: 'DISTANCE',
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius } },
    },
  });
  return (json.places || [])
    // Permanently closed and temporarily closed premises are not useful
    // results for someone trying to attend a service.
    .filter(p => p.businessStatus === 'OPERATIONAL')
    .map(normalizeNearbyPlace);
}

async function getPlaceDetails(placeId) {
  const json = await callGoogle(`/places/${encodeURIComponent(placeId)}`, { mask: DETAILS_MASK });
  return normalizeDetails(json);
}

/**
 * Reviews, on demand only. Google returns a limited selection, not every
 * review, and callers must say so rather than implying completeness.
 */
async function getPlaceReviews(placeId) {
  const json = await callGoogle(`/places/${encodeURIComponent(placeId)}`, { mask: REVIEWS_MASK });
  return {
    googleMapsUri: json.googleMapsUri || null,
    reviews: (json.reviews || []).map(r => ({
      name: r.name,
      rating: r.rating ?? null,
      text: r.originalText?.text || r.text?.text || null,
      languageCode: r.originalText?.languageCode || r.text?.languageCode || null,
      relativeTime: r.relativePublishTimeDescription || null,
      publishTime: r.publishTime || null,
      // Required attribution: the review author and a link to their profile.
      author: r.authorAttribution
        ? {
            displayName: r.authorAttribution.displayName || null,
            uri: r.authorAttribution.uri || null,
            photoUri: r.authorAttribution.photoUri || null,
          }
        : null,
      googleMapsUri: r.googleMapsUri || null,
    })),
  };
}

/**
 * Resolve a typed place name / PIN / ZIP to coordinates, within a country.
 * More than one result means genuinely ambiguous — the caller presents the
 * choices rather than guessing.
 */
async function searchLocations({ query, regionCode }) {
  const json = await callGoogle('/places:searchText', {
    method: 'POST',
    mask: TEXT_SEARCH_MASK,
    body: {
      textQuery: query,
      ...(regionCode ? { regionCode: regionCode.toUpperCase() } : {}),
      maxResultCount: 5,
    },
  });
  return (json.places || []).map(p => ({
    placeId: p.id,
    label: p.formattedAddress || p.displayName?.text || null,
    name: p.displayName?.text || null,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
  }));
}

/**
 * Turn a photo reference into a fetchable image URL.
 *
 * `skipHttpRedirect` gives us the URI as JSON instead of a 302, so the server
 * can hand the browser a short-lived googleusercontent link that contains NO
 * credential of ours. The bytes then travel Google -> browser directly: our
 * key stays private, we pay no egress, and nothing is copied or stored.
 * Verified: the returned URI does not contain the API key.
 */
async function photoMediaUri(photoRef, { maxWidthPx = 400 } = {}) {
  // Photo resource names look like `places/<id>/photos/<ref>`. Anything else
  // is refused rather than passed through to Google as an open proxy.
  if (!/^places\/[^/]+\/photos\/[A-Za-z0-9_\-]+$/.test(photoRef)) {
    throw new PlacesError('Invalid photo reference', 400, 'BAD_PHOTO_REF');
  }
  const width = Math.min(Math.max(parseInt(maxWidthPx, 10) || 400, 64), 1600);
  const json = await callGoogle(
    `/${photoRef}/media?maxWidthPx=${width}&skipHttpRedirect=true`,
  );
  if (!json.photoUri) throw new PlacesError('Photo unavailable', 404, 'NO_PHOTO');
  return json.photoUri;
}

module.exports = {
  PlacesError,
  searchNearbyChurches,
  getPlaceDetails,
  getPlaceReviews,
  searchLocations,
  photoMediaUri,
  // Exported for tests and for the cost report — these ARE the billing surface.
  MASKS: { NEARBY_MASK, DETAILS_MASK, REVIEWS_MASK, TEXT_SEARCH_MASK },
};
