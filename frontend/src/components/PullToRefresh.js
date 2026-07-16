import { useRef, useState, useCallback } from 'react';

// Pull-to-refresh for feeds that live inside the shared scrolling <main>.
//
// The pull is expressed as a GROWING SPACER at the top (a layout height), not a
// CSS transform on the content. A transform would establish a containing block
// and re-anchor the `position: fixed` composers / bottom sheets these feeds use
// to this wrapper instead of the viewport. Height is safe.
//
// We track touches directly (rather than framer drag) because the gesture must
// only engage when the nearest scroll container is already at the top — anywhere
// else the touch belongs to normal scrolling.

const THRESHOLD = 68;   // pull distance that triggers a refresh
const MAX = 96;         // clamp so it can't be dragged arbitrarily far
const REST = 40;        // spacer height held open while the refresh runs
const ACCENT = '#2C4055';

export default function PullToRefresh({ onRefresh, children, className = '', style = {} }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const scrollElRef = useRef(null);
  const containerRef = useRef(null);
  const settling = useRef(false); // true during the spring-back so height transitions

  const scrollParent = useCallback(() => {
    let el = containerRef.current?.parentElement;
    while (el) {
      const oy = getComputedStyle(el).overflowY;
      if (oy === 'auto' || oy === 'scroll') return el;
      el = el.parentElement;
    }
    return null;
  }, []);

  const onTouchStart = (e) => {
    if (refreshing) return;
    const sc = scrollParent();
    scrollElRef.current = sc;
    startY.current = sc && sc.scrollTop <= 0 ? e.touches[0].clientY : null;
    settling.current = false;
  };

  const onTouchMove = (e) => {
    if (startY.current == null || refreshing) return;
    const sc = scrollElRef.current;
    if (sc && sc.scrollTop > 0) { startY.current = null; setPull(0); return; }
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      setPull(Math.min(MAX, dy * 0.5)); // resistance
    } else if (pull !== 0) {
      setPull(0);
    }
  };

  const onTouchEnd = async () => {
    if (startY.current == null) return;
    const triggered = pull >= THRESHOLD && !refreshing;
    startY.current = null;
    settling.current = true;
    if (triggered) {
      setRefreshing(true);
      setPull(REST);
      try { await onRefresh(); } catch {}
      setRefreshing(false);
    }
    setPull(0);
  };

  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: '100%', ...style }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div
        aria-hidden
        style={{
          height: refreshing ? REST : pull,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: settling.current ? 'height 0.25s ease' : 'none',
        }}
      >
        <div
          className={refreshing ? 'animate-spin' : ''}
          style={{
            width: 22,
            height: 22,
            borderRadius: '9999px',
            border: '2px solid rgba(44,64,85,0.18)',
            borderTopColor: ACCENT,
            opacity: refreshing ? 1 : progress,
            transform: refreshing ? 'none' : `rotate(${progress * 270}deg)`,
          }}
        />
      </div>
      {children}
    </div>
  );
}
