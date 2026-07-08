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
  { to: '/search', label: 'Search', Icon: Search },
  { to: '/messages', label: 'Chats', Icon: MessageCircle },
  { to: '/profile', label: 'Profile', Icon: User },
];

const HIDE_HEADER_ON = ['/profile'];

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
  const hideHeader = HIDE_HEADER_ON.some(p => location.pathname.startsWith(p));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative shadow-xl">
      {!hideHeader && <header className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-between sticky top-0 z-30">
        <button onClick={() => setShowCreatePost(true)} className="flex-shrink-0">
          {user?.profilePhoto ? (
            <img src={user.profilePhoto} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#C9932F' }}>
              <span className="text-white font-bold text-base">{user?.name?.charAt(0).toUpperCase() || '?'}</span>
            </div>
          )}
        </button>
        <Logo size="sm" light={false} />
        <div className="flex items-center gap-3 justify-end w-16">
          <button onClick={() => navigate('/prayer')} className="w-9 h-9 flex items-center justify-center">
            <HandHeart size={22} strokeWidth={1.5} color="#262626" />
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
      </header>}

      {latestToast && <Toast key={latestToast.id} message={latestToast.message} />}

      <main className="flex-1 overflow-y-auto pb-20">
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
