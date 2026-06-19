import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Compass, Search, MessageCircle, User, Bell } from 'lucide-react';
import Toast from './Toast';
import Logo from './Logo';
import CreatePostModal from './CreatePostModal';
import { springTap } from '../utils/animations';

const navItems = [
  { to: '/', label: 'Home', Icon: Home, end: true },
  { to: '/explore', label: 'Explore', Icon: Compass },
  { to: '/search', label: 'Search', Icon: Search },
  { to: '/messages', label: 'Chats', Icon: MessageCircle },
  { to: '/profile', label: 'Profile', Icon: User },
];

const HIDE_FAB_ON = ['/prayer', '/bible', '/messages'];
const HIDE_HEADER_ON = ['/profile'];

export default function Layout() {
  const { notifications, unreadCount, unreadMessages } = useSocket();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [latestToast, setLatestToast] = useState(null);
  const [prevCount, setPrevCount] = useState(0);
  const [showCreatePost, setShowCreatePost] = useState(false);

  useEffect(() => {
    if (notifications.length > prevCount) {
      setLatestToast(notifications[0]);
    }
    setPrevCount(notifications.length);
  }, [notifications]);

  const hideFAB = HIDE_FAB_ON.some(p => location.pathname.startsWith(p));
  const hideHeader = HIDE_HEADER_ON.some(p => location.pathname.startsWith(p));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative shadow-xl">
      {!hideHeader && <header className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-between sticky top-0 z-30">
        <button onClick={() => setShowCreatePost(true)} className="flex-shrink-0">
          {user?.profilePhoto ? (
            <img src={user.profilePhoto} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center">
              <span className="text-white font-bold text-base">{user?.name?.charAt(0).toUpperCase() || '?'}</span>
            </div>
          )}
        </button>
        <Logo size="sm" light={false} />
        <div className="flex items-center justify-end w-10">
          <button onClick={() => navigate('/notifications')} className="relative">
            <Bell size={22} strokeWidth={1.5} color="#1e3a8a" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center leading-none font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>}

      {latestToast && <Toast key={latestToast.id} message={latestToast.message} />}

      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* FAB Pray button */}
      <AnimatePresence>
        {!hideFAB && (
          <motion.button
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.35 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => navigate('/prayer')}
            className="fixed bottom-[72px] left-1/2 -translate-x-1/2 z-40 px-7 py-3 rounded-full font-bold text-sm text-white shadow-xl"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 4px 20px rgba(249,115,22,0.45)' }}
          >
            Pray
          </motion.button>
        )}
      </AnimatePresence>

      {showCreatePost && (
        <CreatePostModal
          onClose={() => setShowCreatePost(false)}
          onCreate={(post) => {
            setShowCreatePost(false);
            window.dispatchEvent(new CustomEvent('post_created', { detail: post }));
          }}
        />
      )}

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 flex z-30 shadow-lg">
        {navItems.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex items-center justify-center py-3.5 transition-colors relative
               ${isActive ? 'text-faith-600' : 'text-gray-900'}`
            }
          >
            {({ isActive }) => (
              <>
                <motion.div className="relative" whileTap={{ scale: 0.82 }} transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                  {label === 'Chats' && unreadMessages > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center leading-none font-bold">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </motion.div>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
