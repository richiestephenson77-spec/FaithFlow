import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HandHeart, Clock, Users, Globe, Lock, Shield, MoreHorizontal, Trophy, Flame, Award, ChevronLeft } from 'lucide-react';
import api from '../utils/api';
import { WaterButton } from '../components/water';
import { track } from '../utils/analytics';
import { useAuth } from '../contexts/AuthContext';
import PostGrid from '../components/PostGrid';
import FollowListModal from '../components/FollowListModal';
import ReportSheet from '../components/ReportSheet';
import { useToast } from '../contexts/ToastContext';

const VIS_OPTS = {
  PUBLIC:      { label: 'Public',      Icon: Globe,  bg: 'bg-gray-100',   text: 'text-gray-500' },
  PRIVATE:     { label: 'Private',     Icon: Lock,   bg: 'bg-purple-50',  text: 'text-purple-600' },
  PASTOR_ONLY: { label: 'Pastor Only', Icon: Shield, bg: 'bg-green-50',   text: 'text-green-600' },
};

function VisibilityBadge({ visibility }) {
  const opt = VIS_OPTS[visibility] || VIS_OPTS.PUBLIC;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${opt.bg} ${opt.text}`}>
      <opt.Icon size={9} strokeWidth={2} /> {opt.label}
    </span>
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

function formatDuration(seconds) {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function Profile() {
  const { id } = useParams();
  const { user: me, updateUser } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const isOwnProfile = !id || id === me?.id;
  const profileId = id || me?.id;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('grid');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followModal, setFollowModal] = useState(null); // 'followers' | 'following'
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [prayerMenu, setPrayerMenu] = useState(null);   // prayer with open ··· menu
  const [deletingPrayer, setDeletingPrayer] = useState(null);
  const [quotaStats, setQuotaStats] = useState(null);

  const profilePhotoRef = useRef();
  const [previewProfile, setPreviewProfile] = useState(null);
  const [modMenu, setModMenu] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState(false);

  async function reloadProfile() {
    try { const res = await api.get(`/users/${profileId}`); setProfile(res.data); } catch {}
  }

  async function handleBlock() {
    try {
      await api.post('/blocks', { userId: profileId });
      showToast(`Blocked ${profile?.name?.split(' ')[0] || ''}`.trim());
      setBlockConfirm(false); setModMenu(false);
      await reloadProfile();
    } catch (err) { showToast(err.friendlyMessage || 'Could not block user', 'error'); }
  }

  async function handleUnblock() {
    try {
      await api.delete(`/blocks/${profileId}`);
      showToast('Unblocked');
      setModMenu(false);
      await reloadProfile();
    } catch (err) { showToast(err.friendlyMessage || 'Could not unblock user', 'error'); }
  }

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, postsRes] = await Promise.all([
          api.get(`/users/${profileId}`),
          api.get(`/posts/user/${profileId}`),
        ]);
        setProfile(profileRes.data);
        setPosts(postsRes.data);
        setFollowing(profileRes.data.isFollowing);
        setEditForm({
          name: profileRes.data.name,
          bio: profileRes.data.bio || '',
          churchName: profileRes.data.churchName || '',
          location: profileRes.data.location || '',
          gender: profileRes.data.gender || '',
        });
      } catch {}
      setLoading(false);
    }
    if (profileId) load();
  }, [profileId]);

  useEffect(() => {
    if (!isOwnProfile) return;
    // Load quota completion count for own profile
    Promise.all([
      api.get('/quota/today').catch(() => null),
    ]).then(([quotaRes]) => {
      if (quotaRes) setQuotaStats(quotaRes.data);
    });
  }, [isOwnProfile]);

  async function handleFollow() {
    try {
      const res = await api.post(`/users/${profileId}/follow`);
      if (res.data.following) track('user_followed', { followedUserId: profileId });
      setFollowing(res.data.following);
      setProfile(p => ({
        ...p,
        _count: { ...p._count, followers: p._count.followers + (res.data.following ? 1 : -1) },
      }));
      showToast(res.data.following ? `Following ${profile?.name?.split(' ')[0] || ''}`.trim() : 'Unfollowed');
    } catch (err) {
      showToast(err.friendlyMessage || 'Could not update follow', 'error');
    }
  }

  async function deletePrayer(prayer) {
    try {
      await api.delete(`/prayers/${prayer.id}`);
      setProfile(p => ({ ...p, prayerRequests: p.prayerRequests.filter(r => r.id !== prayer.id) }));
      showToast('Prayer request deleted');
    } catch (err) {
      showToast(err.friendlyMessage || 'Could not delete request', 'error');
    }
    setDeletingPrayer(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(editForm).forEach(([k, v]) => { if (v !== '') formData.append(k, v); });
      if (profilePhotoRef.current?.files[0]) formData.append('profilePhoto', profilePhotoRef.current.files[0]);

      const res = await api.put('/users/me', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(p => ({ ...p, ...res.data }));
      updateUser(res.data);
      setEditing(false);
      setPreviewProfile(null);
      showToast('Profile updated');
    } catch (err) {
      showToast(err.friendlyMessage || 'Could not save profile', 'error');
    }
    setSaving(false);
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  if (!profile) return <div className="p-8 text-center text-gray-400">Profile not found</div>;

  // Moderation: a block in either direction — show a neutral unavailable state,
  // with Unblock only when the viewer is the one who blocked.
  if (profile.unavailable) {
    return (
      <div className="min-h-full bg-gray-50 flex flex-col">
        <div className="px-4 pt-5 pb-3 flex items-center gap-3 bg-white" style={{ borderBottom: '1px solid #EFEFEF' }}>
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1">
            <ChevronLeft size={22} color="#163449" strokeWidth={2} />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <p className="font-semibold" style={{ color: '#163449' }}>This user is unavailable</p>
          {profile.isBlockedByMe && (
            <>
              <p className="text-sm mt-1" style={{ color: '#8E8E8E' }}>You blocked {profile.name || 'this user'}.</p>
              <button onClick={handleUnblock} className="mt-5 px-6 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'rgba(44,64,85,0.08)', color: '#2C4055' }}>
                Unblock
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const { stats } = profile;

  const staggerChildren = { animate: { transition: { staggerChildren: 0.08 } } };
  const fadeUpItem = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

  return (
    <div className="pb-8 bg-gray-50 min-h-full relative">
      {/* Settings gear — absolute top-right */}
      {isOwnProfile && (
        <Link
          to="/settings"
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 border border-gray-200 flex items-center justify-center shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </Link>
      )}

      {/* Moderation ··· menu — other users' profiles */}
      {!isOwnProfile && (
        <button
          onClick={() => setModMenu(true)}
          aria-label="More options"
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 border border-gray-200 flex items-center justify-center shadow-sm"
        >
          <MoreHorizontal size={16} strokeWidth={2} color="#6b7280" />
        </button>
      )}

      {modMenu && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={() => setModMenu(false)}>
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { setModMenu(false); setReportOpen(true); }} className="w-full text-left px-4 py-3.5 text-sm font-medium rounded-xl" style={{ color: '#1A1A1A' }}>Report</button>
            {profile.isBlockedByMe
              ? <button onClick={handleUnblock} className="w-full text-left px-4 py-3.5 text-sm font-medium rounded-xl" style={{ color: '#2C4055' }}>Unblock user</button>
              : <button onClick={() => { setModMenu(false); setBlockConfirm(true); }} className="w-full text-left px-4 py-3.5 text-sm font-medium rounded-xl" style={{ color: '#C0392B' }}>Block user</button>}
            <button onClick={() => setModMenu(false)} className="w-full text-center px-4 py-3.5 text-sm font-semibold rounded-xl mt-1" style={{ color: '#8E8E8E' }}>Cancel</button>
          </div>
        </div>
      )}

      {reportOpen && (
        <ReportSheet contentType="PROFILE" contentId={profileId} reportedUserId={profileId} onClose={() => setReportOpen(false)} />
      )}

      {blockConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center px-8" onClick={() => setBlockConfirm(false)}>
          <div className="bg-white rounded-3xl w-full max-w-xs p-5 text-center" onClick={e => e.stopPropagation()}>
            <p className="font-bold text-[15px]" style={{ color: '#163449' }}>Block {profile.name || 'this user'}?</p>
            <p className="text-sm mt-2 leading-snug" style={{ color: '#6B7680' }}>They won't be able to message you or see your content, and you won't see theirs.</p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setBlockConfirm(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: '#F0F0F0', color: '#1A1A1A' }}>Cancel</button>
              <button onClick={handleBlock} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white" style={{ background: '#C0392B' }}>Block</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PROFILE HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white px-4 pt-12 pb-5"
      >
        {/* Row 1: Photo + Stats */}
        <div className="flex items-center gap-5">
          {/* Photo with gradient border */}
          <motion.button
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.05 }}
            onClick={isOwnProfile ? () => profilePhotoRef.current?.click() : undefined}
            className="relative flex-shrink-0"
          >
            <div
              className="rounded-full p-[3px] flex-shrink-0"
              style={{ background: '#2C4055' }}
            >
              <div className="w-[80px] h-[80px] rounded-full overflow-hidden bg-gray-100 ring-2 ring-white">
                {(previewProfile || profile.profilePhoto)
                  ? <img src={previewProfile || profile.profilePhoto} alt="profile" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center bg-terracotta-50 text-terracotta-600 font-bold text-2xl">
                      {profile.name?.[0]?.toUpperCase()}
                    </div>
                }
              </div>
            </div>
            {isOwnProfile && (
              <div className="absolute bottom-0.5 right-0.5 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center shadow border-2 border-white">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            )}
          </motion.button>

          {/* Stats — 3 columns */}
          <motion.div
            variants={staggerChildren}
            initial="initial"
            animate="animate"
            className="flex-1 flex justify-around"
          >
            {[
              { value: stats?.totalSessions ?? 0, label: 'Total Prayers' },
              { value: profile._count?.followers ?? 0, label: 'Believers', onTap: () => setFollowModal('followers') },
              { value: profile._count?.posts ?? 0, label: 'Posts' },
            ].map(({ value, label, onTap }) => (
              <motion.button
                key={label}
                variants={fadeUpItem}
                onClick={onTap}
                className="flex flex-col items-center"
              >
                <span className="text-xl font-bold text-gray-900 leading-tight">{value}</span>
                <span className="text-xs text-gray-400 mt-0.5 text-center leading-tight">{label}</span>
              </motion.button>
            ))}
          </motion.div>
        </div>

        {/* Row 2: Name + bio */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-3"
        >
          <p className="text-xl font-bold leading-tight" style={{ color: '#163449', fontFamily: "'Fraunces', serif" }}>{profile.name}</p>
          {profile.churchName && (
            <p className="text-sm font-medium mt-0.5" style={{ color: '#2C4055' }}>{profile.churchName}</p>
          )}
          {profile.location && (
            <p className="text-xs mt-0.5" style={{ color: '#8E8E8E' }}>{profile.location}</p>
          )}
          {profile.bio && (
            <p className="text-sm mt-1.5 leading-snug" style={{ color: '#5C6672' }}>{profile.bio}</p>
          )}
        </motion.div>

        {/* Row 3: Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="mt-3"
        >
          {isOwnProfile ? (
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setEditing(true)}
                className="flex-1 bg-gray-100 text-sm font-semibold h-11 rounded-xl"
                style={{ color: '#163449' }}
              >
                Edit Profile
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/search')}
                className="flex-1 bg-gray-100 text-sm font-semibold h-11 rounded-xl"
                style={{ color: '#163449' }}
              >
                Find Believers
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleFollow}
              className="w-full h-11 rounded-xl text-sm font-semibold transition-colors text-white"
              style={{ background: following ? '#F0F0F0' : '#2C4055', color: following ? '#1A1A1A' : '#fff' }}
            >
              {following ? 'Following' : 'Follow'}
            </motion.button>
          )}
        </motion.div>
      </motion.div>

      {/* ── PRAYER STATS ── */}
      {stats && (
        <div className="px-4 mt-4">
          {/* 3 pills */}
          <motion.div
            variants={staggerChildren}
            initial="initial"
            animate="animate"
            className="grid grid-cols-3 gap-2 mb-3"
          >
            {[
              { icon: <Flame size={16} color="#2C4055" strokeWidth={1.8} />, value: stats.streak ?? 0, label: 'Streak' },
              { icon: <Award size={16} color="#2C4055" strokeWidth={1.8} />, value: stats.longestStreak ?? 0, label: 'Best' },
              { icon: <HandHeart size={16} color="#2C4055" strokeWidth={1.8} />, value: stats.totalSessions ?? 0, label: 'Prayers' },
            ].map(({ icon, value, label }) => (
              <motion.div
                key={label}
                variants={fadeUpItem}
                className="bg-gray-50 rounded-2xl p-3 text-center"
              >
                <div className="flex justify-center mb-1">{icon}</div>
                <p className="text-lg font-bold text-gray-900 leading-none">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* 2 stat cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
              <Clock size={18} color="#2C4055" strokeWidth={1.8} />
              <div>
                <p className="text-sm font-bold text-gray-900">{formatDuration(stats.totalPrayerSeconds)}</p>
                <p className="text-xs text-gray-400">Prayer Time</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
              <Users size={18} color="#2C4055" strokeWidth={1.8} />
              <div>
                <p className="text-sm font-bold text-gray-900">{stats.totalPeoplePrayedFor ?? 0}</p>
                <p className="text-xs text-gray-400">Prayed For</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PRAYER WARRIOR ── */}
      <div className="px-4 mt-4">
        <button
          onClick={() => setShowBadgeModal(true)}
          className="w-full flex items-center gap-4 rounded-2xl p-4 text-left"
          style={{ background: profile.prayerWarriorBadge ? 'rgba(44,64,85,0.05)' : '#F9FAFB', border: `1px solid ${profile.prayerWarriorBadge ? 'rgba(44,64,85,0.12)' : '#EFEFEF'}` }}
        >
          {/* Trophy circle */}
          <div
            className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              width: 52, height: 52,
              background: profile.prayerWarriorBadge ? 'rgba(44,64,85,0.1)' : '#f3f4f6',
              border: `2px solid ${profile.prayerWarriorBadge ? 'rgba(44,64,85,0.18)' : '#e5e7eb'}`,
            }}
          >
            <Trophy
              size={24}
              strokeWidth={1.8}
              color={profile.prayerWarriorBadge ? '#2C4055' : '#d1d5db'}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: profile.prayerWarriorBadge ? '#163449' : '#9AA6AD' }}>
              Prayer Warrior
            </p>
            <p className="text-xs mt-0.5" style={{ color: profile.prayerWarriorBadge ? '#5C6672' : '#9AA6AD' }}>
              {profile.prayerWarriorBadge ? 'Level 1 · Seeker' : 'Complete daily quota to unlock'}
            </p>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: profile.prayerWarriorBadge ? '100%' : `${Math.min(((stats?.totalSessions ?? 0) / 10) * 100, 90)}%`,
                  background: profile.prayerWarriorBadge ? '#2C4055' : '#d1d5db',
                }}
              />
            </div>
          </div>
        </button>
      </div>

      {/* ── TABS ── */}
      <div className="mt-4">
        <div className="flex border-b border-gray-100">
          {[
            { key: 'grid', label: 'Posts' },
            { key: 'prayers', label: 'Prayers' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex-1 py-3.5 text-sm transition-colors relative"
              style={{ color: activeTab === key ? '#163449' : '#9AA6AD', fontWeight: activeTab === key ? 600 : 400 }}
            >
              {label}
              {activeTab === key && (
                <motion.div
                  layoutId="tabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: '#2C4055' }}
                />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <PostGrid
                posts={posts}
                currentUserId={isOwnProfile ? me?.id : undefined}
                onPostsChanged={setPosts}
              />
            </motion.div>
          ) : (
            <motion.div
              key="prayers"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="px-4 pt-4 space-y-3"
            >
              {(profile.prayerRequests?.length ?? 0) === 0 ? (
                <div className="text-center py-14 px-8">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(44,64,85,0.08)' }}>
                    <HandHeart size={24} strokeWidth={1.8} color="#2C4055" />
                  </div>
                  <p className="font-semibold" style={{ color: '#163449' }}>{isOwnProfile ? 'No prayer requests yet' : 'No prayer requests'}</p>
                  <p className="text-sm mt-1" style={{ color: '#8E8E8E' }}>
                    {isOwnProfile ? 'Share what’s on your heart and let others pray with you.' : 'This believer hasn’t shared any yet.'}
                  </p>
                  {isOwnProfile && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate('/prayer')}
                      className="mt-5 inline-flex items-center gap-2 px-5 h-11 rounded-xl text-white text-sm font-semibold"
                      style={{ background: '#2C4055' }}
                    >
                      Share a request
                    </motion.button>
                  )}
                </div>
              ) : (
                profile.prayerRequests?.map(r => (
                  <div key={r.id} className="bg-white rounded-2xl p-4 border" style={{ borderColor: r.isAnswered ? '#A7F3D0' : '#EFEFEF' }}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <VisibilityBadge visibility={r.visibility || 'PUBLIC'} />
                          {r.isAnswered && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Answered</span>
                          )}
                          {r.isUrgent && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 uppercase tracking-wide">Urgent</span>
                          )}
                        </div>
                        <p className="font-semibold text-sm" style={{ color: '#163449' }}>{r.title}</p>
                        <p className="text-xs mt-1 line-clamp-2" style={{ color: '#8E8E8E' }}>{r.body}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs" style={{ color: '#9AA6AD' }}>{getTimeAgo(r.createdAt)}</span>
                          {r._count?.sessions != null && (
                            <span className="text-xs" style={{ color: '#9AA6AD' }}>{r._count.sessions} prayed</span>
                          )}
                        </div>
                      </div>
                      {isOwnProfile && (
                        <button
                          onClick={() => setPrayerMenu(r)}
                          aria-label="Request options"
                          className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-gray-100 flex-shrink-0 -mt-1 -mr-1"
                        >
                          <MoreHorizontal size={16} color="#9ca3af" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Follower/Following Modal */}
      {followModal && (
        <FollowListModal
          userId={profileId}
          type={followModal}
          onClose={() => setFollowModal(null)}
          onUserClick={(uid) => { setFollowModal(null); navigate(`/profile/${uid}`); }}
        />
      )}

      {/* Badge Stats Modal */}
      {showBadgeModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end" onClick={() => setShowBadgeModal(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto pb-10 fade-in" onClick={e => e.stopPropagation()}>
            <div className="pt-4 px-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Prayer Warrior Stats</h3>
              <button onClick={() => setShowBadgeModal(false)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="px-4 py-5">
              {/* Badge */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full bg-terracotta-400 flex items-center justify-center shadow-xl mb-2"
                  style={{ boxShadow: '0 0 24px rgba(245,200,66,0.6)' }}>
                  <span className="text-4xl">🏆</span>
                </div>
                <p className="font-extrabold text-terracotta-700 text-lg">Prayer Warrior</p>
                <p className="text-terracotta-500 text-xs">Level 1</p>
                {profile.prayerWarriorEarnedAt && (
                  <p className="text-gray-400 text-xs mt-1">
                    Since {new Date(profile.prayerWarriorEarnedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
              <div className="space-y-3">
                {[
                  { icon: '🙏', label: 'Total People Prayed For', value: profile.totalPeoplesPrayedFor || 0 },
                  { icon: '🔥', label: 'Current Prayer Streak', value: `${stats?.streak || 0} days` },
                  { icon: '🏅', label: 'Longest Streak', value: `${stats?.longestStreak || 0} days` },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{icon}</span>
                      <p className="text-sm text-gray-600">{label}</p>
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prayer ··· menu sheet */}
      {prayerMenu && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end" onClick={() => setPrayerMenu(null)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto pb-8 fade-in" onClick={e => e.stopPropagation()}>
            <div className="px-4 pt-4 pb-3 border-b border-gray-100">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
              <p className="font-bold text-gray-900 text-sm text-center line-clamp-1">{prayerMenu.title}</p>
            </div>
            <div className="px-4 py-2 space-y-1">
              <button onClick={() => { setDeletingPrayer(prayerMenu); setPrayerMenu(null); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold text-red-500 hover:bg-red-50 text-left">
                <span className="text-xl w-7 text-center">🗑️</span> Delete Prayer Request
              </button>
              <button onClick={() => setPrayerMenu(null)} className="w-full text-center py-3.5 text-sm font-semibold text-gray-400">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prayer delete confirm */}
      {deletingPrayer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end" onClick={() => setDeletingPrayer(null)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto pb-8 fade-in" onClick={e => e.stopPropagation()}>
            <div className="px-4 pt-5 pb-4 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🗑️</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Delete Prayer Request?</h3>
              <p className="text-sm text-gray-400 mb-5 px-4">This will permanently remove "{deletingPrayer.title}" and all its prayer history.</p>
              <div className="px-4 space-y-2">
                <button onClick={() => deletePrayer(deletingPrayer)}
                  className="w-full bg-red-500 text-white rounded-2xl py-3.5 font-bold text-sm">
                  Yes, Delete
                </button>
                <button onClick={() => setDeletingPrayer(null)} className="w-full text-gray-500 font-semibold text-sm py-3">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end" onClick={() => setEditing(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto p-6 pb-10 fade-in overflow-y-auto max-h-[90vh]"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-4">Edit Profile</h3>

            {/* Profile Photo Picker */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer"
              onClick={() => profilePhotoRef.current?.click()}>
              <div className="w-12 h-12 rounded-full overflow-hidden bg-faith-100 flex-shrink-0">
                {(previewProfile || profile.profilePhoto)
                  ? <img src={previewProfile || profile.profilePhoto} alt="profile" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-faith-600 font-bold text-lg">
                      {profile.name?.[0]?.toUpperCase()}
                    </div>
                }
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Profile Photo</p>
                <p className="text-xs text-faith-600">{previewProfile ? 'Photo selected ✓' : 'Tap to change'}</p>
              </div>
            </div>

            <input ref={profilePhotoRef} type="file" accept="image/*" className="hidden"
              onChange={e => setPreviewProfile(URL.createObjectURL(e.target.files[0]))} />

            <div className="space-y-3">
              {[
                { field: 'name', placeholder: 'Full name' },
                { field: 'churchName', placeholder: 'Church name' },
                { field: 'location', placeholder: 'Location' },
              ].map(({ field, placeholder }) => (
                <input key={field}
                  value={editForm[field] || ''}
                  onChange={e => setEditForm(p => ({ ...p, [field]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500"
                />
              ))}
              <textarea
                value={editForm.bio || ''}
                onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))}
                placeholder="Bio"
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500 resize-none"
              />
              {/* Gender selector */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Gender</p>
                <div className="flex gap-2">
                  {['male', 'female'].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setEditForm(p => ({ ...p, gender: g }))}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors capitalize"
                      style={editForm.gender === g
                        ? { background: '#111827', color: 'white', borderColor: '#111827' }
                        : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditing(false)}
                  className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 text-sm font-medium">
                  Cancel
                </button>
                <WaterButton variant="primary" onClick={handleSave} disabled={saving} className="flex-1 py-3 text-sm font-bold">
                  {saving ? 'Saving...' : 'Save Changes'}
                </WaterButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

