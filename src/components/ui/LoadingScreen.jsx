import { Shield } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center"
      style={{ background: 'var(--color-bg-primary)' }}
    >
      {/* Background ambient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-pink-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px]" />
      </div>

      <div className="relative flex flex-col items-center gap-6">
        {/* Animated rings */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-32 h-32 rounded-full border border-pink-500/10 animate-ping" style={{ animationDuration: '2.5s' }} />
          <div className="absolute w-24 h-24 rounded-full border border-pink-500/15 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute w-16 h-16 rounded-full border border-pink-500/25 animate-ping" style={{ animationDuration: '1.5s' }} />

          {/* Logo */}
          <div
            className="relative w-20 h-20 rounded-3xl flex items-center justify-center animate-glow"
            style={{
              background: 'linear-gradient(135deg, #ec4899, #a855f7)',
              boxShadow: '0 0 40px rgba(236,72,153,0.5)',
            }}
          >
            <Shield size={36} className="text-white" />
          </div>
        </div>

        {/* Brand name */}
        <div className="text-center">
          <h1 className="font-display font-bold text-3xl gradient-text">SafeHer</h1>
          <p className="text-slate-500 text-sm mt-1">Your safety companion</p>
        </div>

        {/* Loading dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-pink-500"
              style={{
                animation: 'pulse 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
