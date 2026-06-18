import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Avatar from '../components/Avatar';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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

const CATEGORY_LABELS = {
  HEALTH: 'Health', FAMILY: 'Family', CAREER: 'Career',
  FINANCIAL: 'Financial', RELATIONSHIP: 'Relationship', SPIRITUAL: 'Spiritual Growth',
};

// Clean SVG icons — no emojis
function CrossIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  );
}

function PrayerHandsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V8a2 2 0 0 0-4 0v3"/><path d="M14 10V7a2 2 0 0 0-4 0v3"/><path d="M10 10V8a2 2 0 0 0-4 0v6a8 8 0 0 0 16 0v-5a2 2 0 0 0-4 0v2"/>
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

export default function PrayerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/prayers/${id}`)
      .then(res => setRequest(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-300 text-sm tracking-widest uppercase" style={{ fontFamily: 'Georgia, serif' }}>
      Loading
    </div>
  );
  if (!request) return (
    <div className="flex items-center justify-center py-20 text-gray-400 text-sm" style={{ fontFamily: 'Georgia, serif' }}>
      Prayer request not found.
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Header */}
      <div className={`px-4 pt-4 pb-8 ${request.isAnswered ? 'bg-gradient-to-br from-emerald-700 to-teal-600' : 'prayer-gradient'}`}>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <p className="text-white/50 text-[10px] uppercase tracking-[0.2em]" style={{ fontFamily: 'Georgia, serif' }}>
              {request.isAnswered ? 'Answered Prayer' : 'Prayer Request'}
            </p>
          </div>
        </div>

        {/* Title displayed large in header */}
        <h1 className="text-white text-2xl leading-snug font-light" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
          {request.title}
        </h1>
      </div>

      <div className="-mt-3 rounded-t-3xl bg-gray-50 px-5 pt-6 pb-12 space-y-5">

        {/* Requester row */}
        <div className="flex items-center gap-3">
          <Avatar user={request.user} size="md" />
          <div className="flex-1 min-w-0">
            <button onClick={() => navigate(`/profile/${request.user.id}`)}
              className="font-semibold text-gray-900 text-sm hover:underline leading-tight">
              {request.user?.name}
            </button>
            {request.user?.churchName && (
              <p className="text-xs text-gray-400 mt-0.5">{request.user.churchName}</p>
            )}
          </div>
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <ClockIcon />
            {getTimeAgo(request.createdAt)}
          </span>
        </div>

        {/* Tags — clean pill badges, no emoji */}
        {(request.isUrgent || (request.category && request.category !== 'GENERAL')) && (
          <div className="flex gap-2 flex-wrap">
            {request.isUrgent && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-1 rounded-full tracking-wide uppercase">
                <AlertIcon /> Urgent
              </span>
            )}
            {request.category && request.category !== 'GENERAL' && (
              <span className="text-[11px] font-semibold text-faith-600 bg-faith-50 border border-faith-100 px-3 py-1 rounded-full tracking-wide uppercase">
                {CATEGORY_LABELS[request.category]}
              </span>
            )}
          </div>
        )}

        {/* Prayer body — elegant serif */}
        <div className="bg-white rounded-2xl px-5 py-5 border border-gray-100 shadow-sm">
          <p className="text-gray-700 leading-[1.85] text-[15px]" style={{ fontFamily: 'Georgia, serif' }}>
            {request.body}
          </p>

          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-1.5 text-gray-400">
            <PrayerHandsIcon />
            <span className="text-xs tracking-wide">
              {request._count?.sessions || 0} {request._count?.sessions === 1 ? 'person has' : 'people have'} prayed for this
            </span>
          </div>
        </div>

        {/* Answered / Testimony */}
        {request.isAnswered && (
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
            {/* Thin top accent */}
            <div className="h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400" />
            <div className="px-5 py-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <CrossIcon />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-800" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                    God answered this prayer
                  </p>
                  {request.answeredAt && (
                    <p className="text-[11px] text-emerald-500 mt-0.5">{formatDate(request.answeredAt)}</p>
                  )}
                </div>
              </div>

              {request.testimonyMessage && (
                <p className="text-[15px] text-gray-700 leading-[1.85] whitespace-pre-line" style={{ fontFamily: 'Georgia, serif' }}>
                  {request.testimonyMessage}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-3xl font-light text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
              {request._count?.sessions || 0}
            </p>
            <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-widest">Prayers</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-base font-light text-gray-900 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
              {formatDate(request.createdAt)}
            </p>
            <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-widest">Posted</p>
          </div>
        </div>

      </div>
    </div>
  );
}
