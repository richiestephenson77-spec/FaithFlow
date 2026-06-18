import { useState, useEffect } from 'react';
import api from '../utils/api';
import Avatar from './Avatar';

export default function FollowListModal({ userId, type, onClose, onUserClick }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/users/${userId}/${type}`)
      .then(r => setUsers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, type]);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto p-6 pb-8 fade-in max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h3 className="text-base font-bold text-center mb-4 capitalize">
          {type === 'followers' ? 'Believers' : 'Following'}
        </h3>

        <div className="overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <p className="text-center text-gray-400">Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-center text-gray-400 py-6">
              {type === 'followers' ? 'No believers yet' : 'Not following anyone'}
            </p>
          ) : (
            users.map(u => (
              <button key={u.id} onClick={() => onUserClick(u.id)}
                className="flex items-center gap-3 w-full text-left p-2 hover:bg-gray-50 rounded-xl">
                <Avatar user={u} size="md" />
                <div>
                  <p className="font-semibold text-sm text-gray-800">{u.name}</p>
                  {u.churchName && <p className="text-xs text-faith-600">⛪ {u.churchName}</p>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
