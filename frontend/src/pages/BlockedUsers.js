import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import api from '../utils/api';
import Avatar from '../components/Avatar';
import Skeleton from '../components/Skeleton';
import { useToast } from '../contexts/ToastContext';

export default function BlockedUsers() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [users, setUsers] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    api.get('/blocks').then(res => setUsers(res.data)).catch(() => setUsers([]));
  }, []);

  async function unblock(u) {
    setBusy(u.id);
    try {
      await api.delete(`/blocks/${u.id}`);
      setUsers(prev => prev.filter(x => x.id !== u.id));
      showToast(`Unblocked ${u.name?.split(' ')[0] || ''}`.trim());
    } catch (err) {
      showToast(err.friendlyMessage || 'Could not unblock', 'error');
    }
    setBusy(null);
  }

  return (
    <div className="bg-gray-50 min-h-full">
      <div className="bg-white px-4 pt-5 pb-3 flex items-center gap-3" style={{ borderBottom: '1px solid #EFEFEF' }}>
        <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1">
          <ChevronLeft size={22} color="#163449" strokeWidth={2} />
        </button>
        <div>
          <h1 className="text-lg font-bold" style={{ color: '#163449', fontFamily: "'Fraunces', serif" }}>Blocked Users</h1>
          <p className="text-xs mt-0.5" style={{ color: '#8E8E8E' }}>People you've blocked can't see or reach you</p>
        </div>
      </div>

      <div className="px-4 py-4">
        {users === null ? (
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #EFEFEF' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i === 1 ? 'none' : '1px solid #EFEFEF' }}>
                <Skeleton width={40} height={40} circle />
                <Skeleton width={120} height={12} />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: '#9AA6AD' }}>You haven't blocked anyone.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #EFEFEF' }}>
            {users.map((u, i) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i === 0 ? 'none' : '1px solid #EFEFEF' }}>
                <Avatar user={u} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate" style={{ color: '#163449' }}>{u.name}</p>
                  {u.churchName && <p className="text-xs truncate" style={{ color: '#8E8E8E' }}>{u.churchName}</p>}
                </div>
                <button
                  onClick={() => unblock(u)}
                  disabled={busy === u.id}
                  className="text-xs font-semibold px-3.5 py-1.5 rounded-full flex-shrink-0 disabled:opacity-50"
                  style={{ background: 'rgba(44,64,85,0.08)', color: '#2C4055' }}
                >
                  {busy === u.id ? '…' : 'Unblock'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
