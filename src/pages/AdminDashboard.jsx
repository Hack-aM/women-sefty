import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, ShieldCheck, AlertCircle, FileText, MapPin,
  Camera, Play, RefreshCw, ChevronLeft, Check, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../hooks/useAdmin';
import { resolveSOSAlert } from '../firebase/firestore';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { stats, loading, refresh } = useAdmin();
  const [resolvingId, setResolvingId] = useState(null);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-400">
          <ShieldAlert size={32} />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl text-slate-100">Access Denied</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xs">
            This dashboard is restricted to administrators only.
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/')}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  const handleResolve = async (alertId) => {
    setResolvingId(alertId);
    try {
      await resolveSOSAlert(alertId);
      toast.success('SOS alert marked as resolved');
      refresh();
    } catch (err) {
      console.error('Resolve error:', err);
      toast.error('Failed to resolve alert');
    } finally {
      setResolvingId(null);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="px-4 pt-4 pb-6 space-y-6 max-w-4xl mx-auto lg:pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
          >
            <ChevronLeft size={20} className="text-slate-300" />
          </button>
          <div>
            <h1 className="font-display font-bold text-2xl text-slate-100 flex items-center gap-2">
              Admin Shield <span className="text-xs bg-pink-500/10 border border-pink-500/20 text-pink-400 font-bold px-2 py-0.5 rounded-full">Secure</span>
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">National Safety Monitoring Terminal</p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={`text-slate-300 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="w-full h-24 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
          ))}
        </div>
      ) : (
        <>
          {/* Stats overview */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card p-4 flex flex-col justify-between border-red-500/10 bg-red-500/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active SOS</span>
              <span className="text-3xl font-display font-bold text-red-400 mt-2">{stats?.activeSOS || 0}</span>
            </div>
            <div className="glass-card p-4 flex flex-col justify-between border-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total SOS</span>
              <span className="text-3xl font-display font-bold text-slate-200 mt-2">{stats?.totalSOS || 0}</span>
            </div>
            <div className="glass-card p-4 flex flex-col justify-between border-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Incidents</span>
              <span className="text-3xl font-display font-bold text-slate-200 mt-2">{stats?.totalIncidents || 0}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent SOS Alerts */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle size={16} className="text-red-400" /> Recent Emergency Alerts
              </h3>

              {stats?.recentSOS.length === 0 ? (
                <div className="glass-card p-6 text-center text-slate-500 text-xs border-dashed border-white/10">
                  No active or past SOS alerts recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {stats?.recentSOS.map((alert) => (
                    <GlassCard
                      key={alert.id}
                      className={`border-l-4 ${
                        alert.status === 'active' ? 'border-l-red-500 border-red-500/10 bg-red-500/[0.02]' : 'border-l-slate-600'
                      }`}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            alert.status === 'active' ? 'text-red-400' : 'text-slate-500'
                          }`}>
                            {alert.status === 'active' ? '🚨 Active Emergency' : 'Resolved'}
                          </span>
                          <span className="text-[10px] text-slate-500">{formatDate(alert.timestamp)}</span>
                        </div>

                        <div className="text-xs text-slate-300">
                          <p className="font-semibold">User ID: <span className="font-mono text-[10px] text-slate-400">{alert.uid.slice(0, 10)}...</span></p>
                        </div>

                        {alert.location && (
                          <a
                            href={`https://maps.google.com/?q=${alert.location.latitude},${alert.location.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-[10px] text-pink-400 font-semibold hover:underline"
                          >
                            <MapPin size={11} /> Open GPS Coordinates
                          </a>
                        )}

                        {alert.status === 'active' && (
                          <button
                            onClick={() => handleResolve(alert.id)}
                            disabled={resolvingId === alert.id}
                            className="mt-2 w-full py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
                          >
                            <Check size={12} /> Mark as Resolved
                          </button>
                        )}
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Incident Reports */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <FileText size={16} className="text-pink-400" /> Recent Incident Reports
              </h3>

              {stats?.recentIncidents.length === 0 ? (
                <div className="glass-card p-6 text-center text-slate-500 text-xs border-dashed border-white/10">
                  No incident reports submitted yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {stats?.recentIncidents.map((inc) => (
                    <GlassCard key={inc.id}>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded-md text-[10px] font-bold capitalize">
                            {inc.type}
                          </span>
                          <span className="text-[10px] text-slate-500">{formatDate(inc.timestamp)}</span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">{inc.description}</p>

                        {(inc.imageUrl || inc.audioUrl) && (
                          <div className="flex gap-2 mt-1">
                            {inc.imageUrl && (
                              <a
                                href={inc.imageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[9px] text-slate-300 hover:bg-white/10"
                              >
                                <Camera size={10} className="text-pink-400" /> Image Evidence
                              </a>
                            )}
                            {inc.audioUrl && (
                              <button
                                onClick={() => {
                                  const aud = new Audio(inc.audioUrl);
                                  aud.play();
                                }}
                                className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[9px] text-slate-300 hover:bg-white/10"
                              >
                                <Play size={10} className="text-pink-400" fill="currentColor" /> Play Audio
                              </button>
                            )}
                          </div>
                        )}

                        {inc.location && (
                          <a
                            href={`https://maps.google.com/?q=${inc.location.latitude},${inc.location.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-[9px] text-slate-500 hover:underline"
                          >
                            <MapPin size={9} /> GPS Location attached
                          </a>
                        )}
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
