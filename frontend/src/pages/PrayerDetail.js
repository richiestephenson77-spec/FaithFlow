import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Avatar from '../components/Avatar';

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
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
    <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
  );
  if (!request) return (
    <div className="flex items-center justify-center py-20 text-gray-400">Prayer request not found.</div>
  );

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Header */}
      <div className={`px-4 pt-4 pb-6 ${request.isAnswered ? 'bg-gradient-to-br from-emerald-600 to-teal-500' : 'prayer-gradient'}`}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h2 className="text-lg font-bold text-white">
            {request.isAnswered ? '🙌 Answered Prayer' : '🙏 Prayer Request'}
          </h2>
        </div>
      </div>

      <div className="-mt-3 rounded-t-3xl bg-gray-50 px-4 pt-5 pb-10 space-y-4">
        {/* Requester */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Avatar user={request.user} size="md" />
            <div>
              <button onClick={() => navigate(`/profile/${request.user.id}`)} className="font-semibold text-gray-900 text-sm hover:underline">
                {request.user?.name}
              </button>
              {request.user?.churchName && (
                <p className="text-xs text-faith-500">{request.user.churchName}</p>
              )}
            </div>
            <span className="ml-auto text-[10px] text-gray-400">{getTimeAgo(request.createdAt)}</span>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {request.isUrgent && (
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-0.5 rounded-full">🚨 Urgent</span>
            )}
            {request.category && request.category !== 'GENERAL' && (
              <span className="bg-faith-50 text-faith-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {{ HEALTH:'🏥', FAMILY:'👨‍👩‍👧', CAREER:'💼', FINANCIAL:'💰', RELATIONSHIP:'💑', SPIRITUAL:'✝️' }[request.category]} {request.category.charAt(0) + request.category.slice(1).toLowerCase()}
              </span>
            )}
          </div>
          <h3 className="font-bold text-gray-900 text-base mb-2">{request.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{request.body}</p>

          <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-3">
            <span className="text-xs text-gray-400">🙏 {request._count?.sessions || 0} people prayed for this</span>
          </div>
        </div>

        {/* Testimony */}
        {request.isAnswered && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🙌</span>
              <div>
                <p className="font-bold text-emerald-800 text-sm">God answered this prayer!</p>
                {request.answeredAt && (
                  <p className="text-xs text-emerald-600">{getTimeAgo(request.answeredAt)}</p>
                )}
              </div>
            </div>
            {request.testimonyMessage && (
              <p className="text-sm text-emerald-900 leading-relaxed whitespace-pre-line">
                {request.testimonyMessage}
              </p>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-2xl font-extrabold text-gray-900">{request._count?.sessions || 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">People Prayed</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-2xl font-extrabold text-gray-900">{getTimeAgo(request.createdAt)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Posted</p>
          </div>
        </div>
      </div>
    </div>
  );
}
