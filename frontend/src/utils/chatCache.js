// In-memory stale-while-revalidate cache for chat.
//
// Survives client-side navigation (this module stays alive for the SPA
// session) and is cleared on a full page reload. Its job is to let the
// conversation LIST and a thread's MESSAGE LIST paint instantly from the last
// known data while a fresh fetch runs in the background. Per-conversation
// SETTINGS are cached too for an instant paint, but callers still refetch them
// so vanish/theme/receipt correctness is never served stale.
const threads = new Map(); // conversationId -> { messages, settings, other }
let conversations = null;

export const chatCache = {
  getThread: (id) => threads.get(id) || null,
  patchThread: (id, data) => { threads.set(id, { ...(threads.get(id) || {}), ...data }); },
  getConversations: () => conversations,
  setConversations: (list) => { conversations = list; },
  clear: () => { threads.clear(); conversations = null; },
};
