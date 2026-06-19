import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HandHeart, Clock, Users, Globe, Lock, Shield, MoreHorizontal, Trophy, Flame, Award } from 'lucide-react';
import api from '../utils/api';
import { track } from '../utils/analytics';
import { useAuth } from '../contexts/AuthContext';
import PostGrid from '../components/PostGrid';
import FollowListModal from '../components/FollowListModal';

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
    } catch {}
  }

  async function deletePrayer(prayer) {
    try {
      await api.delete(`/prayers/${prayer.id}`);
      setProfile(p => ({ ...p, prayerRequests: p.prayerRequests.filter(r => r.id !== prayer.id) }));
    } catch {}
    setDeletingPrayer(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(editForm).forEach(([k, v]) => formData.append(k, v));
      if (profilePhotoRef.current?.files[0]) formData.append('profilePhoto', profilePhotoRef.current.files[0]);

      const res = await api.put('/users/me', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(p => ({ ...p, ...res.data }));
      updateUser(res.data);
      setEditing(false);
      setPreviewProfile(null);
    } catch {}
    setSaving(false);
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  if (!profile) return <div className="p-8 text-center text-gray-400">Profile not found</div>;

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
              style={{ background: 'linear-gradient(135deg, #f59e0b, #a855f7)' }}
            >
              <div className="w-[80px] h-[80px] rounded-full overflow-hidden bg-gray-100 ring-2 ring-white">
                {(previewProfile || profile.profilePhoto)
                  ? <img src={previewProfile || profile.profilePhoto} alt="profile" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center bg-amber-50 text-amber-600 font-bold text-2xl">
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
          <p className="text-base font-bold text-gray-900">{profile.name}</p>
          {profile.churchName && (
            <p className="text-sm text-amber-500 font-medium mt-0.5">{profile.churchName}</p>
          )}
          {profile.location && (
            <p className="text-xs text-gray-400 mt-0.5">{profile.location}</p>
          )}
          {profile.bio && (
            <p className="text-sm text-gray-600 mt-1.5 leading-snug">{profile.bio}</p>
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
              <button
                onClick={() => setEditing(true)}
                className="flex-1 bg-gray-100 text-gray-900 text-sm font-medium py-2 rounded-xl"
              >
                Edit Profile
              </button>
              <button
                onClick={() => navigate('/search')}
                className="flex-1 bg-gray-100 text-gray-900 text-sm font-medium py-2 rounded-xl"
              >
                Find Believers
              </button>
            </div>
          ) : (
            <button
              onClick={handleFollow}
              className={`w-full py-2 rounded-xl text-sm font-semibold transition-colors ${
                following ? 'bg-gray-100 text-gray-700' : 'bg-amber-400 text-white'
              }`}
            >
              {following ? 'Following' : 'Follow'}
            </button>
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
              { icon: <Flame size={16} color="#f59e0b" strokeWidth={1.8} />, value: stats.streak ?? 0, label: 'Streak' },
              { icon: <Award size={16} color="#f59e0b" strokeWidth={1.8} />, value: stats.longestStreak ?? 0, label: 'Best' },
              { icon: <HandHeart size={16} color="#f59e0b" strokeWidth={1.8} />, value: stats.totalSessions ?? 0, label: 'Prayers' },
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
              <Clock size={18} color="#f59e0b" strokeWidth={1.8} />
              <div>
                <p className="text-sm font-bold text-gray-900">{formatDuration(stats.totalPrayerSeconds)}</p>
                <p className="text-xs text-gray-400">Prayer Time</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
              <Users size={18} color="#f59e0b" strokeWidth={1.8} />
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
          style={{
            background: profile.prayerWarriorBadge
              ? 'linear-gradient(135deg, #fffbeb, #fef3c7)'
              : '#F9FAFB',
            border: `1px solid ${profile.prayerWarriorBadge ? '#fde68a' : '#e5e7eb'}`,
          }}
        >
          {/* Trophy circle */}
          <div
            className="w-13 h-13 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              width: 52, height: 52,
              background: profile.prayerWarriorBadge ? '#fffbeb' : '#f3f4f6',
              border: `2px solid ${profile.prayerWarriorBadge ? '#fcd34d' : '#e5e7eb'}`,
            }}
          >
            <Trophy
              size={24}
              strokeWidth={1.8}
              color={profile.prayerWarriorBadge ? '#f59e0b' : '#d1d5db'}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${profile.prayerWarriorBadge ? 'text-amber-800' : 'text-gray-400'}`}>
              Prayer Warrior
            </p>
            <p className={`text-xs mt-0.5 ${profile.prayerWarriorBadge ? 'text-amber-600' : 'text-gray-400'}`}>
              {profile.prayerWarriorBadge ? 'Level 1 · Seeker' : 'Complete daily quota to unlock'}
            </p>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: profile.prayerWarriorBadge ? '100%' : `${Math.min(((stats?.totalSessions ?? 0) / 10) * 100, 90)}%`,
                  background: profile.prayerWarriorBadge ? '#f59e0b' : '#d1d5db',
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
              className={`flex-1 py-3 text-sm transition-colors relative ${
                activeTab === key ? 'font-semibold text-gray-900' : 'text-gray-400'
              }`}
            >
              {label}
              {activeTab === key && (
                <motion.div
                  layoutId="tabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"
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
              <PostGrid posts={posts} onPostClick={() => {}} />
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
                <p className="text-center text-gray-400 py-8 text-sm">No prayer requests yet</p>
              ) : (
                profile.prayerRequests?.map(r => (
                  <div key={r.id} className={`bg-white rounded-2xl p-4 border shadow-sm ${r.isAnswered ? 'border-emerald-100' : 'border-gray-100'}`}>
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
                        <p className="font-semibold text-gray-800 text-sm">{r.title}</p>
                        <p className="text-gray-400 text-xs mt-1 line-clamp-2">{r.body}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-400">{getTimeAgo(r.createdAt)}</span>
                          {r._count?.sessions != null && (
                            <span className="text-xs text-gray-400">{r._count.sessions} prayed</span>
                          )}
                        </div>
                      </div>
                      {isOwnProfile && (
                        <button
                          onClick={() => setPrayerMenu(r)}
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 flex-shrink-0 -mt-1"
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
                <div className="w-20 h-20 rounded-full bg-amber-400 flex items-center justify-center shadow-xl mb-2"
                  style={{ boxShadow: '0 0 24px rgba(245,200,66,0.6)' }}>
                  <span className="text-4xl">🏆</span>
                </div>
                <p className="font-extrabold text-amber-700 text-lg">Prayer Warrior</p>
                <p className="text-amber-500 text-xs">Level 1</p>
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
              <div className="flex gap-3">
                <button onClick={() => setEditing(false)}
                  className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 text-sm font-medium">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 prayer-gradient text-white rounded-xl py-3 text-sm font-bold disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

