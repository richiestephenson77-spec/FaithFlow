import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, MoreHorizontal, ChevronLeft } from 'lucide-react';
import api from '../utils/api';
import { WaterButton } from '../components/water';
import { track } from '../utils/analytics';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import FollowListModal from '../components/FollowListModal';
import ReportSheet from '../components/ReportSheet';
import ProfileHeader, { INK, MUTED, HAIRLINE, ACCENT } from '../components/profile/ProfileHeader';
import PrivatePrayerJourney from '../components/profile/PrivatePrayerJourney';
import ProfilePostFeed from '../components/profile/ProfilePostFeed';
import ProfilePrayerList from '../components/profile/ProfilePrayerList';

// Profile / You.
//
// Shape follows the approved hierarchy: compact top bar, identity, bio, one
// quiet count line, compact actions, an owner-only collapsed prayer journey,
// then Posts | Prayers. The five stat tiles and the trophy banner are gone
// from the initial view — every number they showed is still available, inside
// the journey.
//
// The bottom navigation is the app's existing shared island, rendered by
// Layout because /profile is a main tab. Nothing here draws a second one, and
// nothing here adds bottom padding: Layout applies --fs-nav-reserve, which is
// the single source of truth for clearing the island.
//
// No fixed page height anywhere. Long names, long bios and large-text settings
// all grow the page naturally.

// Tab and scroll survive a trip into a post or a request and back.
const VIEW_STATE = { tab: 'posts', scrollTop: 0 };

export default function Profile() {
  const { id } = useParams();
  const { user: me, updateUser } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();

  const profileId = id || me?.id;
  const scrollerRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState(VIEW_STATE.tab);

  const [following, setFollowing] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [followModal, setFollowModal] = useState(null);   // 'followers' | 'following'

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const profilePhotoRef = useRef();
  const [previewProfile, setPreviewProfile] = useState(null);
  // Absence means visible, matching the server's default.
  const [visibility, setVisibility] = useState({ showChurch: true, showLocation: true });
  const [savingVisibility, setSavingVisibility] = useState(false);

  const [modMenu, setModMenu] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState(false);

  const [prayerMenu, setPrayerMenu] = useState(null);
  const [deletingPrayer, setDeletingPrayer] = useState(null);

  // The server decides this and tells us. The client never infers ownership in
  // order to decide what to show, because the private data simply is not in a
  // visitor's response at all.
  const isOwner = profile ? profile.isOwner === true : (!id || id === me?.id);

  async function load() {
    setLoadError('');
    try {
      const [profileRes, postsRes] = await Promise.all([
        api.get(`/users/${profileId}`),
        api.get(`/posts/user/${profileId}`),
      ]);
      setProfile(profileRes.data);
      setPosts(postsRes.data || []);
      setFollowing(!!profileRes.data.isFollowing);
      if (profileRes.data.profileVisibility) setVisibility(profileRes.data.profileVisibility);
      setEditForm({
        name: profileRes.data.name || '',
        bio: profileRes.data.bio || '',
        churchName: profileRes.data.churchName || '',
        location: profileRes.data.location || '',
        gender: profileRes.data.gender || '',
      });
    } catch (err) {
      setLoadError(err.friendlyMessage || err.response?.data?.error || 'Could not load this profile');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (profileId) load();
    // eslint-disable-next-line
  }, [profileId]);

  useEffect(() => { VIEW_STATE.tab = activeTab; }, [activeTab]);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (VIEW_STATE.scrollTop) el.scrollTop = VIEW_STATE.scrollTop;
    const onScroll = () => { VIEW_STATE.scrollTop = el.scrollTop; };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [loading]);

  async function reloadProfile() {
    try { const res = await api.get(`/users/${profileId}`); setProfile(res.data); } catch {}
  }

  async function handleFollow() {
    // Optimistic, but rolled back on failure — never a fake success state.
    const previous = following;
    setFollowing(!previous);
    setProfile(p => ({
      ...p,
      _count: { ...p._count, followers: (p._count?.followers ?? 0) + (previous ? -1 : 1) },
    }));
    try {
      const res = await api.post(`/users/${profileId}/follow`);
      if (res.data.following) track('user_followed', { followedUserId: profileId });
      setFollowing(res.data.following);
      showToast(res.data.following ? `Following ${profile?.name?.split(' ')[0] || ''}`.trim() : 'Unfollowed');
    } catch (err) {
      setFollowing(previous);
      setProfile(p => ({
        ...p,
        _count: { ...p._count, followers: (p._count?.followers ?? 0) + (previous ? 1 : -1) },
      }));
      showToast(err.friendlyMessage || 'Could not update follow', 'error');
    }
  }

  async function handleMessage() {
    if (messaging) return;
    setMessaging(true);
    try {
      const res = await api.post('/messages/conversations', { userId: profileId });
      navigate(`/messages/${res.data.id}`);
    } catch (err) {
      showToast(err.friendlyMessage || err.response?.data?.error || 'Could not open chat', 'error');
      setMessaging(false);
    }
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

  async function deletePrayer(prayer) {
    try {
      await api.delete(`/prayers/${prayer.id}`);
      setProfile(p => ({
        ...p,
        prayerRequests: (p.prayerRequests || []).filter(r => r.id !== prayer.id),
        _count: { ...p._count, prayerRequests: Math.max(0, (p._count?.prayerRequests ?? 1) - 1) },
      }));
      showToast('Prayer request deleted');
    } catch (err) {
      showToast(err.friendlyMessage || 'Could not delete request', 'error');
    }
    setDeletingPrayer(null);
  }

  async function toggleVisibility(key) {
    const next = { ...visibility, [key]: !visibility[key] };
    setVisibility(next);                       // optimistic
    setSavingVisibility(true);
    try {
      const res = await api.patch('/users/me/profile-visibility', { [key]: next[key] });
      setVisibility(v => ({ ...v, ...res.data }));
    } catch (err) {
      setVisibility(visibility);               // rollback: never show a saved state that isn't
      showToast(err.friendlyMessage || 'Could not update visibility', 'error');
    } finally {
      setSavingVisibility(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const formData = new FormData();
      // Only these five fields are ever submitted. The server updates the
      // authenticated user and nothing else, so there is no field a crafted
      // form could reach that isn't listed here.
      ['name', 'bio', 'churchName', 'location', 'gender'].forEach(k => {
        if (editForm[k] !== undefined && editForm[k] !== '') formData.append(k, editForm[k]);
      });
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

  // ---- states ------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-full" style={{ background: '#FFFFFF' }}>
        <TopBar isOwner={!id} onBack={() => navigate(-1)} />
        <div style={{ padding: '4px 20px' }} className="animate-pulse">
          <div className="flex items-center gap-4">
            <div style={{ width: 76, height: 76, borderRadius: 999, background: '#F0F0F0' }} />
            <div className="flex-1 space-y-2">
              <div style={{ height: 18, width: '60%', borderRadius: 99, background: '#F0F0F0' }} />
              <div style={{ height: 12, width: '40%', borderRadius: 99, background: '#F0F0F0' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="min-h-full" style={{ background: '#FFFFFF' }}>
        <TopBar isOwner={!id} onBack={() => navigate(-1)} />
        <div className="text-center" style={{ padding: '56px 28px' }}>
          <p className="type-heading" style={{ fontSize: 18 }}>{loadError || 'Profile not found'}</p>
          <button
            onClick={() => { setLoading(true); load(); }}
            style={{ marginTop: 18, minHeight: 44, padding: '11px 18px', borderRadius: 10, border: `1px solid ${HAIRLINE}`, background: '#fff', color: ACCENT, fontSize: 14 }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // A block in either direction: neutral, with Unblock only for the blocker.
  if (profile.unavailable) {
    return (
      <div className="min-h-full" style={{ background: '#FFFFFF' }}>
        <TopBar isOwner={false} onBack={() => navigate(-1)} />
        <div className="text-center" style={{ padding: '56px 28px' }}>
          <p className="type-heading" style={{ fontSize: 18 }}>This profile isn't available</p>
          {profile.isBlockedByMe && (
            <>
              <p className="type-subtitle" style={{ fontSize: 13.5, marginTop: 6 }}>
                You blocked {profile.name || 'this person'}.
              </p>
              <button
                onClick={handleUnblock}
                style={{ marginTop: 18, minHeight: 44, padding: '11px 18px', borderRadius: 10, border: `1px solid ${HAIRLINE}`, background: '#fff', color: ACCENT, fontSize: 14 }}
              >
                Unblock
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const requests = profile.prayerRequests || [];
  const postCount = profile._count?.posts ?? posts.length;
  const requestCount = profile._count?.prayerRequests ?? requests.length;

  return (
    <div ref={scrollerRef} className="min-h-full" style={{ background: '#FFFFFF', color: INK }}>
      <TopBar
        isOwner={isOwner}
        onBack={() => navigate(-1)}
        onSettings={() => navigate('/settings')}
        onMore={() => setModMenu(true)}
      />

      <ProfileHeader
        profile={profile}
        isOwner={isOwner}
        onOpenBelievers={() => setFollowModal('followers')}
        onAvatarClick={() => setEditing(true)}
      />

      {/* Compact actions */}
      <div className="flex gap-2" style={{ padding: '14px 20px 0' }}>
        {isOwner ? (
          <button
            onClick={() => setEditing(true)}
            style={{ flex: 1, minHeight: 44, borderRadius: 10, border: `1px solid ${HAIRLINE}`, background: '#FFFFFF', color: INK, fontSize: 14, fontWeight: 500 }}
          >
            Edit profile
          </button>
        ) : (
          <>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleFollow}
              style={{
                flex: 1, minHeight: 44, borderRadius: 10, fontSize: 14, fontWeight: 500,
                border: following ? `1px solid ${HAIRLINE}` : 0,
                background: following ? '#FFFFFF' : ACCENT,
                color: following ? INK : '#FFFFFF',
              }}
            >
              {following ? 'Following' : 'Follow'}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleMessage}
              disabled={messaging}
              style={{
                flex: 1, minHeight: 44, borderRadius: 10, fontSize: 14, fontWeight: 500,
                border: `1px solid ${HAIRLINE}`, background: '#FFFFFF', color: INK,
                opacity: messaging ? 0.6 : 1,
              }}
            >
              {messaging ? 'Opening…' : 'Message'}
            </motion.button>
          </>
        )}
      </div>

      {/* Owner-only, collapsed. Renders nothing at all without `stats`, which
          a visitor's response does not contain. */}
      {isOwner && <PrivatePrayerJourney stats={profile.stats} profile={profile} />}

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Profile content"
        className="flex"
        style={{ borderBottom: `1px solid ${HAIRLINE}`, marginTop: 20, padding: '0 20px' }}
      >
        {[
          { id: 'posts', label: 'Posts', count: postCount },
          { id: 'prayers', label: 'Prayers', count: requestCount },
        ].map(t => (
          <button
            key={t.id}
            role="tab"
            id={`profile-tab-${t.id}`}
            aria-selected={activeTab === t.id}
            aria-controls={`profile-panel-${t.id}`}
            onClick={() => setActiveTab(t.id)}
            style={{
              flex: 1, minHeight: 46, fontSize: 13.5, background: 'none', border: 0,
              color: activeTab === t.id ? INK : MUTED,
              fontWeight: activeTab === t.id ? 600 : 400,
              // Set after `border: 0` so the reset cannot clear the indicator.
              borderBottom: `2px solid ${activeTab === t.id ? ACCENT : 'transparent'}`,
            }}
          >
            {t.label}{t.count ? ` · ${t.count}` : ''}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`profile-panel-${activeTab}`} aria-labelledby={`profile-tab-${activeTab}`}>
        {activeTab === 'posts' ? (
          <ProfilePostFeed
            posts={posts}
            isOwner={isOwner}
            onPostsChanged={setPosts}
            onCreate={() => window.dispatchEvent(new CustomEvent('open_create_post'))}
          />
        ) : (
          <ProfilePrayerList
            requests={requests}
            isOwner={isOwner}
            onOpen={r => navigate(`/prayer/${r.id}`)}
            onOptions={r => setPrayerMenu(r)}
            onCreate={() => navigate('/prayer')}
          />
        )}
      </div>

      {/* ---- modals, all preserved ---- */}

      {followModal && (
        <FollowListModal
          userId={profileId}
          type={followModal}
          onClose={() => setFollowModal(null)}
          onUserClick={(uid) => { setFollowModal(null); navigate(`/profile/${uid}`); }}
          onFindBelievers={isOwner ? () => { setFollowModal(null); navigate('/search'); } : undefined}
        />
      )}

      {modMenu && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={() => setModMenu(false)}>
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { setModMenu(false); setReportOpen(true); }} className="w-full text-left px-4 py-3.5 text-sm font-medium rounded-xl" style={{ color: '#1A1A1A' }}>Report</button>
            {profile.isBlockedByMe
              ? <button onClick={handleUnblock} className="w-full text-left px-4 py-3.5 text-sm font-medium rounded-xl" style={{ color: INK }}>Unblock user</button>
              : <button onClick={() => { setModMenu(false); setBlockConfirm(true); }} className="w-full text-left px-4 py-3.5 text-sm font-medium rounded-xl" style={{ color: '#C0392B' }}>Block user</button>}
            <button onClick={() => setModMenu(false)} className="w-full text-center px-4 py-3.5 text-sm font-semibold rounded-xl mt-1" style={{ color: MUTED }}>Cancel</button>
          </div>
        </div>
      )}

      {reportOpen && (
        <ReportSheet contentType="PROFILE" contentId={profileId} reportedUserId={profileId} onClose={() => setReportOpen(false)} />
      )}

      {blockConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center px-8" onClick={() => setBlockConfirm(false)}>
          <div className="bg-white rounded-3xl w-full max-w-xs p-5 text-center" onClick={e => e.stopPropagation()}>
            <p className="font-bold text-[15px]" style={{ color: INK }}>Block {profile.name || 'this user'}?</p>
            <p className="text-sm mt-2 leading-snug" style={{ color: '#6B7680' }}>They won't be able to message you or see your content, and you won't see theirs.</p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setBlockConfirm(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: '#F0F0F0', color: '#1A1A1A' }}>Cancel</button>
              <button onClick={handleBlock} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white" style={{ background: '#C0392B' }}>Block</button>
            </div>
          </div>
        </div>
      )}

      {prayerMenu && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end" onClick={() => setPrayerMenu(null)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto pb-8 fade-in" onClick={e => e.stopPropagation()}>
            <div className="px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
              <p className="font-bold text-sm text-center line-clamp-1" style={{ color: INK }}>{prayerMenu.title}</p>
            </div>
            <div className="px-4 py-2 space-y-1">
              <button
                onClick={() => { setDeletingPrayer(prayerMenu); setPrayerMenu(null); }}
                className="w-full text-left px-4 py-3.5 rounded-2xl text-sm font-semibold"
                style={{ color: '#C0392B' }}
              >
                Delete prayer request
              </button>
              <button onClick={() => setPrayerMenu(null)} className="w-full text-center py-3.5 text-sm font-semibold" style={{ color: MUTED }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingPrayer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end" onClick={() => setDeletingPrayer(null)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto pb-8 fade-in" onClick={e => e.stopPropagation()}>
            <div className="px-4 pt-5 pb-4 text-center">
              <h3 className="font-bold mb-1" style={{ color: INK }}>Delete prayer request?</h3>
              <p className="text-sm mb-5 px-4" style={{ color: MUTED }}>
                This permanently removes “{deletingPrayer.title}” and its prayer history.
              </p>
              <div className="px-4 space-y-2">
                <button onClick={() => deletePrayer(deletingPrayer)} className="w-full text-white rounded-2xl py-3.5 font-bold text-sm" style={{ background: '#C0392B' }}>
                  Yes, delete
                </button>
                <button onClick={() => setDeletingPrayer(null)} className="w-full font-semibold text-sm py-3" style={{ color: MUTED }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end" onClick={() => setEditing(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto p-6 pb-10 fade-in overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="type-heading text-lg mb-4">Edit profile</h3>

            <div
              className="flex items-center gap-3 mb-4 p-3 rounded-xl cursor-pointer"
              style={{ border: `1px solid ${HAIRLINE}` }}
              onClick={() => profilePhotoRef.current?.click()}
            >
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'rgba(44,64,85,0.08)' }}>
                {(previewProfile || profile.profilePhoto)
                  ? <img src={previewProfile || profile.profilePhoto} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center font-bold text-lg" style={{ color: ACCENT }}>
                      {profile.name?.[0]?.toUpperCase()}
                    </div>}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: INK }}>Profile photo</p>
                <p className="text-xs" style={{ color: ACCENT }}>{previewProfile ? 'Photo selected ✓' : 'Tap to change'}</p>
              </div>
            </div>

            <input
              ref={profilePhotoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) setPreviewProfile(URL.createObjectURL(f)); }}
            />

            <div className="space-y-3">
              {[
                { field: 'name', placeholder: 'Full name' },
                { field: 'churchName', placeholder: 'Church name' },
                { field: 'location', placeholder: 'Location' },
              ].map(({ field, placeholder }) => (
                <input
                  key={field}
                  value={editForm[field] || ''}
                  onChange={e => setEditForm(p => ({ ...p, [field]: e.target.value }))}
                  placeholder={placeholder}
                  // 16px stops iOS Safari zooming the page on focus.
                  style={{ width: '100%', border: `1px solid ${HAIRLINE}`, borderRadius: 10, padding: '12px 14px', fontSize: 16, minHeight: 44 }}
                />
              ))}
              <textarea
                value={editForm.bio || ''}
                onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))}
                placeholder="Bio"
                rows={3}
                style={{ width: '100%', border: `1px solid ${HAIRLINE}`, borderRadius: 10, padding: '12px 14px', fontSize: 16, resize: 'vertical' }}
              />
              <div>
                <p className="text-sm mb-2" style={{ color: INK }}>Gender</p>
                <div className="flex gap-2">
                  {['male', 'female'].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setEditForm(p => ({ ...p, gender: g }))}
                      className="flex-1 capitalize"
                      style={{
                        minHeight: 44, borderRadius: 10, fontSize: 14,
                        border: `1px solid ${editForm.gender === g ? ACCENT : HAIRLINE}`,
                        background: editForm.gender === g ? ACCENT : '#FFFFFF',
                        color: editForm.gender === g ? '#FFFFFF' : INK,
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              {/* Who can see what. Saved immediately and independently of the
                  form below, so a toggle never sits in a state the server
                  hasn't accepted. */}
              <div style={{ borderTop: `1px solid ${HAIRLINE}`, paddingTop: 14 }}>
                <p className="text-sm mb-1" style={{ color: INK }}>Visible to others</p>
                <p className="text-xs mb-3" style={{ color: MUTED, lineHeight: 1.45 }}>
                  You can always see these yourself.
                </p>
                {[
                  { key: 'showChurch', label: 'Church', value: profile.churchName },
                  { key: 'showLocation', label: 'Location', value: profile.location },
                ].filter(r => r.value).map(({ key, label, value }) => (
                  <label
                    key={key}
                    className="flex items-center justify-between gap-3"
                    style={{ minHeight: 44, cursor: 'pointer' }}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm" style={{ color: INK }}>{label}</span>
                      <span className="block text-xs truncate" style={{ color: MUTED }}>{value}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={visibility[key]}
                      disabled={savingVisibility}
                      onChange={() => toggleVisibility(key)}
                      aria-label={`Show ${label.toLowerCase()} on your profile`}
                      style={{ width: 20, height: 20, accentColor: ACCENT, flexShrink: 0 }}
                    />
                  </label>
                ))}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setEditing(false); setPreviewProfile(null); }}
                  className="flex-1"
                  style={{ minHeight: 44, borderRadius: 10, border: `1px solid ${HAIRLINE}`, background: '#FFFFFF', color: INK, fontSize: 14 }}
                >
                  Cancel
                </button>
                <WaterButton variant="primary" onClick={handleSave} disabled={saving} className="flex-1 py-3 text-sm font-bold">
                  {saving ? 'Saving…' : 'Save changes'}
                </WaterButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact top bar. On your own profile it is the page title plus the existing
 * settings route (which still owns sign-out, privacy, account and blocked
 * users). On someone else's it is a back control plus the moderation menu.
 */
function TopBar({ isOwner, onBack, onSettings, onMore }) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: '0 12px', paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}
    >
      {isOwner ? (
        <>
          <h2 className="type-heading" style={{ fontSize: 20, paddingLeft: 8 }}>You</h2>
          <button
            onClick={onSettings}
            aria-label="Settings"
            className="flex items-center justify-center"
            style={{ width: 44, height: 44, background: 'none', border: 0 }}
          >
            <Settings size={21} strokeWidth={1.9} color={INK} />
          </button>
        </>
      ) : (
        <>
          <button
            onClick={onBack}
            aria-label="Back"
            className="flex items-center justify-center"
            style={{ width: 44, height: 44, background: 'none', border: 0 }}
          >
            <ChevronLeft size={24} strokeWidth={1.9} color={INK} />
          </button>
          <button
            onClick={onMore}
            aria-label="More options"
            className="flex items-center justify-center"
            style={{ width: 44, height: 44, background: 'none', border: 0 }}
          >
            <MoreHorizontal size={22} strokeWidth={1.9} color={INK} />
          </button>
        </>
      )}
    </div>
  );
}
