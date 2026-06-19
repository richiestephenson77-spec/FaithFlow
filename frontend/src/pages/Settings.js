import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function SettingsRow({ icon, label, sublabel, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors active:bg-gray-50 ${danger ? 'hover:bg-red-50' : 'hover:bg-gray-50'}`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-100' : 'bg-gray-100'}`}>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${danger ? 'text-red-500' : 'text-gray-800'}`}>{label}</p>
        {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
      {!danger && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      )}
    </button>
  );
}

export default function Settings() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">Settings</h1>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Account Settings */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Account</p>
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <SettingsRow icon="👤" label="Account Settings" sublabel="Email, password, personal info" onClick={() => navigate('account')} />
            <div className="h-px bg-gray-100 mx-5" />
            <SettingsRow icon="🔔" label="Notifications" sublabel="Prayer alerts, followers, comments" onClick={() => navigate('notifications')} />
            <div className="h-px bg-gray-100 mx-5" />
            <SettingsRow icon="🔒" label="Privacy" sublabel="Who can see your profile" onClick={() => {}} />
          </div>
        </div>

        {/* App Settings */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">App</p>
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <SettingsRow icon="🙏" label="Prayer Reminders" sublabel="Set daily prayer time reminders" onClick={() => navigate('reminders')} />
            <div className="h-px bg-gray-100 mx-5" />
            <SettingsRow icon="📖" label="Bible Version" sublabel="KJV, NIV, ESV and more" onClick={() => {}} />
          </div>
        </div>

        {/* Support */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Support</p>
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <SettingsRow icon="💬" label="Contact Us" sublabel="Get help or send feedback" onClick={() => navigate('contact')} />
            <div className="h-px bg-gray-100 mx-5" />
            <SettingsRow icon="⭐" label="Rate FaithFlow" sublabel="Support us with a review" onClick={() => {}} />
          </div>
        </div>

        {/* Logout */}
        <div className="bg-white rounded-2xl overflow-hidden border border-red-100 shadow-sm">
          <SettingsRow icon="🚪" label="Log Out" onClick={handleLogout} danger />
        </div>

        <p className="text-center text-xs text-gray-300 pb-4">FaithFlow · United in Faith</p>
      </div>
    </div>
  );
}
