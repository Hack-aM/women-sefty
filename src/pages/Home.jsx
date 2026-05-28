import { useNavigate } from 'react-router-dom';
import {
  Shield, MapPin, Phone, Users, PhoneCall,
  Volume2, Lightbulb, ChevronRight, AlertTriangle,
  Bot, Navigation, History, AlertOctagon, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useSiren } from '../hooks/useSiren';
import GlassCard from '../components/ui/GlassCard';

const quickActions = [
  { path: '/sos', icon: Shield, label: 'SOS', color: 'from-red-500 to-rose-600', glow: '0 0 24px rgba(239,68,68,0.5)' },
  { path: '/tracking', icon: MapPin, label: 'Track Me', color: 'from-blue-500 to-indigo-600', glow: '0 0 24px rgba(99,102,241,0.5)' },
  { path: '/nearby', icon: Phone, label: 'Help Lines', color: 'from-emerald-500 to-teal-600', glow: '0 0 24px rgba(16,185,129,0.5)' },
  { path: '/contacts', icon: Users, label: 'Contacts', color: 'from-purple-500 to-violet-600', glow: '0 0 24px rgba(168,85,247,0.5)' },
  { path: '/fakecall', icon: PhoneCall, label: 'Fake Call', color: 'from-amber-500 to-orange-600', glow: '0 0 24px rgba(245,158,11,0.5)' },
  { path: '/ai-safety', icon: Bot, label: 'AI Safety', color: 'from-cyan-500 to-blue-500', glow: '0 0 24px rgba(6,182,212,0.5)' },
];

const helplines = [
  { label: 'Women Helpline', number: '1091', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
  { label: 'Police', number: '100', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  { label: 'Ambulance', number: '108', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { label: 'Child Helpline', number: '1098', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
];

export default function Home() {
  const { profile, user, isAdmin } = useAuth();
  const { sosActive, currentLocation, isTracking } = useApp();
  const { sirenOn, toggleSiren } = useSiren();
  const navigate = useNavigate();
  const name = profile?.displayName || user?.displayName || 'Friend';
  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const actionsToRender = [
    ...quickActions,
    { path: '/report', icon: AlertOctagon, label: 'Report Incident', color: 'from-pink-500/20 to-rose-500/20 border border-pink-500/20', glow: '0 0 24px rgba(236,72,153,0.2)' },
    { path: '/history', icon: History, label: 'Emergency Log', color: 'from-slate-500/20 to-slate-600/20 border border-slate-500/20', glow: '0 0 24px rgba(100,116,139,0.2)' },
  ];

  if (isAdmin) {
    actionsToRender.push({
      path: '/admin',
      icon: ShieldAlert,
      label: 'Admin Shield',
      color: 'from-red-500/20 to-rose-600/20 border border-red-500/30 text-red-400',
      glow: '0 0 24px rgba(239,68,68,0.3)'
    });
  }

  return (
    <div className="px-4 pt-4 pb-6 space-y-6 max-w-2xl mx-auto lg:pt-6">

      {/* Header */}
      <div>
        <p className="text-slate-500 text-sm">{greeting},</p>
        <h2 className="font-display font-bold text-2xl text-slate-100 mt-0.5">
          {name} <span className="text-pink-400">💖</span>
        </h2>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-500">SafeHer Active</span>
          </div>
          {isTracking && (
            <div className="flex items-center gap-1.5">
              <Navigation size={10} className="text-blue-400" />
              <span className="text-xs text-blue-400">Tracking On</span>
            </div>
          )}
          {currentLocation && (
            <span className="text-xs text-slate-600 font-mono">
              {currentLocation.latitude.toFixed(3)}, {currentLocation.longitude.toFixed(3)}
            </span>
          )}
        </div>
      </div>

      {/* SOS Active Banner */}
      {sosActive && (
        <button
          onClick={() => navigate('/sos')}
          className="w-full glass-card p-4 border border-red-500/30 bg-red-500/5 flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="text-red-400 animate-pulse" size={20} />
          </div>
          <div className="flex-1">
            <p className="text-red-400 font-semibold text-sm">🚨 SOS Alert Active</p>
            <p className="text-slate-400 text-xs">Emergency contacts have been notified — tap to manage</p>
          </div>
          <ChevronRight size={16} className="text-red-400" />
        </button>
      )}

      {/* Quick SOS Button — prominent */}
      {!sosActive && (
        <button
          onClick={() => navigate('/sos')}
          className="w-full relative overflow-hidden rounded-3xl p-5 flex items-center gap-4 group"
          style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(190,18,60,0.10))',
            border: '1px solid rgba(239,68,68,0.25)',
            boxShadow: '0 8px 32px rgba(239,68,68,0.15)',
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center shadow-lg flex-shrink-0 group-hover:scale-105 transition-transform"
            style={{ boxShadow: '0 0 30px rgba(239,68,68,0.5)' }}
          >
            <Shield size={26} className="text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-display font-bold text-lg text-white">SOS Emergency</p>
            <p className="text-red-300/70 text-sm">Hold 3 seconds to activate alert</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-6 h-0.5 rounded-full bg-red-500/40" style={{ width: `${i * 6}px` }} />
            ))}
          </div>
        </button>
      )}

      {/* Quick Actions Grid */}
      <div>
        <h3 className="section-heading">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-3">
          {actionsToRender.map(({ path, icon: Icon, label, color, glow }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="glass-card p-4 flex flex-col items-center gap-3 transition-all duration-200 hover:border-white/15 active:scale-95"
            >
              <div
                className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center`}
                style={{ boxShadow: glow }}
              >
                <Icon size={22} className="text-white" />
              </div>
              <span className="text-xs font-semibold text-slate-300 text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Emergency Siren */}
      <GlassCard
        onClick={toggleSiren}
        className={`flex items-center gap-4 transition-all duration-300 ${sirenOn ? 'border-red-500/30 bg-red-500/5' : ''}`}
      >
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${sirenOn ? 'bg-red-500 shadow-lg animate-pulse' : 'bg-white/5'
          }`} style={sirenOn ? { boxShadow: '0 0 30px rgba(239,68,68,0.6)' } : {}}>
          <Volume2 size={22} className={sirenOn ? 'text-white' : 'text-slate-400'} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-100 text-sm">Emergency Siren</p>
          <p className="text-xs text-slate-500">{sirenOn ? 'ACTIVE — Tap to stop alarm' : 'Tap to activate loud alarm'}</p>
        </div>
        <div className={`w-12 h-6 rounded-full transition-all duration-300 relative flex-shrink-0 ${sirenOn ? 'bg-red-500' : 'bg-white/10'}`}>
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${sirenOn ? 'left-[26px]' : 'left-0.5'}`} />
        </div>
      </GlassCard>

      {/* Emergency Helplines */}
      <div>
        <h3 className="section-heading">Emergency Helplines</h3>
        <div className="grid grid-cols-2 gap-3">
          {helplines.map(({ label, number, color, bg }) => (
            <a
              key={number}
              href={`tel:${number}`}
              className={`glass-card p-4 flex flex-col gap-1.5 hover:border-white/15 transition-all active:scale-95 border ${bg}`}
            >
              <span className={`text-2xl font-display font-bold ${color}`}>{number}</span>
              <span className="text-xs text-slate-400">{label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Safety Tips quick link */}
      <button
        onClick={() => navigate('/tips')}
        className="w-full glass-card p-4 flex items-center gap-3 border-purple-500/10 hover:border-purple-500/20 transition-all"
      >
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center flex-shrink-0">
          <Lightbulb size={18} className="text-white" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-slate-200">Daily Safety Tips</p>
          <p className="text-xs text-slate-500">Self-defense, cyber safety & more</p>
        </div>
        <ChevronRight size={16} className="text-slate-600" />
      </button>
    </div>
  );
}
