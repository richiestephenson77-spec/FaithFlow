import React from 'react';

function ErrorFallback({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8" style={{ minHeight: 260 }}>
      <div className="rounded-full flex items-center justify-center mb-4" style={{ width: 56, height: 56, background: 'rgba(44,64,85,0.10)' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2C4055" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="font-medium" style={{ color: '#1A1A1A', fontSize: 16 }}>Something went wrong</p>
      <p className="text-sm mt-1.5" style={{ color: '#8E8E8E' }}>This part of the app ran into an unexpected error.</p>
      <button
        onClick={onRetry}
        className="mt-6 font-semibold text-white"
        style={{ background: '#2C4055', borderRadius: 12, padding: '11px 28px' }}
      >
        Try again
      </button>
      <button
        onClick={() => { window.location.href = '/'; }}
        className="mt-3 text-sm font-medium"
        style={{ color: '#2C4055' }}
      >
        Go home
      </button>
    </div>
  );
}

// Class component so it can use componentDidCatch / getDerivedStateFromError.
// Pass `resetKey` (e.g. the route pathname) so navigating away auto-clears a
// caught error and the next page renders normally.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Surface the real error for debugging.
    console.error('ErrorBoundary caught an error:', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.reset} />;
    }
    return this.props.children;
  }
}
