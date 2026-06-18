import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
      <div className="relative h-36 bg-gradient-to-br from-faith-700 to-faith-500">
        {profile.coverPhoto && (
          <img src={profile.coverPhoto} alt="cover" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/20" />

        {/* Profile photo floating */}
        <div className="absolute -bottom-12 left-4">
          <div className="relative">
            <Avatar user={profile} size="xl" />
            {isOwnProfile && editing && (
              <button onClick={() => profilePhotoRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center text-white text-xs">
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Action button top right */}
        <div className="absolute top-3 right-3">
          {isOwnProfile ? (
            <button onClick={() => setEditing(true)}
              className="bg-white/20 backdrop-blur text-white text-sm px-4 py-1.5 rounded-full font-medium border border-white/40">
              Edit Profile
            </button>
          ) : (
            <button onClick={handleFollow}
              className={`text-sm px-5 py-1.5 rounded-full font-bold shadow ${following
                ? 'bg-white/20 backdrop-blur text-white border border-white/40'
                : 'bg-white text-faith-700'}`}>
              {following ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="mt-14 px-4 mb-4">
        <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
        {profile.churchName && <p className="text-faith-600 text-sm mt-0.5">⛪ {profile.churchName}</p>}
        {profile.location && <p className="text-gray-400 text-sm">📍 {profile.location}</p>}
        {profile.bio && <p className="text-gray-600 text-sm mt-2 leading-relaxed">{profile.bio}</p>}

        {/* Counts */}
        <div className="flex gap-5 mt-3">
          <button onClick={() => setFollowModal('followers')} className="text-center">
            <p className="text-lg font-bold text-gray-900">{profile._count?.followers || 0}</p>
            <p className="text-xs text-gray-400">Believers</p>
          </button>
          <button onClick={() => setFollowModal('following')} className="text-center">
            <p className="text-lg font-bold text-gray-900">{profile._count?.following || 0}</p>
            <p className="text-xs text-gray-400">Following</p>
          </button>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{profile._count?.posts || 0}</p>
            <p className="text-xs text-gray-400">Posts</p>
          </div>
        </div>
      </div>

      {/* Prayer Stats */}
      {stats && (
        <div className="px-4 mb-4">
          <div className="grid grid-cols-4 gap-2">
            <StatCard icon="🙏" label="Prayed For" value={stats.totalPeoplePrayedFor} />
            <StatCard icon="⏱️" label="Hours" value={formatDuration(stats.totalPrayerSeconds)} />
            <StatCard icon="📊" label="Avg" value={formatDuration(stats.avgSessionSeconds)} />
            <StatCard icon="🔥" label={`${stats.streak}d`} value="Streak" small />
          </div>
          {isOwnProfile && (
            <div className="mt-2 bg-gradient-to-r from-faith-600 to-faith-500 rounded-2xl p-3 flex items-center justify-between text-white">
              <div>
                <p className="text-xs text-white/70">Today's prayer time</p>
                <p className="text-2xl font-bold">{formatDuration(stats.todaySeconds)}</p>
              </div>
              <span className="text-4xl">🌟</span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="px-4">
        <div className="flex border-b border-gray-200 mb-3">
          {[
            { key: 'grid', label: '⊞ Posts' },
            { key: 'prayers', label: '🙏 Prayers' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
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
                {previewCover || profile.coverPhoto ? 'Change Cover Photo' : '+ Add Cover Photo'}
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

function StatCard({ icon, label, value, small }) {
  return (
    <div className="bg-white rounded-xl p-2 border border-gray-100 shadow-sm text-center">
      <span className={small ? 'text-xl' : 'text-2xl'}>{icon}</span>
      <p className="text-sm font-bold text-gray-900 mt-0.5">{small ? label : value}</p>
      <p className="text-[10px] text-gray-400">{small ? value : label}</p>
    </div>
  );
}
