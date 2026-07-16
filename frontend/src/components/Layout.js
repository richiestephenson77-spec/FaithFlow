import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Home, Compass, Search, MessageCircle, User, Bell, HandHeart } from 'lucide-react';
import Toast from './Toast';
import Logo from './Logo';
import CreatePostModal from './CreatePostModal';

const navItems = [
  { to: '/', label: 'Home', Icon: Home, end: true },
  { to: '/explore', label: 'Explore', Icon: Compass },
  { to: '/prayer', label: 'Prayer', Icon: HandHeart },
  { to: '/messages', label: 'Chats', Icon: MessageCircle },
  { to: '/profile', label: 'Profile', Icon: User },
];

// Bible Maps is fully immersive (no header, no nav — floating back button instead)
const HIDE_HEADER_ON = ['/profile', '/bible-maps'];
// Individual chat threads (/messages/:id) go immersive — the /messages list keeps its frame
const HIDE_NAV_ON = ['/messages/'];
// Confession wall + detail hide the nav (immersive, back-arrow to leave) but KEEP the header.
// Bible Maps hides the nav too (its own hideHeader entry above hides the header).
const HIDE_NAV_EXACT = ['/confessions', '/bible-maps'];

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
  // Threads have their own header, so hide the global one there; confessions keep it.
  const hideHeader = HIDE_HEADER_ON.some(p => location.pathname.startsWith(p)) || hideNavThread;

  return (
    <div className="h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative shadow-xl overflow-hidden" style={{ height: '100dvh' }}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="droplet-warp-1" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.025 0.04" numOctaves="1" seed="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="7" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="droplet-warp-2" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.03 0.02" numOctaves="1" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      {!hideHeader && (
        <header
          className="water-header water-tile-blue px-4 pb-2.5 flex items-center justify-between z-30"
          style={{ paddingTop: 'calc(0.625rem + env(safe-area-inset-top))' }}
        >
          <button onClick={() => setShowCreatePost(true)} className="flex-shrink-0" style={{ position: 'relative', zIndex: 1 }}>
            {user?.profilePhoto ? (
              <img src={user.profilePhoto} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#C0603F' }}>
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
          // No global header here (profile / chat thread) — the page's own
          // top content would otherwise sit under the status bar/notch.
          paddingTop: hideHeader ? 'env(safe-area-inset-top)' : undefined,
          // Floating nav sits at safe-bottom + 1rem; clear it (and the
          // home indicator) with matching bottom padding when it's shown.
          paddingBottom: hideNav ? undefined : 'calc(6rem + env(safe-area-inset-bottom))',
        }}
      >
        <Outlet />
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
          className="fixed left-1/2 -translate-x-1/2 flex gap-3 z-30"
          style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          {navItems.map(({ to, label, Icon, end }, i) => (
            <NavLink key={to} to={to} end={end} style={{ position: 'relative', zIndex: 1 }}>
              {({ isActive }) => (
                <motion.div
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className={`droplet-nav droplet-shape-${(i % 5) + 1}`}
                  style={{ width: 58, height: 58, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                >
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    color={isActive ? '#163449' : 'rgba(22,52,73,0.55)'}
                    style={{
                      filter: `url(#droplet-warp-${(i % 2) + 1})`,
                      position: 'relative',
                      zIndex: 1,
                    }}
                  />
                  {label === 'Chats' && unreadMessages > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center leading-none font-bold" style={{ zIndex: 3 }}>
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
