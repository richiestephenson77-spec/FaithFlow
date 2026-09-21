import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import api from '../utils/api';
import { hapticLight } from '../utils/haptics';
import {
  RoomHeader, PrimaryButton, OutlineButton, INK, MUTED, HAIRLINE, LEAVE, ACCENT,
} from '../components/prayerRooms/RoomUI';
import { VIEWER_TIME_ZONE, nowLocalParts, formatWallClock } from '../utils/roomTime';

const DURATIONS = [15, 20, 30, 45, 60, 90];
const WEEKDAYS = [
  { v: 1, l: 'M' }, { v: 2, l: 'T' }, { v: 3, l: 'W' }, { v: 4, l: 'T' },
  { v: 5, l: 'F' }, { v: 6, l: 'S' }, { v: 0, l: 'S' },
];

// The host's zone is explicit and editable, because it is what the recurrence
// rule is anchored to — "every day at 7am" means 7am HERE, and a host who
// travels must not silently move their whole series.
const ZONES = (() => {
  const all = typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : [VIEWER_TIME_ZONE, 'UTC'];
  return all.includes(VIEWER_TIME_ZONE) ? all : [VIEWER_TIME_ZONE, ...all];
})();

export default function PrayerRoomCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { seriesId } = useParams();
  const isEdit = !!seriesId;

  const seeded = nowLocalParts();
  const [form, setForm] = useState({
    title: '',
    description: '',
    startLocalDate: seeded.date,
    localTime: seeded.time,
    timeZone: VIEWER_TIME_ZONE,
    durationMinutes: 30,
    recurrence: 'NONE',
    weekdays: [],
    audience: 'PUBLIC',
    cellId: '',
    kind: 'STANDARD',
  });
  const [cells, setCells] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  // Guards a double tap from creating two sessions before the first responds.
  const submitting = useRef(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Only cells this user ADMINS can be chosen, matching the server rule.
  useEffect(() => {
    api.get('/prayer-cells/mine')
      .then(res => setCells((res.data || []).filter(c => c.myRole === 'admin')))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/prayer-rooms/series/${seriesId}`)
      .then(res => setForm(f => ({ ...f, ...res.data })))
      .catch(() => setError('Could not load this session'));
  }, [isEdit, seriesId]);

  async function submit(e) {
    e.preventDefault();
    if (submitting.current) return;

    if (form.title.trim().length < 2) { setError('Give the session a title'); return; }
    if (form.recurrence === 'WEEKLY' && form.weekdays.length === 0) {
      setError('Choose at least one day of the week'); return;
    }
    if (form.audience === 'CELL' && !form.cellId) { setError('Choose which cell can join'); return; }

    submitting.current = true;
    setSaving(true);
    setError(null);
    hapticLight();
    try {
      const payload = { ...form, cellId: form.cellId || null };
      if (isEdit) {
        await api.patch(`/prayer-rooms/series/${seriesId}`, payload);
        navigate('/prayer-rooms', { state: { tab: 'mine' } });
      } else {
        const res = await api.post('/prayer-rooms', payload);
        const occ = res.data?.occurrence;
        navigate(occ ? `/prayer-rooms/${occ.id}` : '/prayer-rooms', { state: { tab: 'mine' } });
      }
    } catch (err) {
      setError(err.friendlyMessage || err.response?.data?.error || 'Could not save the session');
      submitting.current = false;
      setSaving(false);
    }
  }

  /** Start immediately: same model, a one-off anchored to right now. */
  async function startNow() {
    if (submitting.current) return;
    if (form.title.trim().length < 2) { setError('Give the session a title'); return; }
    submitting.current = true;
    setSaving(true);
    setError(null);
    try {
      const res = await api.post('/prayer-rooms/start-now', {
        title: form.title,
        description: form.description,
        timeZone: form.timeZone,
        durationMinutes: form.durationMinutes,
        audience: form.audience,
        cellId: form.cellId || null,
      });
      navigate(`/prayer-rooms/${res.data.occurrence.id}/live`);
    } catch (err) {
      setError(err.friendlyMessage || err.response?.data?.error || 'Could not start the session');
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full" style={{ background: '#FFFFFF', color: INK }}>
      <RoomHeader backLabel="Prayer Rooms" onBack={() => navigate('/prayer-rooms', { state: location.state })} />

      <form onSubmit={submit} className="px-5" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
        <h1 className="type-heading" style={{ fontSize: 30, margin: '6px 0 6px' }}>
          {isEdit ? 'Edit session' : 'Gather in prayer'}
        </h1>
        <p className="type-subtitle" style={{ fontSize: 14, marginBottom: 18 }}>
          {isEdit
            ? 'Changes apply to this and every future occurrence.'
            : 'Give your community a time to connect.'}
        </p>

        <Field label="Session title" htmlFor="room-title">
          <input
            id="room-title"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="e.g. Thursday men's prayer"
            maxLength={120}
            required
            style={inputStyle}
          />
        </Field>

        <Field label="Description (optional)" htmlFor="room-desc">
          <textarea
            id="room-desc"
            value={form.description || ''}
            onChange={e => set('description', e.target.value)}
            rows={2}
            maxLength={2000}
            style={{ ...inputStyle, resize: 'vertical', paddingTop: 10 }}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" htmlFor="room-date">
            <input
              id="room-date" type="date" required
              value={form.startLocalDate}
              onChange={e => set('startLocalDate', e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Time" htmlFor="room-time">
            <input
              id="room-time" type="time" required
              value={form.localTime}
              onChange={e => set('localTime', e.target.value)}
              style={inputStyle}
            />
          </Field>
        </div>

        <Field label="Time zone" htmlFor="room-tz">
          <select id="room-tz" value={form.timeZone} onChange={e => set('timeZone', e.target.value)} style={inputStyle}>
            {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
          <p style={{ fontSize: 11.5, color: MUTED, marginTop: 6, lineHeight: 1.45 }}>
            The session repeats at this wall-clock time here, so it stays at{' '}
            {formatWallClock(form.localTime)} through daylight saving. Everyone
            else sees it converted to their own time.
          </p>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration" htmlFor="room-duration">
            <select
              id="room-duration"
              value={form.durationMinutes}
              onChange={e => set('durationMinutes', Number(e.target.value))}
              style={inputStyle}
            >
              {DURATIONS.map(d => <option key={d} value={d}>{d} minutes</option>)}
            </select>
          </Field>
          <Field label="Repeats" htmlFor="room-repeat">
            <select
              id="room-repeat"
              value={form.recurrence}
              onChange={e => set('recurrence', e.target.value)}
              style={inputStyle}
            >
              <option value="NONE">Does not repeat</option>
              <option value="DAILY">Every day</option>
              <option value="WEEKLY">Selected days</option>
            </select>
          </Field>
        </div>

        {form.recurrence === 'WEEKLY' && (
          <Field label="Which days?">
            <div className="flex gap-1.5" role="group" aria-label="Days of the week">
              {WEEKDAYS.map(d => {
                const on = form.weekdays.includes(d.v);
                return (
                  <button
                    key={d.v}
                    type="button"
                    aria-pressed={on}
                    aria-label={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.v]}
                    onClick={() => set('weekdays', on
                      ? form.weekdays.filter(x => x !== d.v)
                      : [...form.weekdays, d.v].sort((a, b) => a - b))}
                    style={{
                      width: 44, height: 44, borderRadius: 999, fontSize: 13,
                      border: `1px solid ${on ? ACCENT : HAIRLINE}`,
                      background: on ? ACCENT : '#FFFFFF',
                      color: on ? '#FFFFFF' : INK,
                    }}
                  >
                    {d.l}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        <Field label="Who can join?" htmlFor="room-audience">
          <select
            id="room-audience"
            value={form.audience}
            onChange={e => set('audience', e.target.value)}
            style={inputStyle}
          >
            <option value="PUBLIC">Anyone</option>
            <option value="CELL" disabled={cells.length === 0}>
              {cells.length === 0 ? 'Cell members (you do not admin a cell)' : 'Cell members'}
            </option>
            <option value="INVITE">Invite only</option>
          </select>
        </Field>

        {form.audience === 'CELL' && (
          <Field label="Prayer cell" htmlFor="room-cell">
            <select id="room-cell" value={form.cellId} onChange={e => set('cellId', e.target.value)} style={inputStyle}>
              <option value="">Choose a cell…</option>
              {cells.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <p style={{ fontSize: 11.5, color: MUTED, marginTop: 6 }}>
              Only cells you administer are listed.
            </p>
          </Field>
        )}

        <Field label="Daily prayer series" htmlFor="room-kind">
          <select
            id="room-kind"
            value={form.kind}
            onChange={e => set('kind', e.target.value)}
            style={inputStyle}
          >
            <option value="STANDARD">No — list under Discover</option>
            <option value="DAILY_PRAYER">Yes — list under Daily prayer</option>
          </select>
          {form.kind === 'DAILY_PRAYER' && form.recurrence === 'NONE' && (
            <p style={{ fontSize: 11.5, color: LEAVE, marginTop: 6 }}>
              A daily prayer series has to repeat. Choose a repeat option above.
            </p>
          )}
        </Field>

        {error && (
          <p role="alert" style={{ fontSize: 13, color: LEAVE, marginTop: 16 }}>{error}</p>
        )}

        <div style={{ marginTop: 24 }}>
          <PrimaryButton full type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Schedule session'}
          </PrimaryButton>
        </div>

        {!isEdit && (
          <div style={{ marginTop: 10 }}>
            <OutlineButton full disabled={saving} onClick={startNow}>
              Start one now instead
            </OutlineButton>
          </div>
        )}
      </form>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: 11, border: '1px solid #E7E7E7', borderRadius: 8,
  background: '#FFFFFF', color: '#0A0A0A',
  // 16px keeps iOS Safari from zooming the page when a field takes focus.
  fontSize: 16, fontFamily: 'Inter, sans-serif', minHeight: 44,
};

function Field({ label, htmlFor, children }) {
  return (
    <div style={{ marginTop: 16 }}>
      <label htmlFor={htmlFor} style={{ display: 'block', fontSize: 12, marginBottom: 6, color: INK }}>
        {label}
      </label>
      {children}
    </div>
  );
}
