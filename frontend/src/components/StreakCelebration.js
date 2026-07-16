import { useEffect, useRef } from 'react';

function getStreakMessage(streak) {
  if (streak >= 100) return { title: '🔥 Incredible!', sub: '100 days of commitment to prayer.' };
  if (streak >= 30) return { title: '🔥 30 Day Streak!', sub: '30 days of consistency. Keep going.' };
  if (streak >= 7) return { title: '🔥 One Week!', sub: 'One week of faithful prayer.' };
  return { title: '🔥 Streak Increased!', sub: 'Every prayer matters.' };
}

const COLORS = ['#2C4055', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ffffff'];

function Confetti() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const pieces = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100,
      size: 6 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      speed: 2 + Math.random() * 3,
      drift: (Math.random() - 0.5) * 2,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 6,
    }));

    let raf;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.4);
        ctx.restore();
        p.y += p.speed;
        p.x += p.drift;
        p.rotation += p.rotSpeed;
        if (p.y > canvas.height) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
      });
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

export default function StreakCelebration({ streak, onDone }) {
  const { title, sub } = getStreakMessage(streak.current);
  const isRecord = streak.isRecord;

  return (
    <div className="min-h-screen bg-[#2C4055] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <Confetti />

      <div className="relative z-10 text-center text-white">
        {/* Flame icon */}
        <div className="text-8xl mb-4 animate-bounce">🔥</div>

        {isRecord && (
          <div className="bg-terracotta-400/30 border border-terracotta-300/50 rounded-full px-4 py-1 text-terracotta-200 text-xs font-bold uppercase tracking-widest mb-4 inline-block">
            🏆 New Personal Record!
          </div>
        )}

        <h1 className="text-4xl font-extrabold mb-2">{title}</h1>
        <p className="text-white/80 text-lg mb-2">
          You are now on a <span className="font-bold text-white">{streak.current} day</span> prayer streak.
        </p>
        <p className="text-white/60 text-sm mb-10">{sub}</p>

        {streak.longest > 1 && (
          <p className="text-white/50 text-xs mb-8">Best streak: {streak.longest} days</p>
        )}

        <button
          onClick={onDone}
          className="bg-white text-faith-700 font-bold text-base rounded-2xl px-10 py-4 shadow-xl"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
