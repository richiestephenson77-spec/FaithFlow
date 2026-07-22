import { motion } from 'framer-motion';
import { Globe, MapPin } from 'lucide-react';
import Avatar from './Avatar';
import ContentModeration from './ContentModeration';

const BORDER = { 1: '#F5C842', 2: '#C0C0C0', 3: '#CD7F32' };

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function TopPrayerCard({ request, currentUserId, onOpen, onPray, onUserClick, onMarkAnswered, onViewTestimony, onHide, rank, showDistance }) {
  // Use backend-provided isOwner — user.id is null when prayer is anonymized
  const isOwner = request.isOwner ?? (request.user?.id === currentUserId);
  const borderColor = BORDER[rank] || '#e5e7eb';
  const stop = (fn) => (e) => { e.stopPropagation(); fn && fn(); };

  return (
    <div
      onClick={onOpen}
      className="bg-white rounded-2xl p-4 relative cursor-pointer active:scale-[0.99] transition-transform"
      style={{ border: '1px solid #EFEFEF' }}
    >
      {/* Rank badge — bounces in */}
      <motion.div
        className="absolute -top-3 -left-1 w-7 h-7 rounded-full flex items-center justify-center select-none"
        style={{ background: borderColor, boxShadow: '0 1px 4px rgba(0,0,0,0.18)' }}
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.15 * rank }}
      >
        <span className="text-white font-bold" style={{ fontSize: 11 }}>{rank}</span>
      </motion.div>

      {request.isUrgent && (
        <span className="absolute top-3 right-3 bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-100 uppercase tracking-wide">
          Urgent
        </span>
      )}

      <div className="flex items-start gap-3 mt-1">
        <button onClick={!request.isAnonymous ? stop(onUserClick) : undefined} className="flex-shrink-0">
          {request.isAnonymous ? (
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
          ) : (
            <Avatar user={request.user} size="md" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              {request.isAnonymous ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <p className="text-xs font-semibold text-gray-500">{request.displayLocation || 'Anonymous Believer'}</p>
                </div>
              ) : (
                <button onClick={stop(onUserClick)} className="font-semibold text-gray-900 text-sm leading-tight text-left hover:underline">
                  {request.user?.name}
                </button>
              )}
              {!request.isAnonymous && request.user?.churchName && (
                <p className="text-xs text-faith-500 mt-0.5">{request.user.churchName}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5 mr-8">
              <span className="text-[10px] text-gray-400 whitespace-nowrap">{getTimeAgo(request.createdAt)}</span>
              {!isOwner && (
                <ContentModeration
                  contentType="PRAYER"
                  contentId={request.id}
                  targetUserId={request.isAnonymous ? undefined : request.user?.id}
                  targetName={request.user?.name}
                  onHidden={onHide}
                  iconSize={16}
                />
              )}
            </div>
          </div>

          <h4 className="font-bold text-gray-900 text-sm mt-2 mb-1" style={{ fontFamily: "'Fraunces', serif" }}>{request.title}</h4>
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{request.body}</p>

          {/* Live count — re-animates when count changes */}
          <motion.p
            key={request.prayerCount}
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-xs font-semibold mt-2 flex items-center gap-1"
            style={{ color: '#0A0A0A' }}
          >
            {request.prayerCount === 0
              ? <>Be the first to pray for this</>
              : <><Globe size={11} strokeWidth={2} /> {request.prayerCount} {request.prayerCount === 1 ? 'person' : 'people'} praying worldwide</>}
          </motion.p>
          {showDistance && request.distanceKm != null && (
            <p className="flex items-center gap-0.5 text-xs text-gray-400 mt-0.5"><MapPin size={10} strokeWidth={2} />{request.distanceKm} km away</p>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
            <div />
            <div className="flex items-center gap-2">
              {isOwner && !request.isAnswered && (
                <button onClick={stop(onMarkAnswered)}
                  className="text-xs font-semibold text-emerald-600 border border-emerald-200 bg-emerald-50 rounded-xl px-3 py-1.5">
                  Answered
                </button>
              )}
              {!request.isAnswered && (
                isOwner ? (
                  <button disabled className="text-xs font-bold rounded-xl px-4 py-2 bg-gray-100 text-gray-400 cursor-not-allowed">Pray Now</button>
                ) : (
                  <button onClick={stop(onPray)} className="text-xs font-bold px-4 py-2 rounded-xl text-white" style={{ background: '#2C4055' }}>Pray Now</button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
