import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useSocket } from '../contexts/SocketContext';

const TYPE_ICON = {
  PRAYER_STARTED: '🙏',
  NEW_FOLLOWER: '👥',
  POST_LIKE: '❤️',
  POST_COMMENT: '💬',
};

function NotificationRow({ n }) {
  const navigate = useNavigate();
  const senderName = n.sender?.name;
  const senderId = n.sender?.id;

  // Split message to make sender name clickable
  // Typical messages: "John started praying for you", "John followed you", "John liked your post"
  let content;
  if (senderName && senderId && n.message.startsWith(senderName)) {
    const rest = n.message.slice(senderName.length);
    content = (
      <span>
        <Link
          to={`/profile/${senderId}`}
          className="font-bold text-faith-600"
          onClick={e => e.stopPropagation()}
        >
          {senderName}
        </Link>
        {rest}
      </span>
    );
  } else {
    content = <span>{n.message}</span>;
  }

  return (
    <button
      onClick={() => senderId && navigate(`/profile/${senderId}`)}
      className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left fade-in transition-colors active:scale-[0.98] ${
        !n.isRead ? 'bg-faith-50 border-faith-100' : 'bg-white border-gray-100'
      }`}
    >
      {/* Avatar or emoji icon */}
      <div className="flex-shrink-0">
        {n.sender?.profilePhoto ? (
          <img
            src={n.sender.profilePhoto}
            alt={senderName}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : senderName ? (
          <div className="w-10 h-10 rounded-full bg-faith-100 flex items-center justify-center text-faith-600 font-bold text-sm">
            {senderName[0].toUpperCase()}
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
            {TYPE_ICON[n.type] || '🔔'}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 leading-snug">{content}</p>
        {n.createdAt && (
          <p className="text-xs text-gray-400 mt-0.5">{getTimeAgo(n.createdAt)}</p>
        )}
      </div>

      {!n.isRead && (
        <div className="w-2 h-2 bg-faith-500 rounded-full flex-shrink-0" />
      )}
    </button>
  );
}

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
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : deduped.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">🔔</div>
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {deduped.map((n, i) => (
            <NotificationRow key={n.id || i} n={n} />
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
