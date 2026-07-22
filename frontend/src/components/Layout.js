import { NavLink, useNavigate, useLocation, useOutlet } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Home, Compass, Search, MessageCircle, User, Bell, HandHeart } from 'lucide-react';
import Toast from './Toast';
import Logo from './Logo';
import CreatePostModal from './CreatePostModal';
import ErrorBoundary from './ErrorBoundary';
import { hapticLight } from '../utils/haptics';
import useOnlineStatus from '../hooks/useOnlineStatus';

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

// Swipe-nav tuning: distance/velocity needed to count as an intentional swipe,
// and the dead zone at the left screen edge reserved for iOS's system back gesture.
const SWIPE_DISTANCE_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 500;
const EDGE_GUARD_PX = 20;

// Mirrors NavLink's own active-match rules (exact for `end` items, prefix
// otherwise) so swipe-nav agrees with which tab icon is actually highlighted.
function isTabActive(pathname, item) {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

// Walks up from the touch target to the <main> boundary looking for a
// horizontally-scrollable ancestor (category chips, Worldwide/Near Me
// pills, etc.) so a swipe that starts on one of those scrolls the chips
// instead of hijacking the gesture for tab navigation.
function isInsideHorizontalScroller(target, boundary) {
  let el = target;
  while (el && el !== boundary && el instanceof HTMLElement) {
    const style = window.getComputedStyle(el);
    if ((style.overflowX === 'auto' || style.overflowX === 'scroll') && el.scrollWidth > el.clientWidth) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

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

  // Let any page (e.g. Home's empty-state CTA) open the create-post modal.
  useEffect(() => {
    const open = () => setShowCreatePost(true);
    window.addEventListener('open_create_post', open);
    return () => window.removeEventListener('open_create_post', open);
  }, []);

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

  const online = useOnlineStatus();

  // Swipe-nav between the 5 main tabs. Gated on hideNav (no nav = no tab
  // context = nothing to swipe between) — which already covers every
  // conflicting-gesture page this needs to skip: bible-maps and confessions
  // (HIDE_NAV_EXACT), and chat threads / immersive prayer (HIDE_NAV_ON).
  // Also requires the current route to actually BE one of the 5 tabs, so
  // swiping on a detail page (settings, a church profile, etc.) is a no-op.
  const mainRef = useRef(null);
  const dragControls = useDragControls();
  const activeTabIndex = navItems.findIndex(item => isTabActive(location.pathname, item));
  const swipeEnabled = !hideNav && activeTabIndex !== -1;

  function handleSwipePointerDown(e) {
    if (!swipeEnabled) return;
    if (e.clientX < EDGE_GUARD_PX) return; // reserved for iOS's system back-swipe
    if (isInsideHorizontalScroller(e.target, mainRef.current)) return; // let chips/pills scroll instead
    dragControls.start(e);
  }

  function handleSwipeDragEnd(e, info) {
    const { offset, velocity } = info;
    const passedThreshold = Math.abs(offset.x) > SWIPE_DISTANCE_THRESHOLD || Math.abs(velocity.x) > SWIPE_VELOCITY_THRESHOLD;
    if (!passedThreshold) return; // dragConstraints springs it back to center on its own
    const targetIndex = activeTabIndex + (offset.x < 0 ? 1 : -1);
    if (targetIndex < 0 || targetIndex >= navItems.length) return; // already at the first/last tab
    navigate(navItems[targetIndex].to);
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative shadow-xl overflow-hidden" style={{ height: '100dvh' }}>
      {/* Slim, non-blocking offline banner — auto-hides on reconnect. */}
      <AnimatePresence>
        {!online && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 right-0 z-50 flex items-center justify-center pointer-events-none"
            style={{ top: 0, paddingTop: 'calc(env(safe-area-inset-top) + 4px)', paddingBottom: 4, background: 'rgba(44,64,85,0.94)' }}
          >
            <span style={{ fontSize: 12, fontWeight: 500, color: '#FFFFFF', letterSpacing: 0.2 }}>You're offline</span>
          </motion.div>
        )}
      </AnimatePresence>
      {showHeader && (
        <header
          className="water-header water-tile-blue px-4 pb-2.5 flex items-center justify-between z-30"
          style={{ paddingTop: 'calc(0.625rem + env(safe-area-inset-top))' }}
        >
          <button onClick={() => setShowCreatePost(true)} aria-label="Create post" className="flex-shrink-0" style={{ position: 'relative', zIndex: 1 }}>
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
            <button onClick={() => navigate('/search')} aria-label="Search" className="w-9 h-9 flex items-center justify-center">
              <Search size={22} strokeWidth={1.5} color="#262626" />
            </button>
            <button onClick={() => navigate('/notifications')} aria-label="Notifications" className="relative w-9 h-9 flex items-center justify-center">
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

      <motion.main
        ref={mainRef}
        className="flex-1 overflow-y-auto"
        onPointerDown={handleSwipePointerDown}
        drag="x"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.35}
        dragMomentum={false}
        onDragEnd={handleSwipeDragEnd}
        style={{
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          // Header only renders on Home; every other page needs the top inset
          // here so its own top content doesn't sit under the status bar/notch.
          paddingTop: showHeader ? undefined : 'env(safe-area-inset-top)',
          // Nav sits flush at the safe-area inset with a 52px tap target; clear
          // its top edge (plus breathing room) with generous bottom padding.
          paddingBottom: hideNav ? undefined : 'calc(5.5rem + env(safe-area-inset-bottom))',
        }}
      >
        {/* Per-page boundary — a page crash shows the fallback but the
            header/nav (rendered outside this) survive. Keyed by pathname
            so navigating away auto-recovers. */}
        <ErrorBoundary resetKey={location.pathname}>
          <AnimatedOutlet fullHeight={fullHeightPage} />
        </ErrorBoundary>
      </motion.main>

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
          style={{ bottom: 0, paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {navItems.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={hapticLight} aria-label={label}>
              {({ isActive }) => (
                <motion.div
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className="relative flex items-center justify-center"
                  style={{ width: 52, height: 52 }}
                >
                  <motion.span
                    className="flex items-center justify-center"
                    animate={{ scale: isActive ? 1.3 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  >
                    <Icon
                      size={26}
                      strokeWidth={isActive ? 2.5 : 2}
                      color={isActive ? '#0A0A0A' : '#1A1A1A'}
                    />
                  </motion.span>
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
