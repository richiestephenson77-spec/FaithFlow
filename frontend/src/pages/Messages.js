import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, MoreHorizontal, SquarePen, Search as SearchIcon, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../utils/api';
import Avatar from '../components/Avatar';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import PullToRefresh from '../components/PullToRefresh';
import { hapticLight } from '../utils/haptics';
import { chatCache } from '../utils/chatCache';
import NotesRow from '../components/inbox/NotesRow';
import FilterPills from '../components/inbox/FilterPills';
import ThreadRow from '../components/inbox/ThreadRow';
import InboxTabBar from '../components/inbox/InboxTabBar';
import { TINT_BY_ID, ACCENT, BORDER, CLAY, FAINT, INK, MUTED, RECESS, SURFACE } from '../utils/inboxTints';
import { buildStubNotes, stubNoteUserIds, stubOnlineUserIds } from '../utils/inboxStubs';

const COLUMN_WIDTH = 430;

function getTimeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// Last message can be text, a voice note, an image or a shared prayer.
function previewOf(lastMessage) {
  if (!lastMessage) return 'Start the conversation';
  if (lastMessage.isDeleted) return 'Message unsent';
  if (lastMessage.content) return lastMessage.content;
  if (lastMessage.audioUrl) return 'Voice message';
  if (lastMessage.imageUrl) return 'Photo';
  if (lastMessage.sharedPrayerRequestId) return 'Shared a prayer request';
  return 'Start the conversation';
}

export default function Messages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadMessages } = useSocket();
  const searchInputRef = useRef(null);
  const pillsRef = useRef(null);

  // Stale-while-revalidate: paint the cached list instantly, refresh in bg.
  const [convos, setConvos] = useState(() => chatCache.getConversations() || []);
  const [loading, setLoading] = useState(() => !chatCache.getConversations());
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [startingConvo, setStartingConvo] = useState(null);
  const [convoError, setConvoError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [partnerId, setPartnerId] = useState(null);

  const loadConvos = useCallback(() => {
    return api.get('/messages/conversations')
      .then(res => { setConvos(res.data); chatCache.setConversations(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadConvos(); }, [loadConvos]);

  // REAL: the active prayer partner drives the "Prayer partner" label and the
  // Partners filter. The app pairs you with ONE partner at a time.
  useEffect(() => {
    api.get('/prayer-partners/status')
      .then(res => setPartnerId(res.data?.status === 'MATCHED' ? res.data.partner?.id || null : null))
      .catch(() => {});
  }, []);

  // ---- STUBBED (see utils/inboxStubs.js) ----
  const notes = useMemo(() => buildStubNotes(user, convos), [user, convos]);
  const noteUserIds = useMemo(() => stubNoteUserIds(notes), [notes]);
  const onlineUserIds = useMemo(() => stubOnlineUserIds(convos), [convos]);

  // Map raw conversations -> the shape ThreadRow renders. Everything here is
  // real except `hasNote` / `online`, which come from the stub sets above.
  const rows = useMemo(() => convos.map(c => ({
    id: c.id,
    other: c.other,
    unread: c.unread || 0,
    preview: previewOf(c.lastMessage),
    time: getTimeAgo(c.updatedAt),
    lastSenderId: c.lastMessage?.senderId || null,
    label: c.other?.id && c.other.id === partnerId
      ? { text: 'Prayer partner', color: TINT_BY_ID.gold.ring }
      : null,
    hasNote: noteUserIds.has(c.other?.id),
    online: onlineUserIds.has(c.other?.id),
    allowsVideo: true, // every 1:1 thread supports calling (see CallOverlay)
  })), [convos, partnerId, noteUserIds, onlineUserIds]);

  // Filters operate on the real list; each count is its own filtered length.
  const byFilter = useMemo(() => ({
    all: rows,
    partners: rows.filter(r => r.label),
    // No group conversations exist yet — see the report. Intentionally empty
    // rather than silently showing 1:1 threads under a "Circles" label.
    circles: [],
    // "Awaiting your reply": they sent last and it's still unread.
    requests: rows.filter(r => r.unread > 0 && r.lastSenderId && r.lastSenderId !== user?.id),
  }), [rows, user]);

  const filters = [
    { id: 'all', label: 'All', count: byFilter.all.length },
    { id: 'partners', label: 'Partners', count: byFilter.partners.length },
    { id: 'circles', label: 'Circles', count: byFilter.circles.length },
    { id: 'requests', label: 'Requests', count: byFilter.requests.length },
  ];

  const filtered = byFilter[activeFilter] || rows;

  // Local text search over the real threads (name + preview).
  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter(r =>
      (r.other?.name || '').toLowerCase().includes(q) || (r.preview || '').toLowerCase().includes(q)
    );
  }, [filtered, search]);

  async function handleSearch(val) {
    setSearch(val);
    if (val.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(val)}`);
      setSearchResults(res.data);
    } catch {}
    setSearching(false);
  }

  async function startConvo(userId) {
    if (startingConvo) return;
    setStartingConvo(userId);
    setConvoError(null);
    try {
      const res = await api.post('/messages/conversations', { userId });
      navigate(`/messages/${res.data.id}`);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || err.message || 'Something went wrong';
      setConvoError(msg);
      setStartingConvo(null);
    }
  }

  function openThread(row) {
    hapticLight();
    navigate(`/messages/${row.id}`);
  }

  function openNote(note) {
    // STUB: notes aren't a real feature yet. Own note -> composer, others ->
    // that person's thread if one exists.
    if (note.isOwn) { searchInputRef.current?.focus(); return; }
    const row = rows.find(r => r.other?.id === note.user?.id);
    if (row) openThread(row);
  }

  const showUserSearch = search.trim().length >= 2;

  return (
    <PullToRefresh onRefresh={loadConvos}>
      <div
        className="min-h-full mx-auto"
        style={{
          background: SURFACE,
          maxWidth: COLUMN_WIDTH,
          borderLeft: `1px solid ${BORDER}`,
          borderRight: `1px solid ${BORDER}`,
          paddingBottom: 110,
        }}
      >
        {/* 1 — HEADER */}
        <div
          className="sticky top-0 z-20 flex items-center gap-2"
          style={{ background: SURFACE, padding: '12px 16px' }}
        >
          <button onClick={() => navigate(-1)} aria-label="Back" className="flex-shrink-0 -ml-1">
            <ChevronLeft size={25} strokeWidth={1.9} color={INK} />
          </button>

          <button className="flex items-center gap-1 min-w-0 flex-1" aria-label="Account">
            <span
              className="truncate"
              style={{ fontSize: 16, fontWeight: 600, color: INK, letterSpacing: '-0.2px' }}
            >
              {user?.name || 'Account'}
            </span>
            <ChevronDown size={17} strokeWidth={2.2} color={INK} className="flex-shrink-0" />
            {unreadMessages > 0 && (
              <span className="rounded-full flex-shrink-0" style={{ width: 7, height: 7, background: CLAY }} />
            )}
          </button>

          <button aria-label="More options" className="flex-shrink-0">
            <MoreHorizontal size={24} strokeWidth={1.9} color={INK} />
          </button>
          <button
            onClick={() => { hapticLight(); searchInputRef.current?.focus(); }}
            aria-label="Compose"
            className="flex-shrink-0"
          >
            <SquarePen size={23} strokeWidth={1.9} color={INK} />
          </button>
        </div>

        {/* 2 — SEARCH */}
        <div className="flex items-center gap-3 px-4 pb-1">
          <div
            className="flex items-center gap-2 flex-1 min-w-0"
            style={{
              background: RECESS,
              border: `1px solid ${BORDER}`,
              borderRadius: 14,
              padding: '10px 13px',
            }}
          >
            <SearchIcon size={17} strokeWidth={2} color={FAINT} className="flex-shrink-0" />
            <input
              ref={searchInputRef}
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search"
              className="flex-1 min-w-0 bg-transparent focus:outline-none"
              style={{ fontSize: 15, color: INK }}
            />
          </div>
          <button
            onClick={() => {
              if (activeFilter !== 'all') setActiveFilter('all');
              else pillsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }}
            className="flex-shrink-0"
            style={{ fontSize: 14.5, fontWeight: 600, color: ACCENT }}
          >
            Filters
          </button>
        </div>

        {/* User search results — preserves "start a new conversation" */}
        {showUserSearch && (
          <div className="px-4 pt-3">
            {convoError && (
              <div className="mb-3 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-xs text-red-600 font-medium">
                Error: {convoError}
              </div>
            )}
            <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>
              Start a conversation
            </p>
            {searching ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} />
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-sm py-3 text-center" style={{ color: MUTED }}>No believers found</p>
            ) : (
              <div className="space-y-2">
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => startConvo(u.id)}
                    disabled={!!startingConvo}
                    className="w-full flex items-center gap-3 rounded-2xl p-3 text-left disabled:opacity-60"
                    style={{ background: '#FFFFFF', border: `1px solid ${BORDER}` }}
                  >
                    <Avatar user={u} size="md" />
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 14.5, fontWeight: 600, color: INK }}>{u.name}</p>
                      {u.churchName && <p style={{ fontSize: 12, color: MUTED }}>{u.churchName}</p>}
                    </div>
                    {startingConvo === u.id ? (
                      <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin flex-shrink-0" style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} />
                    ) : (
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: ACCENT }}>Message</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3 — NOTES ROW (stubbed data) */}
        <NotesRow notes={notes} onOpen={openNote} />

        {/* 4 — FILTER PILLS */}
        <div ref={pillsRef}>
          <FilterPills filters={filters} active={activeFilter} onChange={setActiveFilter} />
        </div>

        {/* 5 — THREAD LIST */}
        {loading ? (
          <div className="px-4 pt-3 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="rounded-full flex-shrink-0" style={{ width: 58, height: 58, background: RECESS }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 rounded-full w-1/3" style={{ background: RECESS }} />
                  <div className="h-2.5 rounded-full w-3/5" style={{ background: RECESS }} />
                </div>
              </div>
            ))}
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="text-center py-14 px-8">
            <p style={{ fontSize: 15, fontWeight: 600, color: INK }}>
              {activeFilter === 'circles' ? 'No circles yet' : 'Nothing here yet'}
            </p>
            <p className="mt-1" style={{ fontSize: 13.5, color: MUTED }}>
              {activeFilter === 'circles'
                ? 'Group messaging for prayer cells isn’t available yet.'
                : activeFilter === 'partners'
                  ? 'You’ll see your prayer partner here once you’re matched.'
                  : search
                    ? 'No conversations match your search.'
                    : 'Find a believer to pray and talk with.'}
            </p>
            {!search && activeFilter === 'all' && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => searchInputRef.current?.focus()}
                className="mt-5 inline-flex items-center px-5 h-11 rounded-full text-white"
                style={{ background: ACCENT, fontSize: 14, fontWeight: 600 }}
              >
                Find someone to message
              </motion.button>
            )}
          </div>
        ) : (
          <div className="pt-1">
            {visibleRows.map(row => (
              <ThreadRow key={row.id} convo={row} onOpen={openThread} />
            ))}

            {/* Prayer requests row */}
            <button
              onClick={() => setActiveFilter('requests')}
              className="w-full flex items-center gap-3 text-left"
              style={{ padding: '9px 16px', transition: 'background 140ms ease' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FFFFFF'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {/* 40px circle centred in the same 58px column as the avatars */}
              <span className="flex items-center justify-center flex-shrink-0" style={{ width: 58 }}>
                <span
                  className="rounded-full flex items-center justify-center"
                  style={{ width: 40, height: 40, background: RECESS }}
                >
                  <Users size={19} strokeWidth={1.9} color={MUTED} />
                </span>
              </span>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 14.5, fontWeight: 600, color: INK }}>Prayer requests</p>
                <p className="truncate" style={{ fontSize: 13, color: MUTED }}>
                  {byFilter.requests.length} waiting for your reply
                </p>
              </div>
              <span className="flex-shrink-0" style={{ fontSize: 13.5, fontWeight: 600, color: ACCENT }}>
                {byFilter.requests.length}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* 6 — TAB BAR */}
      <InboxTabBar showBadge={unreadMessages > 0} />
    </PullToRefresh>
  );
}
