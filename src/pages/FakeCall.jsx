import { useState } from 'react';
import { PhoneCall, Clock, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useContacts } from '../hooks/useContacts';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';

const defaultCallerProfiles = [
  { id: 1, name: 'Mom',             number: '+91 98765 43210', delay: 5,  avatar: 'M', color: 'from-pink-500 to-rose-500' },
  { id: 2, name: 'Sister Priya',    number: '+91 87654 32109', delay: 10, avatar: 'P', color: 'from-purple-500 to-violet-600' },
  { id: 3, name: 'Friend Neha',     number: '+91 76543 21098', delay: 15, avatar: 'N', color: 'from-blue-500 to-indigo-600' },
  { id: 4, name: 'Office Security', number: '+91 11223 34455', delay: 20, avatar: 'O', color: 'from-emerald-500 to-teal-600' },
  { id: 5, name: 'Boss Sir',        number: '+91 99887 76655', delay: 30, avatar: 'B', color: 'from-amber-500 to-orange-500' },
];

const COLORS = [
  'from-pink-500 to-rose-500',
  'from-purple-500 to-violet-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-500',
];

export default function FakeCall() {
  const { setFakeCall, setSelectedCaller } = useApp();
  const { contacts } = useContacts();
  const [scheduled, setScheduled] = useState(false);
  const [countdown, setCountdown] = useState(null);

  // Custom caller states
  const [useCustom, setUseCustom] = useState(false);
  const [customName, setCustomName] = useState('Safety Support');
  const [customNumber, setCustomNumber] = useState('+91 99999 88888');
  const [customDelay, setCustomDelay] = useState(10); // seconds

  // Merge real contacts + defaults (real contacts first)
  const callerProfiles = [
    ...contacts.slice(0, 3).map((c, i) => ({
      id: `real-${c.id}`,
      name: c.name,
      number: c.phone,
      delay: [5, 10, 15][i],
      avatar: c.name?.[0]?.toUpperCase() || '?',
      color: COLORS[i % COLORS.length],
    })),
    ...defaultCallerProfiles.slice(contacts.length > 0 ? contacts.length : 0),
  ].slice(0, 5);

  const [selected, setSelected] = useState(callerProfiles[0]);

  const activeProfile = useCustom
    ? {
        id: 'custom',
        name: customName || 'Unknown Caller',
        number: customNumber || 'Private Number',
        delay: customDelay,
        avatar: (customName?.[0] || '?').toUpperCase(),
        color: 'from-pink-600 to-indigo-600 border border-pink-500/25',
      }
    : selected;

  const scheduleFakeCall = () => {
    const secs = activeProfile.delay;
    setScheduled(true);
    setCountdown(secs);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setScheduled(false);
          setCountdown(null);
          setSelectedCaller(activeProfile);
          setFakeCall(true);
          return null;
        }
        return c - 1;
      });
    }, 1000);
  };

  const triggerNow = () => {
    setSelectedCaller(activeProfile);
    setFakeCall(true);
  };

  const cancelSchedule = () => {
    setScheduled(false);
    setCountdown(null);
  };

  return (
    <div className="px-4 pt-4 pb-6 space-y-6 max-w-2xl mx-auto lg:pt-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-100">Fake Call</h1>
        <p className="text-slate-400 text-sm mt-1">Simulate an incoming call to escape uncomfortable situations</p>
      </div>

      {/* How it works */}
      <GlassCard className="border-pink-500/20">
        <h3 className="text-sm font-semibold text-pink-400 mb-3">How it works</h3>
        <div className="grid grid-cols-2 gap-3">
          {['Choose/Set caller', 'Set delay time', 'Tap "Schedule"', 'Fake call appears'].map((tip, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <span className="text-xs text-slate-400">{tip}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Caller selection / Custom toggle */}
      <div className="space-y-4">
        <div className="flex items-center justify-between glass-card p-4 border-white/5">
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-slate-200">Custom Caller Details</h4>
            <p className="text-xs text-slate-500">Configure custom caller identity and delay</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useCustom}
              onChange={() => setUseCustom(!useCustom)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500" />
          </label>
        </div>

        {useCustom ? (
          <GlassCard className="space-y-4 border-pink-500/10">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Caller Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Boss, Sister"
                  className="w-full rounded-xl bg-white/5 border border-white/5 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Caller Number</label>
                <input
                  type="text"
                  value={customNumber}
                  onChange={(e) => setCustomNumber(e.target.value)}
                  placeholder="e.g. +91 99999 88888"
                  className="w-full rounded-xl bg-white/5 border border-white/5 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500/30"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                <span>Delay Time</span>
                <span className="text-pink-400 font-mono font-bold">{customDelay} seconds</span>
              </label>
              <input
                type="range"
                min="3"
                max="300"
                step="1"
                value={customDelay}
                onChange={(e) => setCustomDelay(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />
              <div className="flex justify-between text-[9px] text-slate-600 font-mono">
                <span>3s (Min)</span>
                <span>60s</span>
                <span>120s</span>
                <span>300s (5m)</span>
              </div>
            </div>
          </GlassCard>
        ) : (
          <div>
            <h3 className="section-heading">Choose Caller Preset</h3>
            <div className="space-y-2">
              {callerProfiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => setSelected(profile)}
                  className={`w-full glass-card p-4 flex items-center gap-4 transition-all duration-200 text-left ${
                    selected.id === profile.id ? 'border-pink-500/40 bg-pink-500/5' : 'hover:border-white/10'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${profile.color} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                    {profile.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-100 text-sm">{profile.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{profile.number}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock size={11} />
                      <span>{profile.delay}s</span>
                    </div>
                    {selected.id === profile.id && (
                      <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Countdown / Buttons */}
      {scheduled ? (
        <div className="glass-card p-6 flex flex-col items-center gap-4 border-amber-500/30">
          <Clock size={32} className="text-amber-400" />
          <div className="text-center">
            <p className="text-slate-300 font-semibold">Call incoming in</p>
            <p className="text-6xl font-display font-bold gradient-text mt-2">{countdown}</p>
            <p className="text-slate-500 text-sm mt-1">from <span className="text-slate-300">{activeProfile.name}</span></p>
          </div>
          <div className="flex gap-1 max-w-full overflow-hidden px-4">
            {Array.from({ length: Math.min(activeProfile.delay, 30) }).map((_, i) => (
              <div
                key={i}
                className={`h-1 w-2 rounded-full transition-colors duration-200 ${
                  i < ((activeProfile.delay - countdown) * (30 / activeProfile.delay)) ? 'bg-pink-500' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <Button variant="ghost" onClick={cancelSchedule} size="sm">Cancel</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Button fullWidth size="lg" onClick={scheduleFakeCall}>
            <PhoneCall size={20} /> Schedule Call ({activeProfile.delay}s delay)
          </Button>
          <Button fullWidth variant="ghost" onClick={triggerNow}>
            <Zap size={18} /> Call Now (Instant)
          </Button>
        </div>
      )}

      <GlassCard>
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          🔒 This feature is for personal safety only. Use it to safely exit threatening situations.
        </p>
      </GlassCard>
    </div>
  );
}
