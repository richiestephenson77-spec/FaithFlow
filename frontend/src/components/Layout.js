import { NavLink, useNavigate, useLocation, useOutlet } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useMotionValueEvent, useDragControls, animate } from 'framer-motion';
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
// How much a drag toward a nonexistent tab (before Home / after Profile) resists.
const EDGE_RUBBER_BAND = 0.3;

const SLIDE_TRANSITION = { type: 'tween', duration: 0.38, ease: [0.4, 0.0, 0.2, 1] };
const FADE_TRANSITION = { duration: 0.18, ease: 'easeOut' };
const DRAG_RELEASE_SPRING = { type: 'spring', stiffness: 380, damping: 38 };

// Mirrors NavLink's own active-match rules (exact for `end` items, prefix
// otherwise) so swipe-nav agrees with which tab icon is actually highlighted.
function isTabActive(pathname, item) {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function getTabIndex(pathname) {
  return navItems.findIndex(item => isTabActive(pathname, item));
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

// Continuous horizontal slide between the 5 main tabs (fade elsewhere).
//
// FIXED-POSITION SAFETY: any CSS `transform` on an ancestor creates a
// containing block for `position: fixed` descendants, silently re-anchoring
// composers/sheets/banners to that ancestor instead of the viewport — this is
// why the app used a plain opacity fade before. This component avoids that by
// keeping the transform TRANSIENT: each page's own `x` motion value is bound
// via `style={{ x }}` only while it is actively animating or being dragged;
// the instant it settles at 0 (see the useMotionValueEvent below), the inline
// `transform` is stripped from the DOM node entirely — not just set to
// `translateX(0)`, which would still count — so an idle tab is exactly as
// "un-transformed" as it was under the old fade, and any fixed element a page
// opens while at rest anchors to the real viewport. The bottom nav and header
// are rendered as SIBLINGS of this whole tree in Layout below, never as a
// descendant of any transformed wrapper, so they're never at risk at all.
//
// `isSlide`/`direction` are computed by Layout (which owns the previous-path
// tracking) and passed in, then ALSO handed to <AnimatePresence custom>, since
// that's the only way an EXITING instance (already removed from the tree) can
// learn the direction of the transition that's currently removing it.
function AnimatedOutlet({ fullHeight, isSlide, direction, registerCurrentX, showHeader, hideNav }) {
  const location = useLocation();
  const element = useOutlet();
  const nodeRef = useRef(null);
  const x = useMotionValue(0);

  useEffect(() => {
    // Seed this fresh instance's entry point (off the right/left edge for a
    // tab slide, or in place for a fade) then animate home. Registering the
    // live motion value with Layout is what lets an in-progress finger-drag
    // steer THIS page once it becomes the settled/current one.
    x.set(isSlide ? direction * window.innerWidth : 0);
    registerCurrentX?.(x);
    const controls = animate(x, 0, isSlide ? SLIDE_TRANSITION : FADE_TRANSITION);
    return () => controls.stop();
  }, [location.pathname]);

  // Settled at rest — strip the inline transform so this page's own
  // position:fixed descendants (sheets, banners, composers) anchor to the
  // real viewport again. This is the one step that must never be skipped.
  useMotionValueEvent(x, 'change', (latest) => {
    if (latest === 0 && nodeRef.current) nodeRef.current.style.transform = '';
  });

  return (
    <motion.div
      key={location.pathname}
      custom={{ direction, isSlide }}
      ref={nodeRef}
      style={{
        x,
        opacity: isSlide ? 1 : undefined,
        position: 'absolute',
        inset: 0,
        overflowY: fullHeight ? 'hidden' : 'auto',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        // Header only renders on Home; every other page needs the top inset
        // here so its own top content doesn't sit under the status bar/notch.
        paddingTop: showHeader ? undefined : 'env(safe-area-inset-top)',
        // Nav sits flush at the safe-area inset with a 52px tap target; clear
        // its top edge (plus breathing room) with generous bottom padding.
        paddingBottom: hideNav ? undefined : 'calc(5.5rem + env(safe-area-inset-bottom))',
      }}
      initial={isSlide ? { x: direction * window.innerWidth, opacity: 1 } : { opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={(custom) => custom?.isSlide
        ? { x: custom.direction * -window.innerWidth, opacity: 1 }
        : { opacity: 0 }}
      transition={isSlide ? SLIDE_TRANSITION : FADE_TRANSITION}
    >
      {element}
    </motion.div>
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
  // Immersive live prayer session room (its own leave control).
  const hideNavSession = /^\/prayer-cells\/[^/]+\/(session|host|guest)$/.test(location.pathname);
  const hideNav = hideNavThread || hideNavConfession || hideNavSession;
  const showHeader = SHOW_HEADER_ON.includes(location.pathname);
  // Pages that fill the viewport with their own flex/scroll layout (chat thread,
  // confession detail, immersive prayer, bible map) need an exact-height box so
  // their `h-full` children resolve, and shouldn't ALSO scroll at this wrapper
  // level since they manage their own internal scroll region.
  const isConfessionDetail = location.pathname.startsWith('/confessions/') && location.pathname.length > '/confessions/'.length;
  const isFullThread = /^\/(messages|pray)\/[^/]+$/.test(location.pathname);
  const fullHeightPage = isFullThread || isConfessionDetail || location.pathname === '/bible-maps';

  const online = useOnlineStatus();

  // Direction-aware transition bookkeeping — owned here (not inside
  // AnimatedOutlet) so it can also be handed to <AnimatePresence custom>,
  // which is what lets the EXITING page (already unmounted from the tree)
  // still learn which way this specific transition is going.
  const prevPathRef = useRef(location.pathname);
  const prevIdx = getTabIndex(prevPathRef.current);
  const currIdx = getTabIndex(location.pathname);
  const isSlide = prevIdx !== -1 && currIdx !== -1 && prevIdx !== currIdx;
  const direction = currIdx > prevIdx ? 1 : -1;
  useEffect(() => {
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  // Swipe-nav between the 5 main tabs. Gated on hideNav (no nav = no tab
  // context = nothing to swipe between) — which already covers every
  // conflicting-gesture page this needs to skip: bible-maps and confessions
  // (HIDE_NAV_EXACT), and chat threads / immersive prayer (HIDE_NAV_ON).
  // Also requires the current route to actually BE one of the 5 tabs, so
  // swiping on a detail page (settings, a church profile, etc.) is a no-op.
  const mainRef = useRef(null);
  const dragControls = useDragControls();
  // The CURRENT tab page's own live x motion value (registered by
  // AnimatedOutlet once it settles as "current") — dragging writes straight
  // into it so the page follows the finger, then either springs back or
  // hands off to AnimatePresence's exit animation to finish the slide.
  const currentPageXRef = useRef(null);
  const dragStartXRef = useRef(0);
  const activeTabIndex = getTabIndex(location.pathname);
  const swipeEnabled = !hideNav && activeTabIndex !== -1;

  function handleSwipePointerDown(e) {
    if (!swipeEnabled) return;
    if (e.clientX < EDGE_GUARD_PX) return; // reserved for iOS's system back-swipe
    if (isInsideHorizontalScroller(e.target, mainRef.current)) return; // let chips/pills scroll instead
    dragStartXRef.current = currentPageXRef.current?.get() ?? 0;
    dragControls.start(e);
  }

  function handleSwipeDrag(e, info) {
    const target = currentPageXRef.current;
    if (!target) return;
    const raw = dragStartXRef.current + info.offset.x;
    const towardPrev = raw > 0; // dragging right = revealing the previous tab
    const atStart = activeTabIndex === 0 && towardPrev;
    const atEnd = activeTabIndex === navItems.length - 1 && !towardPrev;
    target.set((atStart || atEnd) ? raw * EDGE_RUBBER_BAND : raw);
  }

  function handleSwipeDragEnd(e, info) {
    const target = currentPageXRef.current;
    const { offset, velocity } = info;
    const passedThreshold = Math.abs(offset.x) > SWIPE_DISTANCE_THRESHOLD || Math.abs(velocity.x) > SWIPE_VELOCITY_THRESHOLD;
    const dir = offset.x < 0 ? 1 : -1; // dragging left = moving to the NEXT tab
    const targetIndex = activeTabIndex + dir;
    const canCommit = passedThreshold && targetIndex >= 0 && targetIndex < navItems.length;

    if (canCommit) {
      // Don't manually finish the animation here — navigate() swaps in the
      // new page, and AnimatePresence's exit variant carries THIS SAME motion
      // value the rest of the way from wherever the finger left it, while the
      // incoming page slides in from the opposite edge at the same time.
      navigate(navItems[targetIndex].to);
    } else if (target) {
      animate(target, 0, DRAG_RELEASE_SPRING);
    }
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
            <motion.button
              onClick={() => { hapticLight(); setTimeout(() => navigate('/search'), 130); }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              aria-label="Search"
              className="w-9 h-9 flex items-center justify-center"
            >
              <Search size={24} strokeWidth={2.5} color="#0A0A0A" />
            </motion.button>
            <button onClick={() => navigate('/notifications')} aria-label="Notifications" className="relative w-9 h-9 flex items-center justify-center">
              <Bell size={24} strokeWidth={2.5} color="#0A0A0A" />
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

      {/* Viewport: captures the swipe gesture and clips pages sliding past its
          edges. It never itself carries a transform — only the page WRAPPERS
          inside AnimatedOutlet do, and only transiently (see above) — so the
          bottom nav and header (both rendered OUTSIDE this element, below)
          are never nested inside anything that could re-anchor their fixed
          descendants; they stay exactly where CSS put them regardless of
          what's animating in here. drag/dragControls mirrors the original
          gesture-capture setup (dragListener=false + manual start) so the
          edge-guard and horizontal-scroller guards keep working exactly as
          before; dragConstraints pins THIS element itself at (0,0) — only
          onDrag/onDragEnd's raw pointer info is used, to steer the actual
          page via currentPageXRef. */}
      <motion.div
        ref={mainRef}
        className="flex-1 relative overflow-hidden"
        onPointerDown={handleSwipePointerDown}
        drag="x"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.35}
        dragMomentum={false}
        onDrag={handleSwipeDrag}
        onDragEnd={handleSwipeDragEnd}
      >
        {/* Per-page boundary — a page crash shows the fallback but the
            header/nav (rendered outside this) survive. Keyed by pathname
            so navigating away auto-recovers. */}
        <ErrorBoundary resetKey={location.pathname}>
          <AnimatePresence initial={false} custom={{ direction, isSlide }}>
            <AnimatedOutlet
              fullHeight={fullHeightPage}
              isSlide={isSlide}
              direction={direction}
              showHeader={showHeader}
              hideNav={hideNav}
              registerCurrentX={x => { currentPageXRef.current = x; }}
            />
          </AnimatePresence>
        </ErrorBoundary>
      </motion.div>

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
