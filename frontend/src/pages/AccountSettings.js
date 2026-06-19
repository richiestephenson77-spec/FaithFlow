import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">{title}</p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <input
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50"
        {...props}
      />
    </div>
  );
}

export default function AccountSettings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteInput, setDeleteInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [infoErr, setInfoErr] = useState('');
  const [pwErr, setPwErr] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  async function saveInfo(e) {
    e.preventDefault();
    setSaving(true);
    setInfoErr('');
    setInfoMsg('');
    try {
      await api.patch('/users/account', { name, email });
      setInfoMsg('Saved!');
    } catch (err) {
      setInfoErr(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPwErr('');
    setPwMsg('');
    if (newPassword !== confirmPassword) { setPwErr('Passwords do not match'); return; }
    if (newPassword.length < 6) { setPwErr('Password must be at least 6 characters'); return; }
    setSavingPw(true);
    try {
      await api.patch('/users/account', { currentPassword, newPassword });
      setPwMsg('Password updated!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwErr(err.response?.data?.error || 'Failed to update password');
    } finally {
      setSavingPw(false);
    }
  }

  async function deleteAccount() {
    if (deleteInput !== 'DELETE') return;
    setDeleting(true);
    try {
      await api.delete('/users/account');
      logout();
      navigate('/login');
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-gray-50 min-h-full">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">Account Settings</h1>
      </div>

      <div className="px-4 py-5 space-y-4">
        <Section title="Personal Info">
          <form onSubmit={saveInfo} className="space-y-4">
            <Field label="Full Name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
            {infoErr && <p className="text-xs text-red-500">{infoErr}</p>}
            {infoMsg && <p className="text-xs text-green-600">{infoMsg}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full h-11 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </Section>

        <Section title="Change Password">
          <form onSubmit={savePassword} className="space-y-4">
            <Field label="Current Password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" />
            <Field label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
            <Field label="Confirm New Password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
            {pwErr && <p className="text-xs text-red-500">{pwErr}</p>}
            {pwMsg && <p className="text-xs text-green-600">{pwMsg}</p>}
            <button
              type="submit"
              disabled={savingPw}
              className="w-full h-11 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-50"
            >
              {savingPw ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </Section>

        <Section title="Danger Zone">
          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              className="w-full h-11 rounded-xl border border-red-200 text-red-500 font-semibold text-sm hover:bg-red-50"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">This will permanently delete your account and all data. Type <strong>DELETE</strong> to confirm.</p>
              <input
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder="DELETE"
                className="w-full border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 focus:outline-none focus:border-red-400 bg-red-50"
              />
              <div className="flex gap-2">
                <button onClick={() => { setShowDelete(false); setDeleteInput(''); }} className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">Cancel</button>
                <button
                  onClick={deleteAccount}
                  disabled={deleteInput !== 'DELETE' || deleting}
                  className="flex-1 h-11 rounded-xl bg-red-500 text-white font-semibold text-sm disabled:opacity-40"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
