import { NavLink, useNavigate, useLocation, useOutlet } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Compass, Search, MessageCircle, User, Bell, HandHeart } from 'lucide-react';
import Toast from './Toast';
import Logo from './Logo';
import CreatePostModal from './CreatePostModal';
import ErrorBoundary from './ErrorBoundary';
import { hapticLight } from '../utils/haptics';

const navItems = [
  { to: '/', label: 'Home', Icon: Home, end: true },
  { to: '/explore', label: 'Explore', Icon: Compass },
  { to: '/prayer', label: 'Prayer', Icon: HandHeart },
  { to: '/messages', label: 'Chats', Icon: MessageCircle },
  { to: '/profile', label: 'Profile', Icon: User },
];

// The branded global header (logo + avatar + search + bell) appears ONLY on
// Home. Every other page has its own in-page title/back button.
const SHOW_HEADER_ON = ['/'];
// Immersive drill-ins (chat thread /messages/:id, prayer /pray/:id) hide the nav.
// The list pages (/messages, /prayer) keep their frame.
const HIDE_NAV_ON = ['/messages/', '/pray/'];
// Confession wall + detail and Bible Maps hide the bottom nav (immersive, back-arrow to leave)
const HIDE_NAV_EXACT = ['/confessions', '/bible-maps'];

// Cross-fade between pages on navigation. We animate opacity ONLY (no transform):
// a transform on this wrapper would establish a containing block and re-anchor
// every `position: fixed` composer/bottom-sheet/full-screen page to the wrapper
// instead of the viewport. Opacity is safe. useOutlet() (not <Outlet/>) lets the
// exiting page keep rendering its own content while it fades out.
function AnimatedOutlet({ fullHeight }) {
  const location = useLocation();
  const element = useOutlet();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        style={fullHeight ? { height: '100%' } : { minHeight: '100%' }}
      >
        {element}
      </motion.div>
    </AnimatePresence>
  );
}

export default function Layout() {
  const { notifications, unreadCount, unreadMessages } = useSocket();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [latestToast, setLatestToast] = useState(null);
  const [prevCount, setPrevCount] = useState(0);
  const [showCreatePost, setShowCreatePost] = useState(false);

  useEffect(() => {
    if (notifications.length > prevCount) {
      setLatestToast(notifications[0]);
    }
    setPrevCount(notifications.length);
  }, [notifications]);

  const location = useLocation();
  const hideNavThread = HIDE_NAV_ON.some(p => location.pathname.startsWith(p) && location.pathname.length > p.length);
  const hideNavConfession = HIDE_NAV_EXACT.some(p => location.pathname.startsWith(p));
  const hideNav = hideNavThread || hideNavConfession;
  const showHeader = SHOW_HEADER_ON.includes(location.pathname);
  // Pages that fill the viewport with their own flex/scroll layout (chat thread,
  // confession detail, immersive prayer, bible map) need a height:100% wrapper so
  // their `h-full` children resolve; every other page grows and lets <main> scroll.
  const isConfessionDetail = location.pathname.startsWith('/confessions/') && location.pathname.length > '/confessions/'.length;
  const fullHeightPage = hideNavThread || isConfessionDetail || location.pathname === '/bible-maps';

  return (
    <div className="h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative shadow-xl overflow-hidden" style={{ height: '100dvh' }}>
      {showHeader && (
        <header
          className="water-header water-tile-blue px-4 pb-2.5 flex items-center justify-between z-30"
          style={{ paddingTop: 'calc(0.625rem + env(safe-area-inset-top))' }}
        >
          <button onClick={() => setShowCreatePost(true)} className="flex-shrink-0" style={{ position: 'relative', zIndex: 1 }}>
            {user?.profilePhoto ? (
              <img src={user.profilePhoto} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#2C4055' }}>
                <span className="text-white font-bold text-base">{user?.name?.charAt(0).toUpperCase() || '?'}</span>
              </div>
            )}
          </button>
          <Logo size="sm" light={false} style={{ position: 'relative', zIndex: 1 }} />
          <div className="flex items-center gap-3 justify-end w-16" style={{ position: 'relative', zIndex: 1 }}>
            <button onClick={() => navigate('/search')} className="w-9 h-9 flex items-center justify-center">
              <Search size={22} strokeWidth={1.5} color="#262626" />
            </button>
            <button onClick={() => navigate('/notifications')} className="relative w-9 h-9 flex items-center justify-center">
              <Bell size={22} strokeWidth={1.5} color="#262626" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center leading-none font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>
      )}

      {latestToast && <Toast key={latestToast.id} message={latestToast.message} />}

      <main
        className="flex-1 overflow-y-auto"
        style={{
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          // Header only renders on Home; every other page needs the top inset
          // here so its own top content doesn't sit under the status bar/notch.
          paddingTop: showHeader ? undefined : 'env(safe-area-inset-top)',
          // Nav sits at safe-bottom + 0.5rem with a 48px tap target; clear its
          // top edge (and the home indicator) with matching bottom padding.
          paddingBottom: hideNav ? undefined : 'calc(4.5rem + env(safe-area-inset-bottom))',
        }}
      >
        {/* Per-page boundary — a page crash shows the fallback but the
            header/nav (rendered outside this) survive. Keyed by pathname
            so navigating away auto-recovers. */}
        <ErrorBoundary resetKey={location.pathname}>
          <AnimatedOutlet fullHeight={fullHeightPage} />
        </ErrorBoundary>
      </main>

      {showCreatePost && (
        <CreatePostModal
          onClose={() => setShowCreatePost(false)}
          onCreate={(post) => {
            setShowCreatePost(false);
            window.dispatchEvent(new CustomEvent('post_created', { detail: post }));
          }}
        />
      )}

      {!hideNav && (
        <div
          className="fixed left-1/2 -translate-x-1/2 flex gap-2 z-30"
          style={{ bottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
        >
          {navItems.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={hapticLight}>
              {({ isActive }) => (
                <motion.div
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className="relative flex items-center justify-center"
                  style={{ width: 48, height: 48 }}
                >
                  <Icon
                    size={23}
                    strokeWidth={isActive ? 2.5 : 2}
                    color={isActive ? '#2C4055' : '#1A1A1A'}
                  />
                  {label === 'Chats' && unreadMessages > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center leading-none font-bold">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </motion.div>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
