import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../utils/api';
import Logo from '../components/Logo';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: form.password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col bg-[#C0603F] items-center justify-center px-6" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Invalid Link</h2>
          <p className="text-gray-500 text-sm mb-4">This reset link is missing or invalid.</p>
          <Link to="/forgot-password" className="text-faith-600 font-semibold text-sm">Request a new one</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#C0603F]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-white text-center mb-10">
          <Logo size="lg" light={true} />
        </div>

        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
          {success ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Password Updated!</h2>
              <p className="text-gray-500 text-sm">Your password has been reset. Redirecting you to sign in...</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Set new password</h2>
              <p className="text-gray-500 text-sm mb-6">Choose a strong password for your account.</p>

              {error && (
                <div className="bg-red-50 text-red-600 rounded-lg px-4 py-2 mb-4 text-sm">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500"
                    placeholder="At least 6 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={form.confirm}
                    onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#C0603F] text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-60"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
