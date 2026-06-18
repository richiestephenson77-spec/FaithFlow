import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useSocket } from '../contexts/SocketContext';

const ICONS = {
  PRAYER_STARTED: '🙏',
  NEW_FOLLOWER: '👥',
  POST_LIKE: '❤️',
  POST_COMMENT: '💬',
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { notifications: live, markAllRead } = useSocket();

  useEffect(() => {
    api.get('/notifications')
      .then(res => setNotifications(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    api.post('/notifications/read-all').catch(() => {});
    markAllRead();
  }, []);

  const all = [...live, ...notifications];
  const seen = new Set();
  const deduped = all.filter(n => {
    const key = n.id || `${n.type}-${n.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <div className="px-4 py-4">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Notifications</h2>

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : deduped.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">🔔</div>
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {deduped.map((n, i) => (
            <div key={n.id || i}
              className={`flex items-center gap-3 p-4 rounded-2xl border fade-in ${
                !n.isRead ? 'bg-faith-50 border-faith-100' : 'bg-white border-gray-100'}`}>
              <span className="text-2xl">{ICONS[n.type] || '🔔'}</span>
              <div>
                <p className="text-sm text-gray-700 font-medium">{n.message}</p>
                {n.createdAt && (
                  <p className="text-xs text-gray-400 mt-0.5">{getTimeAgo(n.createdAt)}</p>
                )}
              </div>
              {!n.isRead && <div className="w-2 h-2 bg-faith-500 rounded-full ml-auto flex-shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
