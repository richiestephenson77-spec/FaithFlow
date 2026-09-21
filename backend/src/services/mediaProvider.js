// Live-audio provider adapter.
//
// ─────────────────────────────────────────────────────────────────────────────
// STATUS: NO PROVIDER IS INTEGRATED. This file defines the seam and ships a
// null implementation that refuses honestly. Prayer Rooms can be created,
// scheduled, subscribed to and reminded about today; they CANNOT be joined
// with audio until a provider is chosen, an account exists, and a concrete
// adapter is written against this interface. Nothing here fakes a connection.
// ─────────────────────────────────────────────────────────────────────────────
//
// Why an adapter at all, when the app already has WebRTC code?
//
// It has `usePrayerCellMeshAudio`, which is a FULL-MESH peer-to-peer room:
// every participant opens one RTCPeerConnection per other participant, so a
// room of N costs each phone N-1 encrypted uplinks. Its own comment puts the
// ceiling at 6-8 people. Prayer Rooms are specified as SFU-based audio rooms,
// where each client sends one uplink to a server that fans it out — a
// different topology, not a tuning of the existing one. The mesh hook stays
// exactly as it is and keeps serving Prayer Cell sessions.
//
// The existing code also cannot meet two of the brief's security requirements:
// its TURN credentials are baked into the client bundle via REACT_APP_* vars
// (so they are public, long-lived and shared by every user), and it has no
// server-side notion of speaker vs listener — mute is a local track toggle any
// client could simply not perform. This interface fixes both by construction:
// tokens are minted server-side, scoped to one occurrence and one user, short
// lived, and carry the role the MEDIA LAYER enforces.

/**
 * @typedef {'HOST'|'COHOST'|'SPEAKER'|'LISTENER'} MediaRole
 *
 * @typedef {object} MediaToken
 * @property {string} token       Short-lived credential for exactly one user + room.
 * @property {string} url         Provider endpoint the client should connect to.
 * @property {Date}   expiresAt
 *
 * @typedef {object} NormalizedMediaEvent
 * @property {'participant_joined'|'participant_left'|'room_finished'} type
 * @property {string}  mediaRoomId
 * @property {string} [userId]          Our user id, round-tripped via token identity.
 * @property {string} [mediaSessionId]  Provider connection id — the idempotency key.
 * @property {Date}    occurredAt
 */

/**
 * The contract a concrete provider must satisfy. Every method is async and may
 * throw; callers treat a throw as "the room is unavailable", never as "the
 * user is not connected".
 */
class MediaProvider {
  /** Short identifier used in logs and the health endpoint. */
  get name() { return 'abstract'; }

  /** True only when credentials are present AND the adapter is implemented. */
  isConfigured() { return false; }

  /**
   * Allocate a room for one occurrence. Called when the host goes live, not at
   * schedule time — an unused room should never exist.
   * @returns {Promise<{ mediaRoomId: string }>}
   */
  async createRoom(/* { occurrenceId, maxParticipants } */) { throw notConfigured(); }

  /** Tear the room down. Must be idempotent. */
  async closeRoom(/* { mediaRoomId } */) { throw notConfigured(); }

  /**
   * Mint a credential for ONE user in ONE room, AFTER the server has checked
   * that they may join. Must be short-lived; must encode `role` so the media
   * layer — not the UI — decides who can transmit.
   *
   * Muted-by-default is a property of the token: a LISTENER is issued without
   * publish rights at all, so there is no client-side state that could be
   * flipped to open a microphone the user did not open.
   * @returns {Promise<MediaToken>}
   */
  async issueToken(/* { mediaRoomId, userId, role, ttlSeconds } */) { throw notConfigured(); }

  /** Promote/demote in the media layer (invite to speak, revoke). */
  async updateParticipantRole(/* { mediaRoomId, userId, role } */) { throw notConfigured(); }

  /** Host removal. The participant's transport is dropped provider-side. */
  async removeParticipant(/* { mediaRoomId, userId } */) { throw notConfigured(); }

  /**
   * Verify a webhook signature over the RAW body. Returning false must cause
   * the caller to reject the delivery — attendance is derived from these
   * events, so an unverified one is an attendance forgery.
   */
  verifyWebhook(/* rawBody, headers */) { return false; }

  /**
   * Map a provider payload onto NormalizedMediaEvent, or null to ignore it.
   * @returns {NormalizedMediaEvent|null}
   */
  parseWebhookEvent(/* body */) { return null; }
}

function notConfigured() {
  const err = new Error(
    'Live audio is not available yet: no media provider is configured for this deployment.',
  );
  err.status = 503;
  err.code = 'MEDIA_PROVIDER_NOT_CONFIGURED';
  return err;
}

/**
 * The shipped implementation. Refuses every call with a 503 the UI renders as
 * an honest "live audio isn't available yet" state.
 *
 * Deliberately NOT a simulator. A stub that returned a fake token and a fake
 * participant list would make the room look like it worked, and attendance
 * rows written from it would be fabricated history.
 */
class NullMediaProvider extends MediaProvider {
  get name() { return 'none'; }
  isConfigured() { return false; }
}

// Chosen from the environment so adding a real provider is a one-line change
// here plus a new file — no call site changes.
//
// When a provider is selected, it will need (names indicative, the concrete
// adapter fixes them): MEDIA_PROVIDER, MEDIA_API_KEY, MEDIA_API_SECRET,
// MEDIA_WS_URL, MEDIA_WEBHOOK_SECRET. All server-side only: none may be
// exposed through a REACT_APP_* variable, which is what went wrong with the
// existing TURN credentials.
function selectProvider() {
  const name = (process.env.MEDIA_PROVIDER || 'none').toLowerCase();
  switch (name) {
    case 'none':
    case '':
      return new NullMediaProvider();
    default:
      console.warn(
        `[mediaProvider] MEDIA_PROVIDER="${name}" is set but no adapter is implemented for it. ` +
        'Falling back to the null provider; live audio stays unavailable.',
      );
      return new NullMediaProvider();
  }
}

const provider = selectProvider();

module.exports = { MediaProvider, NullMediaProvider, provider, notConfigured };
