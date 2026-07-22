// Vanish-mode options (Instagram-style disappearing messages).
export const VANISH_OPTIONS = [
  { id: 'off',        label: 'Off',        desc: 'Messages stay in the chat.' },
  { id: 'after_seen', label: 'After seen', desc: 'Delete once seen and you leave the chat.' },
  { id: '24h',        label: '24 hours',   desc: 'Delete 24 hours after being sent.' },
  { id: '7d',         label: '7 days',     desc: 'Delete 7 days after being sent.' },
  { id: '30d',        label: '30 days',    desc: 'Delete 30 days after being sent.' },
];

export function vanishLabel(mode) {
  return (VANISH_OPTIONS.find(o => o.id === mode) || VANISH_OPTIONS[0]).label;
}

// The thread banner text for an active mode (null when off).
export function vanishBanner(mode) {
  switch (mode) {
    case 'after_seen': return "Messages disappear after they're seen";
    case '24h': return 'Messages disappear after 24 hours';
    case '7d': return 'Messages disappear after 7 days';
    case '30d': return 'Messages disappear after 30 days';
    default: return null;
  }
}
