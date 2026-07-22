import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, ShieldCheck, Award } from 'lucide-react';
import Avatar from './Avatar';
import api from '../utils/api';

export default function UserRow({ user: initialUser, onNavigate }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(initialUser);
  const [toggling, setToggling] = useState(false);

  async function handleFollow(e) {
    e.stopPropagation();
    if (toggling) return;
    setToggling(true);
    // Optimistic update
    setUser(u => ({ ...u, isFollowedByMe: !u.isFollowedByMe, followerCount: (u.followerCount || 0) + (u.isFollowedByMe ? -1 : 1) }));
    try {
      await api.post(`/users/${user.id}/follow`);
    } catch {
      // revert on failure
      setUser(u => ({ ...u, isFollowedByMe: !u.isFollowedByMe, followerCount: (u.followerCount || 0) + (u.isFollowedByMe ? -1 : 1) }));
    }
    setToggling(false);
  }

  function handleRowClick() {
    if (onNavigate) onNavigate(user.id);
    else navigate(`/profile/${user.id}`);
  }

  return (
    <div
      onClick={handleRowClick}
      className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-gray-50 transition-colors"
    >
      <div className="flex-shrink-0">
        <Avatar user={user} size="md" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
          {user.isVerifiedPastor && (
            <ShieldCheck size={13} color="#0A0A0A" strokeWidth={2} className="flex-shrink-0" />
          )}
        </div>
        {user.churchName && (
          <p className="text-xs font-medium truncate mt-0.5" style={{ color: '#0A0A0A' }}>{user.churchName}</p>
        )}
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {user.location && (
            <span className="flex items-center gap-0.5 text-xs text-gray-400">
              <MapPin size={10} strokeWidth={1.8} /> {user.location}
            </span>
          )}
          {user.followerCount > 0 && (
            <span className="text-xs text-gray-400">{user.followerCount} {user.followerCount === 1 ? 'believer' : 'believers'}</span>
          )}
          {user.prayerWarriorBadge && (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(201,147,47,0.1)', color: '#0A0A0A' }}>
              <Award size={10} strokeWidth={2} />Prayer Warrior
            </span>
          )}
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        onClick={handleFollow}
        disabled={toggling}
        className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
          user.isFollowedByMe
            ? 'bg-gray-100 text-gray-400'
            : 'border border-gray-200 text-gray-700 hover:border-[#2C4055]/40 hover:text-[#0A0A0A]'
        }`}
      >
        {user.isFollowedByMe ? 'Following' : 'Follow'}
      </motion.button>
    </div>
  );
}
