import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// The atlas ships as dependency-free static files under public/bible-atlas and
// runs in a same-origin iframe so its own stylesheet and pointer/keyboard
// handling can't leak into the app (it styles bare element selectors and
// captures pointer gestures on its map).
//
// Height is 100% of the PARENT, never the viewport: this route renders inside
// Layout's max-w-md mobile column, so a viewport-relative height (100dvh)
// would size the frame to the whole browser window on web and overflow the
// column. The parent here is AnimatedOutlet's `position:absolute; inset:0`
// box, which has a definite height, so the percentage resolves cleanly.
export default function BibleMaps() {
  const navigate = useNavigate();
  const frame = useRef(null);

  useEffect(() => {
    const receive = (event) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type !== 'faithstring:bible-atlas:back') return;
      navigate('/explore');
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [navigate]);

  return (
    <iframe
      ref={frame}
      src="/bible-atlas/index.html"
      title="Bible Maps: historical atlas from 3000 BC to AD 1600"
      style={{ display: 'block', width: '100%', height: '100%', border: 0 }}
    />
  );
}
