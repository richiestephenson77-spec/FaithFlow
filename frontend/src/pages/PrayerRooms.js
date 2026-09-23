import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import api from '../utils/api';
import { hapticLight } from '../utils/haptics';
import RoomArt from '../components/prayerRooms/RoomArt';
import PrayerCellDirectory from './PrayerCellDirectory';
import {
  RoomHeader, Eyebrow, Card, PrimaryButton, OutlineButton, ReminderBell,
  RoomAvatar, EmptyState, RowSkeleton, ErrorNote,
  INK, MUTED, HAIRLINE, ACCENT,
} from '../components/prayerRooms/RoomUI';
import {
  formatTime, formatDateBlock, recurrenceLabel, durationLabel,
  connectedLabel, audienceLabel, formatDayLabel, formatWallClock, zoneDiffers,
} from '../utils/roomTime';

const TABS = [
  { id: 'discover', label: 'Discover' },
  { id: 'daily', label: 'Daily prayer' },
  { id: 'mine', label: 'My sessions' },
  // The group communities that used to be the Prayer Cells tile. Their own
  // screens are unchanged and still reachable; this is the way in.
  { id: 'groups', label: 'Groups' },
];

// Tab and scroll position are restored when coming back from a detail screen,
// so a back press lands where you left rather than at the top of Discover.
const VIEW_STATE = { tab: 'discover', scrollTop: 0 };

export default function PrayerRooms() {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollerRef = useRef(null);

  const [tab, setTab] = useState(() => location.state?.tab || VIEW_STATE.tab);
  const [data, setData] = useState({ discover: null, daily: null, mine: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // Groups renders PrayerCellDirectory, which loads itself from
  // /api/prayer-cells — so there is no endpoint here for that tab.
  const endpoint = { discover: '/prayer-rooms/discover', daily: '/prayer-rooms/daily', mine: '/prayer-rooms/mine' }[tab];

  const load = useCallback(async () => {
    if (!endpoint) { setLoading(false); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await api.get(endpoint);
      setData(prev => ({ ...prev, [tab]: res.data }));
    } catch (err) {
      setError(err.friendlyMessage || err.response?.data?.error || 'Could not load sessions');
    } finally {
      setLoading(false);
    }
  }, [endpoint, tab]);

  useEffect(() => { load(); }, [load]);

  // Remember the tab and restore the scroll offset on return.
  useEffect(() => { VIEW_STATE.tab = tab; }, [tab]);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (VIEW_STATE.scrollTop) el.scrollTop = VIEW_STATE.scrollTop;
    const onScroll = () => { VIEW_STATE.scrollTop = el.scrollTop; };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  /**
   * Toggle a reminder. The server owns the truth; we refresh from its answer
   * rather than guessing, so a failure cannot leave the bell lying.
   */
  async function toggleReminder(occ) {
    if (busyId) return;
    setBusyId(occ.id);
    hapticLight();
    try {
      if (occ.reminderSet) await api.delete(`/prayer-rooms/occurrences/${occ.id}/subscribe`);
      else await api.post(`/prayer-rooms/occurrences/${occ.id}/subscribe`, {});
      await load();
    } catch (err) {
      setError(err.friendlyMessage || err.response?.data?.error || 'Could not update the reminder');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleSeries(occ) {
    if (busyId) return;
    setBusyId(occ.id);
    hapticLight();
    try {
      if (occ.seriesSubscribed) await api.delete(`/prayer-rooms/series/${occ.seriesId}/subscribe`);
      else await api.post(`/prayer-rooms/series/${occ.seriesId}/subscribe`, {});
      await load();
    } catch (err) {
      setError(err.friendlyMessage || err.response?.data?.error || 'Could not update the reminder');
    } finally {
      setBusyId(null);
    }
  }

  const openOccurrence = (occ) => navigate(`/prayer-rooms/${occ.id}`, { state: { tab } });
  const current = data[tab];

  return (
    <div ref={scrollerRef} className="min-h-full" style={{ background: '#FFFFFF', color: INK }}>
      <RoomHeader
        backLabel="Explore"
        onBack={() => navigate('/explore')}
        action={
          <button
            onClick={() => navigate(
              tab === 'groups' ? '/prayer-rooms/groups/create' : '/prayer-rooms/new',
              { state: { tab } },
            )}
            aria-label={tab === 'groups' ? 'Create a group' : 'Create a prayer session'}
            className="grid place-items-center"
            style={{ width: 44, height: 44, color: INK }}
          >
            <Plus size={24} strokeWidth={1.9} />
          </button>
        }
      />

      <div className="px-5" style={{ paddingBottom: 24 }}>
        <h1 className="type-heading" style={{ fontSize: 32, margin: '6px 0 6px', letterSpacing: '-1px' }}>
          Prayer Rooms
        </h1>
        <p className="type-subtitle" style={{ fontSize: 14, marginBottom: 18 }}>
          A place to gather. A moment to pray.
        </p>

        <div
          role="tablist"
          aria-label="Prayer sessions"
          // Four labels do not fit at 320px with a comfortable gap, and a tab
          // clipped off the edge is a tab nobody finds. Tighten the gap on the
          // narrowest screens instead, and keep the row scrollable as a
          // backstop for long translations.
          className="flex gap-2.5 min-[360px]:gap-4 min-[390px]:gap-5 overflow-x-auto no-scrollbar"
          style={{ borderBottom: `1px solid ${HAIRLINE}`, marginBottom: 20 }}
        >
          {TABS.map(t => (
            <button
              key={t.id}
              role="tab"
              id={`room-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`room-panel-${t.id}`}
              onClick={() => { hapticLight(); setTab(t.id); }}
              style={{
                padding: '12px 0', fontSize: 13, whiteSpace: 'nowrap',
                minHeight: 44,
                color: tab === t.id ? INK : '#73777B',
                background: 'none',
                border: 0,
                // Set after `border: 0` so the reset cannot clear the
                // indicator. Transparent when inactive keeps the row from
                // shifting by 2px as the selection moves.
                borderBottom: `2px solid ${tab === t.id ? ACCENT : 'transparent'}`,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`room-panel-${tab}`} aria-labelledby={`room-tab-${tab}`}>
          {/* Groups loads itself, so it skips this page's loading/error gate
              entirely rather than flashing skeletons it will never fill. */}
          {tab === 'groups' ? (
            <PrayerCellDirectory embedded />
          ) : loading && !current ? (
            <div>{[1, 2, 3].map(i => <RowSkeleton key={i} />)}</div>
          ) : error && !current ? (
            <ErrorNote onRetry={load}>{error}</ErrorNote>
          ) : (
            <>
              {error && (
                <p role="alert" style={{ fontSize: 13, color: '#94534D', marginBottom: 12 }}>{error}</p>
              )}
              {tab === 'discover' && (
                <Discover
                  data={current}
                  busyId={busyId}
                  onOpen={openOccurrence}
                  onToggleReminder={toggleReminder}
                  onCreate={() => navigate('/prayer-rooms/new', { state: { tab } })}
                />
              )}
              {tab === 'daily' && (
                <Daily
                  data={current}
                  busyId={busyId}
                  onOpen={openOccurrence}
                  onToggleSeries={toggleSeries}
                />
              )}
              {tab === 'mine' && (
                <Mine data={current} busyId={busyId} onOpen={openOccurrence} onToggleReminder={toggleReminder} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Discover
// ---------------------------------------------------------------------------

function LiveCard({ occ, onOpen }) {
  return (
    <Card className="mb-3.5">
      <div className="flex items-center justify-between gap-3">
        <Eyebrow live>Live now</Eyebrow>
        <span style={{ fontSize: 12, color: MUTED }}>Audio room</span>
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 500, margin: '8px 0 2px' }}>{occ.title}</h3>
      {occ.description && (
        <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.45 }}>{occ.description}</p>
      )}

      <div className="flex items-center gap-2.5" style={{ margin: '14px 0 16px' }}>
        <RoomAvatar user={occ.host} />
        <div className="min-w-0">
          <p className="truncate" style={{ fontSize: 12.5 }}>{occ.host?.name || 'Someone'}</p>
          <p className="truncate" style={{ fontSize: 12, color: MUTED }}>
            {audienceLabel(occ.audience, occ.cell)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        {/* Only ever a real, server-counted number, and only on a live room. */}
        <span style={{ fontSize: 12.5, color: MUTED }}>
          {occ.connectedCount > 0
            ? `${occ.connectedCount} praying together`
            : 'Be the first to join'}
        </span>
        <PrimaryButton onClick={() => onOpen(occ)}>Join prayer</PrimaryButton>
      </div>
    </Card>
  );
}

function UpcomingRow({ occ, busyId, onOpen, onToggleReminder }) {
  const d = formatDateBlock(occ.startsAt);
  return (
    <div className="flex gap-3.5" style={{ padding: '16px 0', borderBottom: `1px solid ${HAIRLINE}` }}>
      <button
        onClick={() => onOpen(occ)}
        className="flex gap-3.5 flex-1 min-w-0 text-left items-start"
      >
        <span
          className="flex-shrink-0 text-center"
          style={{ width: 44, color: '#73777B', fontSize: 10, letterSpacing: 1 }}
        >
          {d.weekday}
          <b className="block type-heading" style={{ fontSize: 26, letterSpacing: 0, fontWeight: 400 }}>{d.day}</b>
          {d.month}
        </span>
        <span className="flex-1 min-w-0 block">
          <span className="block truncate" style={{ fontSize: 14, fontWeight: 500 }}>{occ.title}</span>
          <span className="block" style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>
            {formatTime(occ.startsAt)} · {durationLabel(occ.durationMinutes)}
          </span>
          <span className="block truncate" style={{ fontSize: 12, color: MUTED }}>
            {occ.cell ? `${occ.cell.name} · ` : occ.host ? `${occ.host.name} · ` : ''}
            {recurrenceLabel(occ.recurrence, occ.weekdays)}
          </span>
        </span>
      </button>
      <ReminderBell
        pressed={occ.reminderSet}
        busy={busyId === occ.id}
        label={occ.title}
        onToggle={() => onToggleReminder(occ)}
      />
    </div>
  );
}

function Discover({ data, busyId, onOpen, onToggleReminder, onCreate }) {
  const live = data?.live || [];
  const upcoming = data?.upcoming || [];

  if (live.length === 0 && upcoming.length === 0) {
    return (
      <EmptyState
        title="No sessions yet"
        body="When someone schedules a prayer session you can join, it will appear here."
        action={<PrimaryButton onClick={onCreate}>Host a prayer session</PrimaryButton>}
      />
    );
  }

  return (
    <>
      {live.map(occ => <LiveCard key={occ.id} occ={occ} onOpen={onOpen} />)}

      {upcoming.length > 0 && (
        <>
          <h2 className="type-heading" style={{ fontSize: 23, margin: '24px 0 2px' }}>
            Coming together soon
          </h2>
          <p className="type-subtitle" style={{ fontSize: 12, marginBottom: 6 }}>
            Times shown in your local time zone
          </p>
          {/* No per-day heading: every row carries its own date block, so a
              heading above it would print the same date twice. */}
          {upcoming.map(occ => (
            <UpcomingRow
              key={occ.id}
              occ={occ}
              busyId={busyId}
              onOpen={onOpen}
              onToggleReminder={onToggleReminder}
            />
          ))}
        </>
      )}

      <button
        onClick={onCreate}
        className="flex items-center gap-1.5"
        style={{ color: ACCENT, marginTop: 16, minHeight: 44, fontSize: 14 }}
      >
        <Plus size={17} strokeWidth={2} /> Host a prayer session
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------
// Daily prayer
// ---------------------------------------------------------------------------

function Daily({ data, busyId, onOpen, onToggleSeries }) {
  const sessions = data?.sessions || [];

  // There are no seeded "official" FaithFlow sessions. If nobody has created
  // one, this is genuinely empty and says so.
  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No daily rhythm yet"
        body="Morning and evening prayer appear here once an organizer sets one up. Nothing is scheduled at the moment."
      />
    );
  }

  return (
    <>
      <h2 className="type-heading" style={{ fontSize: 23, margin: '0 0 14px' }}>Make space for prayer</h2>
      {sessions.map(occ => {
        // Morning vs evening is read from the host's own wall clock, not the
        // viewer's, because "morning prayer" is a property of the series.
        const hour = parseInt((occ.localTime || '00:00').slice(0, 2), 10);
        const variant = hour >= 17 || hour < 4 ? 'evening' : 'morning';
        return (
          <Card key={occ.id} className="mb-3.5">
            <div className="flex gap-3 items-start">
              <div className="flex-1 min-w-0">
                {/* The host's own wall clock — a "morning prayer" series is
                    morning where the HOST is, whatever the clock reads for
                    you. The viewer's local time is on the Next line below. */}
                <Eyebrow>
                  {recurrenceLabel(occ.recurrence, occ.weekdays)} · {formatWallClock(occ.localTime)}
                </Eyebrow>
                <h3 style={{ fontSize: 17, fontWeight: 500, margin: '8px 0 2px' }}>{occ.title}</h3>
                <p style={{ fontSize: 12, color: MUTED }}>
                  {occ.host?.name} · {durationLabel(occ.durationMinutes)}
                </p>
                <p style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                  Next: {formatDayLabel(occ.startsAt)} at {formatTime(occ.startsAt)}
                  {zoneDiffers(occ.timeZone) ? ' your time' : ''}
                </p>
              </div>
              <RoomArt variant={variant} />
            </div>

            <div className="mt-4">
              {occ.status === 'LIVE' ? (
                <PrimaryButton full onClick={() => onOpen(occ)}>Join prayer</PrimaryButton>
              ) : occ.seriesSubscribed ? (
                <OutlineButton full disabled={busyId === occ.id} onClick={() => onToggleSeries(occ)}>
                  Reminder set
                </OutlineButton>
              ) : (
                <PrimaryButton full disabled={busyId === occ.id} onClick={() => onToggleSeries(occ)}>
                  Remind me
                </PrimaryButton>
              )}
            </div>
          </Card>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// My sessions
// ---------------------------------------------------------------------------

function Mine({ data, busyId, onOpen, onToggleReminder }) {
  const upcoming = data?.upcoming || [];
  const past = data?.past || [];
  const hosted = data?.hosted || [];
  const summary = data?.summary;

  if (upcoming.length === 0 && past.length === 0 && hosted.length === 0) {
    return (
      <EmptyState
        title="Nothing saved yet"
        body="Sessions you set a reminder for, or host yourself, will collect here."
      />
    );
  }

  return (
    <>
      <h2 className="type-heading" style={{ fontSize: 23, margin: '0 0 2px' }}>Your prayer rhythm</h2>
      {summary && (
        <p className="type-subtitle" style={{ fontSize: 13, marginBottom: 18 }}>
          {summary.sessionsThisWeek === 0
            ? 'No sessions joined this week'
            : `${summary.sessionsThisWeek} session${summary.sessionsThisWeek === 1 ? '' : 's'} this week · ${connectedLabel(summary.connectedSecondsThisWeek)} connected`}
        </p>
      )}

      {upcoming.length > 0 && (
        <>
          <h3 style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: MUTED, marginBottom: 4 }}>
            Upcoming
          </h3>
          {upcoming.map(occ => (
            <UpcomingRow
              key={occ.id}
              occ={occ}
              busyId={busyId}
              onOpen={onOpen}
              onToggleReminder={onToggleReminder}
            />
          ))}
        </>
      )}

      {hosted.length > 0 && (
        <>
          <h3 style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: MUTED, margin: '24px 0 4px' }}>
            You host
          </h3>
          {hosted.map(s => (
            <div key={s.id} style={{ padding: '14px 0', borderBottom: `1px solid ${HAIRLINE}` }}>
              <p style={{ fontSize: 14, fontWeight: 500 }}>{s.title}</p>
              <p style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                {recurrenceLabel(s.recurrence, s.weekdays)} · {formatWallClock(s.localTime)}
                {zoneDiffers(s.timeZone) ? ` ${s.timeZone}` : ''}
                {s.cell ? ` · ${s.cell.name}` : ''}
              </p>
            </div>
          ))}
        </>
      )}

      {past.length > 0 && (
        <>
          <h2 className="type-heading" style={{ fontSize: 23, margin: '28px 0 8px' }}>Recently attended</h2>
          {past.map(occ => (
            <button
              key={occ.id}
              onClick={() => onOpen(occ)}
              className="flex gap-3.5 items-center w-full text-left"
              style={{ padding: '14px 0', borderBottom: `1px solid ${HAIRLINE}` }}
            >
              <RoomAvatar user={occ.host} size={40} />
              <span className="flex-1 min-w-0 block">
                <span className="block truncate" style={{ fontSize: 14, fontWeight: 500 }}>{occ.title}</span>
                <span className="block" style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                  {formatDayLabel(occ.startsAt)} · Connected for {connectedLabel(occ.connectedSeconds)}
                </span>
              </span>
            </button>
          ))}
        </>
      )}

      {/* Connected time is not a claim about prayer, and this is not a ranking. */}
      <p
        style={{ borderTop: `1px solid ${HAIRLINE}`, paddingTop: 14, marginTop: 22, fontSize: 12, color: MUTED, lineHeight: 1.5 }}
      >
        Your prayer history is private — only you can see it. Connected time
        records how long you were in the room, nothing more.
      </p>
    </>
  );
}
