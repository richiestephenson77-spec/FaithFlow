import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';
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

  const profilePhotoRef = useRef();
  const coverPhotoRef = useRef();
  const [previewProfile, setPreviewProfile] = useState(null);
  const [previewCover, setPreviewCover] = useState(null);

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
      if (coverPhotoRef.current?.files[0]) formData.append('coverPhoto', coverPhotoRef.current.files[0]);

      const res = await api.put('/users/me', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(p => ({ ...p, ...res.data }));
      updateUser(res.data);
      setEditing(false);
      setPreviewProfile(null);
      setPreviewCover(null);
    } catch {}
    setSaving(false);
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  if (!profile) return <div className="p-8 text-center text-gray-400">Profile not found</div>;

  const { stats } = profile;

  return (
    <div className="pb-4">
      {/* Cover Photo */}
      <div className="relative h-40 bg-gradient-to-br from-faith-700 to-faith-500 overflow-hidden">
        {profile.coverPhoto && !profile.coverPhoto.includes('cover') && (
          <img src={profile.coverPhoto} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/10" />

        {/* Profile photo floating */}
        <div className="absolute -bottom-12 left-4">
          <div className="relative">
            <div className="ring-4 ring-white rounded-full shadow-lg">
              <Avatar user={profile} size="xl" />
            </div>
          </div>
        </div>

        {/* Action buttons top right */}
        <div className="absolute top-3 right-3 flex gap-2">
          {isOwnProfile ? (
            <>
              <button onClick={() => setEditing(true)}
                className="bg-black/30 backdrop-blur-sm text-white text-xs px-4 py-1.5 rounded-full font-semibold border border-white/30">
                Edit Profile
              </button>
              <Link to="/settings"
                className="bg-black/30 backdrop-blur-sm text-white w-8 h-8 rounded-full flex items-center justify-center border border-white/30">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </Link>
            </>
          ) : (
            <button onClick={handleFollow}
              className={`text-xs px-5 py-2 rounded-full font-bold shadow-lg ${following
                ? 'bg-white/20 backdrop-blur-sm text-white border border-white/40'
                : 'bg-white text-faith-700'}`}>
              {following ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="mt-14 px-4 mb-4">
        <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
        {profile.churchName && (
          <p className="text-faith-600 text-sm mt-0.5 font-medium">{profile.churchName}</p>
        )}
        {profile.location && (
          <p className="text-gray-400 text-xs mt-0.5">{profile.location}</p>
        )}
        {profile.bio && (
          <p className="text-gray-600 text-sm mt-2 leading-relaxed">{profile.bio}</p>
        )}

        {/* Counts */}
        <div className="flex gap-6 mt-4">
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

      {/* Prayer Stats */}
      {stats && (
        <div className="px-4 mb-4">
          <div className="grid grid-cols-4 gap-2">
            <StatCard icon="🙏" label="Prayed" value={stats.totalPeoplePrayedFor} />
            <StatCard icon="⏱️" label="Hours" value={formatDuration(stats.totalPrayerSeconds)} />
            <StatCard icon="📊" label="Avg" value={formatDuration(stats.avgSessionSeconds)} />
            <StatCard icon="🔥" label="Streak" value={`${stats.streak}d`} />
          </div>
          {isOwnProfile && (
            <div className="mt-2 prayer-gradient rounded-2xl p-4 flex items-center justify-between text-white shadow-sm">
              <div>
                <p className="text-xs text-white/70">Today's prayer time</p>
                <p className="text-2xl font-bold mt-0.5">{formatDuration(stats.todaySeconds)}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">🌟</div>
            </div>
          )}
        </div>
      )}

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

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end" onClick={() => setEditing(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto p-6 pb-10 fade-in overflow-y-auto max-h-[90vh]"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-4">Edit Profile</h3>

            {/* Cover Photo Preview */}
            <div className="relative h-24 rounded-xl mb-4 overflow-hidden bg-gray-100 cursor-pointer"
              onClick={() => coverPhotoRef.current?.click()}>
              {(previewCover || profile.coverPhoto) && (
                <img src={previewCover || profile.coverPhoto} alt="cover" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-sm font-medium">
                {previewCover || profile.coverPhoto ? '📷 Change Cover Photo' : '📷 Add Cover Photo'}
              </div>
            </div>

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

            <input ref={coverPhotoRef} type="file" accept="image/*" className="hidden"
              onChange={e => setPreviewCover(URL.createObjectURL(e.target.files[0]))} />
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

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm text-center">
      <span className="text-xl">{icon}</span>
      <p className="text-sm font-bold text-gray-900 mt-0.5 leading-tight">{value}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
