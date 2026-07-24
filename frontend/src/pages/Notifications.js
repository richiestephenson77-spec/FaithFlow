import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Heart, MessageCircle, UserPlus, Sparkles, Users, HandHeart, Flame, RefreshCw, Radio, CheckCircle2 } from 'lucide-react';
import api from '../utils/api';
import { useSocket } from '../contexts/SocketContext';
import Avatar from '../components/Avatar';
import PullToRefresh from '../components/PullToRefresh';

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_META = {
  PRAYER_STARTED:          { Icon: Sparkles,      color: '#0A0A0A', bg: '#fffbeb' },
  SOMEONE_PRAYED:          { Icon: HandHeart,     color: '#0A0A0A', bg: 'rgba(44,64,85,0.08)' },
  PRAYER_ANSWERED:         { Icon: Sparkles,      color: '#10b981', bg: '#f0fdf4' },
  NEW_FOLLOWER:            { Icon: UserPlus,      color: '#6366f1', bg: '#eef2ff' },
  POST_LIKE:               { Icon: Heart,         color: '#ef4444', bg: '#fef2f2' },
  POST_COMMENT:            { Icon: MessageCircle, color: '#3b82f6', bg: '#eff6ff' },
  CONFESSION_COMMENT:      { Icon: MessageCircle, color: '#8A5CD0', bg: '#f5f0fc' },
  STREAK_AT_RISK:          { Icon: Flame,         color: '#E86A4B', bg: '#fdf0ec' },
  PARTNER_SHARED_PRAYER:   { Icon: Users,         color: '#0A0A0A', bg: 'rgba(44,64,85,0.08)' },
  REQUEST_NEEDS_BUMP:      { Icon: RefreshCw,     color: '#0A0A0A', bg: 'rgba(44,64,85,0.08)' },
  PRAYER_PARTNER_MATCHED:  { Icon: Users,         color: '#0A0A0A', bg: '#fffbeb' },
  CELL_MEMBER_JOINED:      { Icon: Users,         color: '#2C4055', bg: 'rgba(44,64,85,0.08)' },
  CELL_JOIN_REQUEST:       { Icon: UserPlus,      color: '#2C4055', bg: 'rgba(44,64,85,0.08)' },
  CELL_REQUEST_APPROVED:   { Icon: CheckCircle2,  color: '#10b981', bg: '#f0fdf4' },
  CELL_SESSION_STARTED:    { Icon: Radio,         color: '#ED4956', bg: 'rgba(237,73,86,0.1)' },
};

// Tap-through destination per notification type. refId carries the entity id.
function routeFor(n) {
  switch (n.type) {
    case 'PRAYER_PARTNER_MATCHED': return '/prayer-partners';
    case 'SOMEONE_PRAYED':
    case 'PARTNER_SHARED_PRAYER':  return n.refId ? `/prayer/${n.refId}` : '/prayer';
    case 'PRAYER_ANSWERED':        return '/answered';
    case 'CONFESSION_COMMENT':     return n.refId ? `/confessions/${n.refId}` : '/confessions';
    case 'STREAK_AT_RISK':         return '/prayer';
    // Cell notifications: join/request → group info (approve/deny lives there),
    // approved → the cell, session started → straight into the live room.
    case 'CELL_MEMBER_JOINED':
    case 'CELL_JOIN_REQUEST':      return n.refId ? `/prayer-cells/${n.refId}/info` : '/prayer-cells';
    case 'CELL_REQUEST_APPROVED':  return n.refId ? `/prayer-cells/${n.refId}` : '/prayer-cells';
    case 'CELL_SESSION_STARTED':   return n.refId ? `/prayer-cells/${n.refId}/session` : '/prayer-cells';
    default:                       return n.sender?.id ? `/profile/${n.sender.id}` : null;
  }
}

function NotificationCard({ n, onFollowBack }) {
  const navigate = useNavigate();
  const meta = TYPE_META[n.type] || { Icon: Bell, color: '#9ca3af', bg: '#f9fafb' };
  const { Icon, color, bg } = meta;
  const senderName = n.sender?.name;
  const senderId = n.sender?.id;

  let content;
  if (senderName && senderId && n.message.startsWith(senderName)) {
    const rest = n.message.slice(senderName.length);
    content = (
      <span>
        <Link to={`/profile/${senderId}`} className="font-semibold text-gray-900" onClick={e => e.stopPropagation()}>
          {senderName}
        </Link>
        <span className="text-gray-600">{rest}</span>
      </span>
    );
  } else {
    content = <span className="text-gray-700">{n.message}</span>;
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: n.isRead ? 0 : -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      onClick={async () => {
        // Tapping the bump nudge refreshes the request's activity and returns it to the feed
        if (n.type === 'REQUEST_NEEDS_BUMP' && n.refId) {
          try { await api.post(`/prayers/${n.refId}/bump`); } catch {}
          navigate('/prayer');
          return;
        }
        const route = routeFor(n);
        if (route) navigate(route);
      }}
      className="relative flex items-start gap-3 px-4 py-3.5 cursor-pointer active:bg-gray-100/60 transition-colors"
      style={{ background: !n.isRead ? 'rgba(251,191,36,0.06)' : 'transparent' }}
    >
      {!n.isRead && (
        <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full" style={{ background: '#2C4055' }} />
      )}

      <div className="flex-shrink-0 relative">
        {n.sender ? (
          <Avatar user={n.sender} size="md" />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: bg }}>
            <Icon size={18} color={color} strokeWidth={1.8} />
          </div>
        )}
        {n.sender && (
          <div
            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
            style={{ background: bg }}
          >
            <Icon size={10} color={color} strokeWidth={2.5} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">{content}</p>
        <p className="text-xs text-gray-400 mt-0.5">{getTimeAgo(n.createdAt)}</p>

        {n.type === 'NEW_FOLLOWER' && !n.isFollowedByMe && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={e => { e.stopPropagation(); onFollowBack(n); }}
            className="mt-2 text-xs font-semibold px-3.5 py-1.5 rounded-full text-white"
            style={{ background: '#111827' }}
          >
            Follow Back
          </motion.button>
        )}
        {n.type === 'NEW_FOLLOWER' && n.isFollowedByMe && (
          <span className="mt-1.5 inline-block text-xs text-gray-400">Following</span>
        )}
      </div>
    </motion.div>
  );
}

function Section({ title, items, onFollowBack }) {
  if (!items.length) return null;
  return (
    <div className="mb-5">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-5 mb-2">{title}</p>
      <div className="bg-white rounded-2xl mx-4 overflow-hidden divide-y divide-gray-100" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        {items.map((n, i) => (
          <NotificationCard key={n.id || i} n={n} onFollowBack={onFollowBack} />
        ))}
      </div>
    </div>
  );
}

const PRAYER_TYPES = new Set(['PRAYER_STARTED', 'SOMEONE_PRAYED', 'PRAYER_ANSWERED', 'PARTNER_SHARED_PRAYER', 'STREAK_AT_RISK', 'REQUEST_NEEDS_BUMP', 'LEVEL_UP']);
const PEOPLE_TYPES = new Set(['NEW_FOLLOWER', 'POST_LIKE', 'POST_COMMENT', 'CONFESSION_COMMENT']);

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { notifications: live, markAllRead } = useSocket();

  const loadNotifications = useCallback(() => {
    return api.get('/notifications')
      .then(res => setNotifications(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadNotifications();
    api.post('/notifications/read-all').catch(() => {});
    markAllRead();
  }, []);

  const merged = [...live, ...notifications];
  const seen = new Set();
  const deduped = merged.filter(n => {
    const key = n.id || `${n.type}-${n.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const DAY = 86400000;
  const now = Date.now();
  const newGroup = deduped.filter(n => !n.isRead && (now - new Date(n.createdAt)) < DAY);
  const newIds = new Set(newGroup.map(n => n.id));
  const rest = deduped.filter(n => !newIds.has(n.id));
  const prayerGroup = rest.filter(n => PRAYER_TYPES.has(n.type));
  const peopleGroup = rest.filter(n => PEOPLE_TYPES.has(n.type));
  const otherGroup = rest.filter(n => !PRAYER_TYPES.has(n.type) && !PEOPLE_TYPES.has(n.type));

  const hasUnread = deduped.some(n => !n.isRead);

  async function handleMarkAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    markAllRead();
    await api.post('/notifications/read-all').catch(() => {});
  }

  async function handleFollowBack(n) {
    if (!n.sender?.id) return;
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isFollowedByMe: true } : x));
    await api.post(`/users/${n.sender.id}/follow`).catch(() => {
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isFollowedByMe: false } : x));
    });
  }

  return (
    <PullToRefresh onRefresh={loadNotifications}>
    <div className="bg-gray-50 min-h-full">
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-400 mt-0.5">Your faith community activity</p>
        </div>
        <AnimatePresence>
          {hasUnread && (
            <motion.button
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              onClick={handleMarkAllRead}
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(22,52,73,0.08)', color: '#0A0A0A', border: '1px solid rgba(22,52,73,0.15)' }}
            >
              Mark all read
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {loading ? (
        <div className="space-y-3 px-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : deduped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-8">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Bell size={28} color="#d1d5db" strokeWidth={1.5} />
          </div>
          <p className="font-semibold text-gray-600 text-center">No notifications yet</p>
          <p className="text-sm text-gray-400 text-center mt-1">
            When someone prays for you or follows you, you'll see it here.
          </p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          <Section title="New" items={newGroup} onFollowBack={handleFollowBack} />
          <Section title="Prayer Activity" items={prayerGroup} onFollowBack={handleFollowBack} />
          <Section title="People" items={peopleGroup} onFollowBack={handleFollowBack} />
          <Section title="Other" items={otherGroup} onFollowBack={handleFollowBack} />
        </motion.div>
      )}
    </div>
    </PullToRefresh>
  );
}
