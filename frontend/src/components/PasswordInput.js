import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Password field with a show/hide toggle, styled to match the auth screens'
// existing inputs (border-gray-200, rounded-xl, focus:ring-faith-500). Extra
// right padding keeps typed text clear of the icon.
export default function PasswordInput({ className = '', ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`w-full border border-gray-200 rounded-xl px-4 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2C4055] active:text-[#2C4055] transition-colors"
      >
        {visible ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
      </button>
    </div>
  );
}
