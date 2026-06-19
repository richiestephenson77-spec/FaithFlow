import Avatar from './Avatar';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };
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

export default function TopPrayerCard({ request, currentUserId, onPray, onUserClick, onMarkAnswered, onViewTestimony, rank }) {
  const isOwner = request.user?.id === currentUserId;
  const borderColor = BORDER[rank] || '#e5e7eb';
  const medal = MEDAL[rank];

  return (
    <div
      className="bg-white rounded-2xl p-4 shadow-sm relative fade-in"
      style={{ border: `2px solid ${borderColor}` }}
    >
      {/* Medal top-left */}
      <span className="absolute -top-3 -left-1 text-2xl select-none">{medal}</span>

      {/* Urgent badge top-right */}
      {request.isUrgent && (
        <span className="absolute top-3 right-3 bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-100 uppercase tracking-wide">
          Urgent
        </span>
      )}

      <div className="flex items-start gap-3 mt-1">
        <button onClick={onUserClick} className="flex-shrink-0">
          <Avatar user={request.user} size="md" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <button onClick={onUserClick} className="font-semibold text-gray-900 text-sm leading-tight text-left hover:underline">
                {request.user?.name}
              </button>
              {request.user?.churchName && (
                <p className="text-xs text-faith-500 mt-0.5">{request.user.churchName}</p>
              )}
            </div>
            <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5 mr-8">{getTimeAgo(request.createdAt)}</span>
          </div>

          <h4 className="font-bold text-gray-900 text-sm mt-2 mb-1">{request.title}</h4>
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{request.body}</p>

          {/* Worldwide count */}
          <p className="text-xs font-semibold text-amber-600 mt-2">
            🌍 {request.prayerCount} {request.prayerCount === 1 ? 'person' : 'people'} praying worldwide
          </p>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
            <div />
            <div className="flex items-center gap-2">
              {isOwner && !request.isAnswered && (
                <button onClick={onMarkAnswered}
                  className="text-xs font-semibold text-emerald-600 border border-emerald-200 bg-emerald-50 rounded-xl px-3 py-1.5">
                  Answered
                </button>
              )}
              {!request.isAnswered && (
                <button
                  onClick={!isOwner ? onPray : undefined}
                  disabled={isOwner}
                  className={`text-xs font-bold rounded-xl px-4 py-2 shadow-sm ${
                    isOwner
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'prayer-gradient text-white'
                  }`}
                >
                  Pray Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
