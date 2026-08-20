import { ACCENT, BORDER, CARD, MUTED } from '../../utils/inboxTints';

const ACTIVE_FILL = '#E9EDF2';
const INACTIVE_DOT = '#C9C4BC';
const INACTIVE_TEXT = '#3A3733';

// Single-select filter pills. `filters` is [{ id, label, count }] and the
// counts come from the real filtered list lengths, not constants.
export default function FilterPills({ filters, active, onChange }) {
  return (
    <div
      className="no-scrollbar overflow-x-auto px-4 py-2.5"
      style={{ borderBottom: `1px solid ${BORDER}` }}
    >
      <div className="flex gap-2">
        {filters.map(f => {
          const isActive = f.id === active;
          return (
            <button
              key={f.id}
              onClick={() => onChange(f.id)}
              aria-pressed={isActive}
              className="flex items-center gap-1.5 rounded-full flex-shrink-0"
              style={{
                padding: '6px 12px',
                background: isActive ? ACTIVE_FILL : CARD,
                border: `1px solid ${isActive ? ACCENT : BORDER}`,
                transition: 'border-color 140ms ease, color 140ms ease, background 140ms ease',
              }}
            >
              <span
                className="rounded-full flex-shrink-0"
                style={{ width: 6, height: 6, background: isActive ? ACCENT : INACTIVE_DOT }}
              />
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? ACCENT : INACTIVE_TEXT,
                }}
              >
                {f.label}
              </span>
              <span style={{ fontSize: 13.5, color: MUTED }}>{f.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
