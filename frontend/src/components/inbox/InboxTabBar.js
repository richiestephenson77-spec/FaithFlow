import { NavLink } from 'react-router-dom';
import { Home, Compass, HandHeart, MessageCircle, User } from 'lucide-react';
import { hapticLight } from '../../utils/haptics';
import { BORDER, CARD, CLAY, FAINT, INK, RECESS } from '../../utils/inboxTints';

// Same five destinations as the app's global nav, in the floating-pill style
// the inbox design calls for. Rendered by the inbox instead of the global bar
// (Layout hides its own nav on /messages) so there is only ever ONE nav.
const ITEMS = [
  { to: '/', Icon: Home, label: 'Home', end: true },
  { to: '/explore', Icon: Compass, label: 'Explore' },
  { to: '/prayer', Icon: HandHeart, label: 'Pray' },
  { to: '/messages', Icon: MessageCircle, label: 'Messages', badge: true },
  { to: '/profile', Icon: User, label: 'Profile' },
];

export default function InboxTabBar({ showBadge = false }) {
  return (
    // pointer-events-none on the wrapper so it never blocks scrolling; the
    // pill itself re-enables them.
    <div
      className="fixed left-1/2 -translate-x-1/2 z-30 w-full pointer-events-none"
      style={{ bottom: 0, maxWidth: 430, padding: '0 16px', paddingBottom: 'calc(18px + env(safe-area-inset-bottom))' }}
    >
      <div
        className="pointer-events-auto flex items-center rounded-full"
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          padding: '8px 10px',
          boxShadow: '0 2px 10px rgba(10,10,10,.05)',
        }}
      >
        {ITEMS.map(({ to, Icon, label, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={hapticLight}
            aria-label={label}
            className="flex-1 flex items-center justify-center"
          >
            {({ isActive }) => (
              <span
                className="relative flex items-center justify-center rounded-full"
                style={{
                  width: 42,
                  height: 42,
                  background: isActive ? RECESS : 'transparent',
                  transition: 'background 140ms ease',
                }}
              >
                <Icon size={24} strokeWidth={1.9} color={isActive ? INK : FAINT} />
                {badge && showBadge && (
                  <span
                    className="absolute rounded-full"
                    style={{
                      width: 8, height: 8, top: 5, right: 12,
                      background: CLAY, border: '1.5px solid #FFFFFF',
                    }}
                  />
                )}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
