import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import Toast from './Toast';

const navItems = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/community', label: 'Feed', icon: '✝️' },
  { to: '/search', label: 'Search', icon: '🔍' },
  { to: '/churches', label: 'Churches', icon: '⛪' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

export default function Layout() {
  const { notifications } = useSocket();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [latestToast, setLatestToast] = useState(null);
  const [prevCount, setPrevCount] = useState(0);

  useEffect(() => {
    if (notifications.length > prevCount) {
      setLatestToast(notifications[0]);
    }
    setPrevCount(notifications.length);
  }, [notifications]);

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative shadow-xl">
      <header className="prayer-gradient text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <span className="text-xl">✝</span>
          <span className="font-bold text-lg">FaithFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/notifications')} className="relative">
            <span className="text-xl">🔔</span>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {unread}
              </span>
            )}
          </button>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="text-xs text-white/70 hover:text-white">Logout</button>
        </div>
      </header>

      {latestToast && <Toast key={latestToast.id} message={latestToast.message} />}

      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 flex z-30">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors
               ${isActive ? 'text-faith-600' : 'text-gray-400 hover:text-gray-600'}`
            }
          >
            <span className="text-lg mb-0.5">{icon}</span>
            <span className="text-[10px]">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
