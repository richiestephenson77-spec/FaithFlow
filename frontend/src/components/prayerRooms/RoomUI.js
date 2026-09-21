import { motion } from 'framer-motion';
import { ChevronLeft, BellPlus, Check } from 'lucide-react';

// Shared chrome for the Prayer Rooms screens. Same flat surfaces as the rest
// of the app: white, 1px #EFEFEF hairlines, 16px card corners, #2C4055
// actions, #0A0A0A headings, Fraunces via .type-heading. No gradients,
// shadows, glass or hero banners.

export const INK = '#0A0A0A';
export const MUTED = '#8E8E8E';
export const HAIRLINE = '#EFEFEF';
export const ACCENT = '#2C4055';
export const LIVE = '#63836A';   // the muted green of the live dot
export const LEAVE = '#94534D';  // the restrained red of "Leave quietly"

/**
 * Page header. The app shows its branded logo header only on Home, and the
 * brief says not to force the cross into every page header, so this follows
 * the convention every other in-app page uses: a back chevron, and an
 * optional trailing action.
 */
export function RoomHeader({ backLabel = 'Back', onBack, action }) {
  return (
    <div
      className="flex items-center justify-between px-4"
      style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))', paddingBottom: 4 }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 -ml-1"
        style={{ minHeight: 44, color: INK }}
      >
        <ChevronLeft size={24} strokeWidth={1.9} />
        <span style={{ fontSize: 15 }}>{backLabel}</span>
      </button>
      {action || <span style={{ width: 44 }} />}
    </div>
  );
}

/** The uppercase tracked label above a card title. */
export function Eyebrow({ children, live = false, color }) {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{
        fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase',
        fontWeight: 500, color: color || (live ? LIVE : MUTED),
      }}
    >
      {live && (
        <span
          className="rounded-full"
          style={{ width: 6, height: 6, background: LIVE, flexShrink: 0 }}
        />
      )}
      {children}
    </span>
  );
}

export function Card({ children, className = '', style }) {
  return (
    <div
      className={className}
      style={{ border: `1px solid ${HAIRLINE}`, borderRadius: 16, padding: 18, background: '#FFFFFF', ...style }}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({ children, onClick, disabled, full, type = 'button', style }) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className={full ? 'w-full' : ''}
      style={{
        minHeight: 44, borderRadius: 10, padding: '11px 16px',
        background: ACCENT, color: '#FFFFFF', fontWeight: 500, fontSize: 14,
        opacity: disabled ? 0.5 : 1, border: 0, ...style,
      }}
    >
      {children}
    </motion.button>
  );
}

export function OutlineButton({ children, onClick, disabled, full, type = 'button', style }) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className={full ? 'w-full' : ''}
      style={{
        minHeight: 44, borderRadius: 10, padding: '11px 16px',
        background: '#FFFFFF', color: ACCENT, fontWeight: 500, fontSize: 14,
        border: '1px solid #E6E8EB', opacity: disabled ? 0.5 : 1, ...style,
      }}
    >
      {children}
    </motion.button>
  );
}

/**
 * The round reminder toggle on an upcoming row. `pressed` is the real
 * subscription state from the server, and aria-pressed carries it to
 * assistive tech rather than relying on the icon swap alone.
 */
export function ReminderBell({ pressed, onToggle, busy, label }) {
  return (
    <button
      onClick={onToggle}
      disabled={busy}
      aria-pressed={pressed}
      aria-label={pressed ? `Turn off the reminder for ${label}` : `Remind me about ${label}`}
      className="grid place-items-center flex-shrink-0 rounded-full"
      style={{
        width: 44, height: 44,
        border: `1px solid ${pressed ? ACCENT : HAIRLINE}`,
        background: '#FFFFFF', color: ACCENT, opacity: busy ? 0.5 : 1,
      }}
    >
      {pressed ? <Check size={19} strokeWidth={2.2} /> : <BellPlus size={19} strokeWidth={1.8} />}
    </button>
  );
}

/** Initials circle in the preview's warm neutral, Fraunces like the mockup. */
export function RoomAvatar({ user, size = 34 }) {
  const initials = (user?.name || '?')
    .split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  if (user?.profilePhoto) {
    return (
      <img
        src={user.profilePhoto}
        alt=""
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="rounded-full grid place-items-center flex-shrink-0"
      style={{
        width: size, height: size, background: '#F3F1EC', color: '#796E5F',
        fontFamily: "'Fraunces', serif", fontSize: Math.round(size * 0.41),
      }}
    >
      {initials}
    </span>
  );
}

/** Quiet, centred empty state. Never a placeholder session. */
export function EmptyState({ title, body, action }) {
  return (
    <div className="text-center" style={{ padding: '44px 24px' }}>
      <p className="type-heading" style={{ fontSize: 19 }}>{title}</p>
      {body && <p className="type-subtitle mt-1.5" style={{ fontSize: 13.5 }}>{body}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="flex gap-3.5 items-center animate-pulse" style={{ padding: '16px 0', borderBottom: `1px solid ${HAIRLINE}` }}>
      <div style={{ width: 44, height: 40, borderRadius: 8, background: '#F0F0F0', flexShrink: 0 }} />
      <div className="flex-1 space-y-2">
        <div style={{ height: 11, width: '55%', borderRadius: 99, background: '#F0F0F0' }} />
        <div style={{ height: 9, width: '35%', borderRadius: 99, background: '#F0F0F0' }} />
      </div>
    </div>
  );
}

export function ErrorNote({ children, onRetry }) {
  return (
    <div
      className="text-center"
      style={{ padding: '32px 24px', border: `1px solid ${HAIRLINE}`, borderRadius: 16 }}
    >
      <p style={{ fontSize: 14, color: INK }}>{children}</p>
      {onRetry && (
        <div className="mt-4 flex justify-center">
          <OutlineButton onClick={onRetry}>Try again</OutlineButton>
        </div>
      )}
    </div>
  );
}
