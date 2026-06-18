import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import Toast from './Toast';
import Logo from './Logo';

function HomeIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function FeedIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SearchIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ChurchIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L12 7M9 4.5L15 4.5" />
      <path d="M5 10h14l1 11H4L5 10z" />
      <rect x="9" y="14" width="6" height="7" />
    </svg>
  );
}

function ProfileIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

const navItems = [
  { to: '/', label: 'Home', Icon: HomeIcon },
  { to: '/community', label: 'Feed', Icon: FeedIcon },
  { to: '/search', label: 'Search', Icon: SearchIcon },
  { to: '/churches', label: 'Churches', Icon: ChurchIcon },
  { to: '/profile', label: 'Profile', Icon: ProfileIcon },
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
      <header className="prayer-gradient text-white px-4 py-2.5 flex items-center justify-between sticky top-0 z-30">
        <button onClick={() => { logout(); navigate('/login'); }}
          className="text-xs text-white/60 hover:text-white font-medium w-16">Logout</button>
        <Logo size="sm" light={true} />
        <div className="flex items-center justify-end w-16">
          <button onClick={() => navigate('/notifications')} className="relative">
            <BellIcon />
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center leading-none font-bold">
                {unread}
              </span>
            )}
          </button>
        </div>
      </header>

      {latestToast && <Toast key={latestToast.id} message={latestToast.message} />}

      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 flex z-30 shadow-lg">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2.5 transition-colors
               ${isActive ? 'text-faith-600' : 'text-gray-400 hover:text-gray-500'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon active={isActive} />
                <span className="text-[10px] mt-0.5 font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
