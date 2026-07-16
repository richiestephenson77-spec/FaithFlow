import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import Logo from '../components/Logo';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      const code = err.response?.data?.error;
      if (code === 'email_send_failed') {
        setError(`We couldn't send the reset email to this address. Please contact support at richiestephenson.77@gmail.com and we'll reset it manually.`);
      } else {
        setError(err.response?.data?.error || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#2C4055]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-white text-center mb-10">
          <Logo size="lg" light={true} />
        </div>

        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Check your email</h2>
              <p className="text-gray-500 text-sm mb-6">
                If an account exists for <strong>{email}</strong>, we've sent a password reset link. Check your inbox (and spam folder).
              </p>
              <Link
                to="/login"
                className="w-full block bg-[#2C4055] text-white rounded-xl py-3 font-semibold text-sm text-center"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Forgot password?</h2>
              <p className="text-gray-500 text-sm mb-6">
                Enter your email and we'll send you a reset link.
              </p>

              {error && (
                <div className="bg-red-50 text-red-600 rounded-lg px-4 py-2 mb-4 text-sm">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500"
                    placeholder="you@email.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#2C4055] text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-60"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-4">
                <Link to="/login" className="text-faith-600 font-semibold">Back to Sign In</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
