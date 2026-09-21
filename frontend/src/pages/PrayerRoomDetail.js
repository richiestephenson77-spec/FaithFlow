import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Clock, Repeat, Users, Globe } from 'lucide-react';
import api from '../utils/api';
import { hapticLight } from '../utils/haptics';
import {
  RoomHeader, Eyebrow, Card, PrimaryButton, OutlineButton, RoomAvatar,
  RowSkeleton, ErrorNote, INK, MUTED, HAIRLINE, LEAVE,
} from '../components/prayerRooms/RoomUI';
import {
  formatTime, formatDayLabel, recurrenceLabel, durationLabel, audienceLabel,
} from '../utils/roomTime';

export default function PrayerRoomDetail() {
  const { occurrenceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [occ, setOcc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get(`/prayer-rooms/occurrences/${occurrenceId}`);
      setOcc(res.data);
    } catch (err) {
      setError(
        err.response?.status === 403
          ? 'This session is private.'
          : err.response?.status === 404
            ? 'This session no longer exists.'
            : err.friendlyMessage || 'Could not load this session',
      );
    } finally {
      setLoading(false);
    }
  }, [occurrenceId]);

  useEffect(() => { load(); }, [load]);

  const back = () => navigate('/prayer-rooms', { state: { tab: location.state?.tab } });

  async function act(fn, failure) {
    if (busy) return;
    setBusy(true);
    hapticLight();
    try { await fn(); await load(); }
    catch (err) { setError(err.friendlyMessage || err.response?.data?.error || failure); }
    finally { setBusy(false); }
  }

  const toggleReminder = () => act(
    () => occ.reminderSet
      ? api.delete(`/prayer-rooms/occurrences/${occ.id}/subscribe`)
      : api.post(`/prayer-rooms/occurrences/${occ.id}/subscribe`, {}),
    'Could not update the reminder',
  );

  const startSession = () => act(
    () => api.post(`/prayer-rooms/occurrences/${occ.id}/start`, {}),
    'Could not start the session',
  );

  const cancelSession = () => act(
    () => api.post(`/prayer-rooms/occurrences/${occ.id}/cancel`, {}),
    'Could not cancel the session',
  );

  if (loading) {
    return (
      <div className="min-h-full" style={{ background: '#FFFFFF' }}>
        <RoomHeader backLabel="Prayer Rooms" onBack={back} />
        <div className="px-5">{[1, 2].map(i => <RowSkeleton key={i} />)}</div>
      </div>
    );
  }

  if (!occ) {
    return (
      <div className="min-h-full" style={{ background: '#FFFFFF' }}>
        <RoomHeader backLabel="Prayer Rooms" onBack={back} />
        <div className="px-5 pt-6"><ErrorNote onRetry={load}>{error}</ErrorNote></div>
      </div>
    );
  }

  const isLive = occ.status === 'LIVE';
  const isCanceled = occ.status === 'CANCELED';
  const isEnded = occ.status === 'ENDED';
  const showConnected = isLive && occ.connectedCount != null;

  return (
    <div className="min-h-full" style={{ background: '#FFFFFF', color: INK }}>
      <RoomHeader backLabel="Prayer Rooms" onBack={back} />

      <div className="px-5" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
        {isLive && <Eyebrow live>Live now · Audio only</Eyebrow>}
        {isCanceled && <Eyebrow color={LEAVE}>Canceled</Eyebrow>}
        {isEnded && <Eyebrow>{occ.hostNoShow ? 'Did not take place' : 'Finished'}</Eyebrow>}
        {!isLive && !isCanceled && !isEnded && <Eyebrow>{formatDayLabel(occ.startsAt)}</Eyebrow>}

        <h1 className="type-heading" style={{ fontSize: 28, margin: '10px 0 6px' }}>{occ.title}</h1>
        {occ.description && (
          <p className="type-subtitle" style={{ fontSize: 14 }}>{occ.description}</p>
        )}

        {occ.rescheduledFromUtc && !isCanceled && (
          <p style={{ fontSize: 12.5, color: LEAVE, marginTop: 8 }}>
            Moved from {formatDayLabel(occ.rescheduledFromUtc)} at {formatTime(occ.rescheduledFromUtc)}
          </p>
        )}
        {isCanceled && occ.canceledReason && (
          <p style={{ fontSize: 12.5, color: MUTED, marginTop: 8 }}>{occ.canceledReason}</p>
        )}

        {/* Host */}
        <div className="flex items-center gap-2.5" style={{ margin: '18px 0' }}>
          <RoomAvatar user={occ.host} size={40} />
          <div className="min-w-0">
            <p className="truncate" style={{ fontSize: 14 }}>{occ.host?.name || 'Someone'}</p>
            <p className="truncate" style={{ fontSize: 12, color: MUTED }}>
              {audienceLabel(occ.audience, occ.cell)}
            </p>
          </div>
        </div>

        {/* Facts */}
        <Card style={{ padding: 16 }}>
          <Fact icon={<Clock size={15} strokeWidth={1.8} />}>
            {formatDayLabel(occ.startsAt)} at {formatTime(occ.startsAt)} · {durationLabel(occ.durationMinutes)}
          </Fact>
          <Fact icon={<Repeat size={15} strokeWidth={1.8} />}>
            {recurrenceLabel(occ.recurrence, occ.weekdays)}
          </Fact>
          {/* `last` drops the trailing divider, so whichever row ends the card
              closes it cleanly. */}
          <Fact icon={<Globe size={15} strokeWidth={1.8} />} last={!showConnected}>
            Host's time zone: {occ.timeZone} · shown here in your local time
          </Fact>
          {showConnected && (
            <Fact icon={<Users size={15} strokeWidth={1.8} />} last>
              {occ.connectedCount === 0
                ? 'Nobody connected yet'
                : `${occ.connectedCount} connected right now`}
            </Fact>
          )}
        </Card>

        {occ.cohosts?.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <h2 style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: MUTED, marginBottom: 8 }}>
              Co-hosts
            </h2>
            <div className="flex flex-wrap gap-3">
              {occ.cohosts.map(u => (
                <span key={u.id} className="flex items-center gap-2">
                  <RoomAvatar user={u} size={28} />
                  <span style={{ fontSize: 13 }}>{u.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Linked requests. The server has already filtered these to what THIS
            viewer is independently entitled to see. */}
        {occ.linkedRequests?.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <h2 style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: MUTED, marginBottom: 8 }}>
              Praying for
            </h2>
            {occ.linkedRequests.map(r => (
              <div key={r.id} style={{ background: '#F7F6F3', borderRadius: 14, padding: 16, marginBottom: 10 }}>
                <p style={{ fontSize: 14, fontWeight: 500 }}>{r.title}</p>
                <p style={{ fontSize: 13, color: MUTED, marginTop: 4, lineHeight: 1.45 }}>{r.body}</p>
                <p style={{ fontSize: 12, color: MUTED, marginTop: 10 }}>
                  {r.author ? `Shared by ${r.author.name}` : 'Shared anonymously'}
                </p>
              </div>
            ))}
          </div>
        )}

        {error && <p role="alert" style={{ fontSize: 13, color: LEAVE, marginTop: 16 }}>{error}</p>}

        {/* Actions */}
        <div style={{ marginTop: 24 }}>
          {isLive && (
            <PrimaryButton full onClick={() => navigate(`/prayer-rooms/${occ.id}/live`)}>
              Join prayer
            </PrimaryButton>
          )}

          {!isLive && !isEnded && !isCanceled && (
            <>
              {occ.canHost && (
                <div style={{ marginBottom: 10 }}>
                  <PrimaryButton full disabled={busy} onClick={startSession}>
                    Start the session now
                  </PrimaryButton>
                </div>
              )}
              {occ.reminderSet ? (
                <OutlineButton full disabled={busy} onClick={toggleReminder}>Reminder set</OutlineButton>
              ) : (
                <OutlineButton full disabled={busy} onClick={toggleReminder}>Remind me</OutlineButton>
              )}
              {/* Honest about what a reminder can actually do here. */}
              <p style={{ fontSize: 11.5, color: MUTED, marginTop: 8, lineHeight: 1.45 }}>
                Reminders appear in your notifications while the app is open.
                FaithFlow can't send push notifications yet, so it won't buzz a
                closed phone.
              </p>
            </>
          )}

          {occ.canManage && !isEnded && !isCanceled && (
            <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
              <OutlineButton onClick={() => navigate(`/prayer-rooms/series/${occ.seriesId}/edit`)} style={{ flex: 1 }}>
                Edit
              </OutlineButton>
              <OutlineButton
                onClick={cancelSession}
                disabled={busy}
                style={{ flex: 1, color: LEAVE, borderColor: '#E6D9D7' }}
              >
                Cancel session
              </OutlineButton>
            </div>
          )}

          {occ.canHost && isEnded && (
            <OutlineButton full onClick={() => navigate(`/prayer-rooms/${occ.id}/attendance`)}>
              See who attended
            </OutlineButton>
          )}
        </div>

        {/* Disclosed BEFORE joining, per the attendance-privacy requirement. */}
        {!isEnded && !isCanceled && (
          <p style={{ fontSize: 11.5, color: MUTED, marginTop: 18, lineHeight: 1.5 }}>
            {occ.attendanceNotice}
          </p>
        )}
      </div>
    </div>
  );
}

function Fact({ icon, children, last }) {
  return (
    <div
      className="flex items-start gap-2.5"
      style={{ padding: '9px 0', borderBottom: last ? 'none' : `1px solid ${HAIRLINE}` }}
    >
      <span style={{ color: MUTED, marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 13, lineHeight: 1.4 }}>{children}</span>
    </div>
  );
}
