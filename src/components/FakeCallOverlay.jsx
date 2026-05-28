import { useState, useEffect } from 'react';
import { Phone, PhoneOff, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function FakeCallOverlay() {
  const { fakeCallActive, setFakeCall, selectedCaller } = useApp();
  const [answered, setAnswered] = useState(false);
  const [timer, setTimer] = useState(0);
  const [muted, setMuted] = useState(false);

  // Reset state when overlay opens/closes
  useEffect(() => {
    if (!fakeCallActive) {
      setAnswered(false);
      setTimer(0);
      setMuted(false);
    }
  }, [fakeCallActive]);

  // Call timer
  useEffect(() => {
    let interval;
    if (fakeCallActive && answered) {
      interval = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [fakeCallActive, answered]);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleAccept = () => setAnswered(true);
  const handleDecline = () => { setFakeCall(false); };

  // Use selectedCaller from context, fallback to default
  const caller = selectedCaller || { name: 'Mom', number: '+91 98765 43210', avatar: 'M', color: 'from-pink-500 to-rose-500' };

  if (!fakeCallActive) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{
        background: answered
          ? 'linear-gradient(180deg, #0a1628 0%, #060a12 100%)'
          : 'linear-gradient(180deg, #0d1117 0%, #111827 50%, #0a0f1e 100%)',
      }}
    >
      {!answered ? (
        /* ── Incoming Call Screen ────────────────────────────── */
        <div className="flex flex-col items-center justify-between flex-1 p-8 pb-20">
          {/* Top info */}
          <div className="flex flex-col items-center gap-2 mt-16">
            <p className="text-slate-400 text-sm tracking-[0.2em] uppercase font-medium">Incoming Call</p>
            <h2 className="text-4xl font-display font-bold text-white mt-2">{caller.name}</h2>
            <p className="text-slate-400 text-base font-mono">{caller.number}</p>
            <div className="mt-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-emerald-400 text-xs font-medium">SafeHer Fake Call</p>
            </div>
          </div>

          {/* Avatar with animated rings */}
          <div className="relative flex items-center justify-center my-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="absolute rounded-full border border-white/5 animate-ping"
                style={{
                  width: 96 + i * 60,
                  height: 96 + i * 60,
                  animationDelay: `${(i - 1) * 0.4}s`,
                  animationDuration: `${1.8 + i * 0.3}s`,
                }}
              />
            ))}
            <div
              className={`relative w-32 h-32 rounded-full bg-gradient-to-br ${caller.color || 'from-pink-500 to-purple-600'} flex items-center justify-center text-white text-5xl font-bold shadow-2xl phone-ring`}
              style={{ boxShadow: '0 0 60px rgba(236,72,153,0.5)' }}
            >
              {caller.avatar || caller.name?.[0]?.toUpperCase() || 'M'}
            </div>
          </div>

          {/* Swipe-style buttons */}
          <div className="flex items-center justify-center gap-24">
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleDecline}
                className="w-[72px] h-[72px] rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/50 active:scale-95 transition-transform"
              >
                <PhoneOff size={30} className="text-white" />
              </button>
              <span className="text-slate-400 text-sm">Decline</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleAccept}
                className="w-[72px] h-[72px] rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/50 active:scale-95 transition-transform"
              >
                <Phone size={30} className="text-white" />
              </button>
              <span className="text-slate-400 text-sm">Accept</span>
            </div>
          </div>
        </div>
      ) : (
        /* ── Active Call Screen ──────────────────────────────── */
        <div className="flex flex-col items-center justify-between flex-1 p-8 pb-20">
          {/* Top info */}
          <div className="flex flex-col items-center gap-2 mt-16">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-emerald-400 text-sm tracking-[0.15em] uppercase font-medium">Connected</p>
            </div>
            <h2 className="text-3xl font-display font-bold text-white mt-2">{caller.name}</h2>
            <p className="text-slate-300 text-2xl font-mono font-light mt-1">{formatTime(timer)}</p>
          </div>

          {/* Avatar */}
          <div
            className={`w-32 h-32 rounded-full bg-gradient-to-br ${caller.color || 'from-pink-500 to-purple-600'} flex items-center justify-center text-white text-5xl font-bold shadow-2xl`}
            style={{ boxShadow: '0 0 60px rgba(236,72,153,0.4)' }}
          >
            {caller.avatar || caller.name?.[0]?.toUpperCase() || 'M'}
          </div>

          {/* Call controls */}
          <div className="w-full space-y-6">
            {/* Secondary controls */}
            <div className="flex items-center justify-center gap-10">
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => setMuted((m) => !m)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    muted ? 'bg-white/20' : 'bg-white/10'
                  }`}
                >
                  {muted ? <MicOff size={22} className="text-white" /> : <Mic size={22} className="text-white" />}
                </button>
                <span className="text-slate-500 text-xs">{muted ? 'Unmute' : 'Mute'}</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                  <Volume2 size={22} className="text-white" />
                </button>
                <span className="text-slate-500 text-xs">Speaker</span>
              </div>
            </div>

            {/* End call */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleDecline}
                className="w-[72px] h-[72px] rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/50 active:scale-95 transition-transform"
              >
                <PhoneOff size={30} className="text-white" />
              </button>
              <span className="text-slate-400 text-sm">End Call</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
