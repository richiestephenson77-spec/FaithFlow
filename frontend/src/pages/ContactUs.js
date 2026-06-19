import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const SUBJECTS = [
  'General Feedback',
  'Bug Report',
  'Feature Request',
  'Account Issue',
  'Prayer Feature',
  'Other',
];

export default function ContactUs() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (message.trim().length < 20) { setError('Message must be at least 20 characters'); return; }
    setSending(true);
    setError('');
    try {
      await api.post('/support/contact', { subject, message: message.trim() });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send. Please try again.');
    } finally {
      setSending(false);
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
        <h1 className="text-lg font-bold text-gray-900">Contact Us</h1>
      </div>

      <div className="px-4 py-5">
        {sent ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">Message Sent!</p>
              <p className="text-sm text-gray-500 mt-1">We'll get back to you as soon as possible. Thank you for reaching out.</p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="mt-2 h-11 px-8 rounded-xl bg-blue-600 text-white font-semibold text-sm"
            >
              Go Back
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Subject</label>
                <select
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50 appearance-none"
                >
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Tell us what's on your mind… (min 20 characters)"
                  rows={6}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{message.trim().length} / 20 min characters</p>
              </div>
            </div>

            {error && <p className="text-xs text-red-500 px-1">{error}</p>}

            <button
              type="submit"
              disabled={sending}
              className="w-full h-11 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
