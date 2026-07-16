import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { track } from '../utils/analytics';
import Logo from '../components/Logo';

export default function Signup() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', password: '', churchName: '', location: '', bio: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  function update(field, val) {
    setForm(p => ({ ...p, [field]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (step === 1) return setStep(2);
    setError('');
    setLoading(true);
    try {
      await signup(form);
      track('user_signed_up', { method: 'email' });
      navigate('/onboarding');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center mb-8">
          <Logo size="md" light={false} />
        </div>

        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
          <div className="flex gap-2 mb-6">
            {[1, 2].map(s => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-faith-600' : 'bg-gray-200'}`} />
            ))}
          </div>

          <h2 className="text-lg font-bold text-gray-800 mb-4">
            {step === 1 ? 'Create your account' : 'Tell us about yourself'}
          </h2>

          {error && (
            <div className="bg-red-50 text-red-600 rounded-lg px-4 py-2 mb-4 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {step === 1 ? (
              <>
                <Field label="Full Name" type="text" value={form.name} onChange={v => update('name', v)} placeholder="Your name" required />
                <Field label="Email" type="email" value={form.email} onChange={v => update('email', v)} placeholder="you@email.com" required />
                <Field label="Password" type="password" value={form.password} onChange={v => update('password', v)} placeholder="Min 8 characters" required />
              </>
            ) : (
              <>
                <Field label="Church (optional)" type="text" value={form.churchName} onChange={v => update('churchName', v)} placeholder="Your church name" />
                <Field label="Location (optional)" type="text" value={form.location} onChange={v => update('location', v)} placeholder="City, Country" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio (optional)</label>
                  <textarea
                    value={form.bio}
                    onChange={e => update('bio', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500 resize-none"
                    rows={3}
                    placeholder="Share a little about your faith journey..."
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C0603F] text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-60 mt-2"
            >
              {step === 1 ? 'Continue' : loading ? 'Creating account...' : 'Join FaithBridge'}
            </button>

            {step === 2 && (
              <button type="button" onClick={() => setStep(1)}
                className="w-full text-gray-500 text-sm py-1">← Back</button>
            )}
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-faith-600 font-semibold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  const { onChange, ...rest } = props;
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        {...rest}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500"
      />
    </div>
  );
}
