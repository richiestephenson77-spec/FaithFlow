// ============================================================================
// PLACEHOLDER DATA — NOT REAL. Delete this whole file once the backend lands.
// ============================================================================
// Two inbox features in the design have no backend behind them yet:
//
//   1. NOTES — there is no `Note` model, route or socket event anywhere in the
//      app. The note TEXT below is invented. To keep the row looking right it
//      is attached to REAL people (drawn from your actual conversations), so
//      the avatars, names and tints you see are genuine — only the note text
//      and the "has a note" flag are fabricated.
//
//   2. PRESENCE (online dots) — the server DOES track live sockets in
//      `connectedUsers` (socketService.js) but never exposes them: there is no
//      presence endpoint and no presence socket event. So online status here is
//      fabricated. Wiring it for real is a small addition — emit presence on
//      connect/disconnect, or add GET /users/presence?ids=…
//
// Everything else in the inbox is wired to real data.

const SAMPLE_NOTES = [
  'praying for you today 🙏',
  'psalm 23 hit different',
  'grateful for this week',
  'need wisdom, pray w/ me',
  'He is faithful',
  'church was so good',
];

// Builds the notes row from real people you actually have threads with.
// `me` is the logged-in user and always occupies the first slot.
export function buildStubNotes(me, convos) {
  const own = {
    id: 'own',
    isOwn: true,
    user: me,
    text: '',                    // empty -> renders the "Share a note…" prompt
    subLabel: 'Add to story',
    online: false,
  };

  const others = (convos || []).slice(0, 6).map((c, i) => ({
    id: `note-${c.id}`,
    isOwn: false,
    user: c.other,
    text: SAMPLE_NOTES[i % SAMPLE_NOTES.length],
    online: i % 3 === 0,          // fabricated
  })).filter(n => n.user);

  return [own, ...others];
}

// Which people are shown as having an active note (drives the tinted ring on
// their thread row). Derived from the same fabricated set above.
export function stubNoteUserIds(notes) {
  return new Set((notes || []).filter(n => !n.isOwn && n.user?.id).map(n => n.user.id));
}

// Fabricated presence for thread rows — same caveat as above.
export function stubOnlineUserIds(convos) {
  return new Set((convos || []).filter((_, i) => i % 3 === 0).map(c => c.other?.id).filter(Boolean));
}
