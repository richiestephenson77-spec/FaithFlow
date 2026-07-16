import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { track } from '../utils/analytics';
import Logo from '../components/Logo';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      track('user_logged_in');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center mb-10">
          <Logo size="lg" light={false} />
        </div>

        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Welcome back</h2>

          {error && (
            <div className="bg-red-50 text-red-600 rounded-lg px-4 py-2 mb-4 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500"
                placeholder="you@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500"
                placeholder="••••••••"
              />
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-faith-600 font-medium">Forgot password?</Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C0603F] text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            New here?{' '}
            <Link to="/signup" className="text-faith-600 font-semibold">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
