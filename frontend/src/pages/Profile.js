import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { HandHeart, Clock, Users } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import PostGrid from '../components/PostGrid';
import FollowListModal from '../components/FollowListModal';

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
      setFollowing(res.data.following);
      setProfile(p => ({
        ...p,
        _count: { ...p._count, followers: p._count.followers + (res.data.following ? 1 : -1) },
      }));
    } catch {}
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

  return (
    <div className="pb-4 bg-gray-50 min-h-full">
      {/* Profile Header — white card */}
      <div className="bg-white border-b border-gray-100 px-4 pt-5 pb-5">
        {/* Top row: photo + name block + action buttons */}
        <div className="flex items-start gap-4">
          {/* Profile photo — tappable on own profile */}
          <button
            onClick={isOwnProfile ? () => profilePhotoRef.current?.click() : undefined}
            className="relative flex-shrink-0 group"
          >
            <div className="w-[70px] h-[70px] rounded-full overflow-hidden ring-2 ring-gray-100 shadow-sm">
              {(previewProfile || profile.profilePhoto)
                ? <img src={previewProfile || profile.profilePhoto} alt="profile" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center bg-faith-100 text-faith-600 font-bold text-2xl">
                    {profile.name?.[0]?.toUpperCase()}
                  </div>
              }
            </div>
            {isOwnProfile && (
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-faith-600 rounded-full flex items-center justify-center shadow">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            )}
          </button>

          {/* Name + church + location */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold text-gray-900 leading-tight">{profile.name}</h2>
            {profile.churchName && (
              <p className="text-faith-600 text-sm mt-0.5 font-medium">{profile.churchName}</p>
            )}
            {profile.location && (
              <p className="text-gray-400 text-xs mt-0.5">{profile.location}</p>
            )}
            {profile.bio && (
              <p className="text-gray-500 text-xs mt-1.5 leading-snug line-clamp-2">{profile.bio}</p>
            )}
          </div>

          {/* Action buttons — top-right */}
          <div className="flex-shrink-0 flex gap-2 mt-0.5">
            {isOwnProfile ? (
              <>
                <button onClick={() => setEditing(true)}
                  className="border border-gray-200 text-gray-700 text-xs px-3 py-1.5 rounded-full font-semibold bg-white">
                  Edit Profile
                </button>
                <Link to="/settings"
                  className="border border-gray-200 text-gray-500 w-7 h-7 rounded-full flex items-center justify-center bg-white">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </Link>
              </>
            ) : (
              <button onClick={handleFollow}
                className={`text-sm px-5 py-2 rounded-full font-bold shadow-sm ${following
                  ? 'bg-gray-100 text-gray-600 border border-gray-200'
                  : 'bg-amber-400 text-white'}`}>
                {following ? 'Following ✓' : 'Follow 🙏'}
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-8 mt-4 pt-4 border-t border-gray-50">
          <button onClick={() => setFollowModal('followers')} className="text-center">
            <p className="text-lg font-bold text-gray-900 leading-tight">{profile._count?.followers || 0}</p>
            <p className="text-xs text-gray-400">Believers</p>
          </button>
          <button onClick={() => setFollowModal('following')} className="text-center">
            <p className="text-lg font-bold text-gray-900 leading-tight">{profile._count?.following || 0}</p>
            <p className="text-xs text-gray-400">Following</p>
          </button>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 leading-tight">{profile._count?.posts || 0}</p>
            <p className="text-xs text-gray-400">Posts</p>
          </div>
        </div>
      </div>

      {/* Find Believers button — own profile only */}
      {isOwnProfile && (
        <div className="px-4 mt-3 mb-1">
          <button onClick={() => navigate('/search')}
            className="w-full border border-gray-200 text-gray-600 rounded-2xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 bg-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Find Believers
          </button>
        </div>
      )}

      {/* Prayer Stats */}
      {stats && (
        <div className="px-4 mt-4 mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Prayer Statistics</p>

          {/* Streak highlight card */}
          <div className="prayer-gradient rounded-2xl p-4 mb-3 flex items-center justify-between text-white shadow-sm">
            <div>
              <p className="text-xs text-white/70 mb-1">🔥 Current Streak</p>
              <p className="text-3xl font-extrabold leading-none">{stats.streak || 0}
                <span className="text-base font-semibold ml-1">days</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/70 mb-1">🏆 Longest Streak</p>
              <p className="text-3xl font-extrabold leading-none">{stats.longestStreak || 0}
                <span className="text-base font-semibold ml-1">days</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatCard Icon={HandHeart} iconColor="#f59e0b" label="Total Prayers" value={stats.totalSessions || stats.totalPeoplePrayedFor || 0} />
            <StatCard Icon={Clock} iconColor="#3b82f6" label="Prayer Time" value={formatDuration(stats.totalPrayerSeconds)} />
            <StatCard Icon={Users} iconColor="#a855f7" label="Prayed For" value={stats.totalPeoplePrayedFor} />
          </div>

          {isOwnProfile && stats.todaySeconds > 0 && (
            <div className="mt-2 bg-amber-50 border border-amber-100 rounded-2xl p-3 flex items-center gap-3">
              <span className="text-xl">🌟</span>
              <div>
                <p className="text-xs text-amber-700 font-semibold">Today's prayer time</p>
                <p className="text-sm font-bold text-amber-900">{formatDuration(stats.todaySeconds)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Prayer Warrior Badge */}
      <div className="px-4 mb-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Prayer Warrior</p>
        {profile.prayerWarriorBadge ? (
          <button onClick={() => setShowBadgeModal(true)}
            className="w-full flex items-center gap-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-4 text-left"
            style={{ boxShadow: '0 0 16px rgba(245,200,66,0.25)' }}>
            <div className="w-14 h-14 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0 shadow-md"
              style={{ boxShadow: '0 0 12px rgba(245,200,66,0.5)' }}>
              <span className="text-2xl">🏆</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-amber-800 text-sm">Prayer Warrior</p>
              <p className="text-amber-600 text-xs mt-0.5">Level 1 · Tap to view stats</p>
              {profile.totalPeoplesPrayedFor > 0 && (
                <p className="text-amber-500 text-xs mt-1">Prayed for {profile.totalPeoplesPrayedFor} people</p>
              )}
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        ) : (
          <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl grayscale opacity-50">🏆</span>
            </div>
            <div>
              <p className="font-semibold text-gray-500 text-sm">Prayer Warrior</p>
              <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">Complete your first daily quota to earn this badge</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-4">
        <div className="flex border-b border-gray-100 mb-3">
          {[
            { key: 'grid', label: 'Posts' },
            { key: 'prayers', label: 'Prayers' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === key ? 'border-faith-600 text-faith-600' : 'border-transparent text-gray-400'}`}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'grid' && (
          <PostGrid posts={posts} onPostClick={(p) => {}} />
        )}

        {activeTab === 'prayers' && (
          <div className="space-y-3">
            {profile.prayerRequests?.length === 0 ? (
              <p className="text-center text-gray-400 py-6">No prayer requests yet</p>
            ) : (
              profile.prayerRequests?.map(r => (
                <div key={r.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <p className="font-semibold text-gray-800 text-sm">{r.title}</p>
                  <p className="text-gray-500 text-sm mt-1 line-clamp-2">{r.body}</p>
                </div>
              ))
            )}
          </div>
        )}
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

function StatCard({ Icon, iconColor, label, value }) {
  return (
    <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm text-center">
      <div className="flex justify-center mb-1">
        <Icon size={20} strokeWidth={1.5} color={iconColor} />
      </div>
      <p className="text-sm font-bold text-gray-900 leading-tight">{value}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
