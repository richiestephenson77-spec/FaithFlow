import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import {
  RoomHeader, RoomAvatar, EmptyState, RowSkeleton, ErrorNote,
  INK, MUTED, HAIRLINE,
} from '../components/prayerRooms/RoomUI';
import { connectedLabel, formatTime } from '../utils/roomTime';

/**
 * Who attended one occurrence. Host / co-host / site admin only — the server
 * enforces that, this screen just renders what it is given.
 *
 * Connected time is exactly that: how long each person's media connection was
 * open, with reconnects merged. It is not a measure of prayer, and the page
 * says so rather than implying a leaderboard.
 */
export default function PrayerRoomAttendance() {
  const { occurrenceId } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get(`/prayer-rooms/occurrences/${occurrenceId}/attendance`)
      .then(res => { if (!cancelled) setRows(res.data.attendance || []); })
      .catch(err => {
        if (cancelled) return;
        setError(err.response?.status === 403
          ? 'Only the host can see who attended.'
          : err.friendlyMessage || 'Could not load attendance');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [occurrenceId]);

  return (
    <div className="min-h-full" style={{ background: '#FFFFFF', color: INK }}>
      <RoomHeader backLabel="Session" onBack={() => navigate(`/prayer-rooms/${occurrenceId}`)} />

      <div className="px-5" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
        <h1 className="type-heading" style={{ fontSize: 28, margin: '6px 0 6px' }}>Who attended</h1>
        <p className="type-subtitle" style={{ fontSize: 13, marginBottom: 20 }}>
          Connected time is how long each person was in the room. It records
          presence, not prayer.
        </p>

        {loading ? (
          [1, 2, 3].map(i => <RowSkeleton key={i} />)
        ) : error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Nobody connected"
            body="Attendance is recorded from confirmed audio connections. No one joined this session."
          />
        ) : (
          rows.map(r => (
            <div
              key={r.user.id}
              className="flex items-center gap-3"
              style={{ padding: '14px 0', borderBottom: `1px solid ${HAIRLINE}` }}
            >
              <RoomAvatar user={r.user} size={40} />
              <div className="flex-1 min-w-0">
                <p className="truncate" style={{ fontSize: 14, fontWeight: 500 }}>{r.user.name}</p>
                <p style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                  Joined {formatTime(r.firstJoinedAt)} · {connectedLabel(r.connectedSeconds)}
                  {r.stillConnected ? ' · still connected' : ''}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
