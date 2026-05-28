import { useEffect, useState, useRef } from 'react';
import {
  Shield, Clock, MapPin, CheckCircle, ChevronLeft, Calendar,
  ChevronDown, ChevronUp, Play, FileAudio, Activity, Volume2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSOSHistory, getSOSBreadcrumbs, getSOSLogs } from '../firebase/firestore';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

export default function SOSHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Expansion and detail states
  const [expandedId, setExpandedId] = useState(null);
  const [breadcrumbsMap, setBreadcrumbsMap] = useState({}); // alertId -> array
  const [logsMap, setLogsMap] = useState({}); // alertId -> array
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Audio player state
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const fetchHistory = async () => {
      try {
        const data = await getSOSHistory(user.uid);
        setHistory(data);
      } catch (err) {
        console.error('Error fetching SOS history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [user]);

  const handleExpand = async (alertId) => {
    if (expandedId === alertId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(alertId);

    // Fetch details if not already loaded
    if (!breadcrumbsMap[alertId] || !logsMap[alertId]) {
      setLoadingDetails(true);
      try {
        const [crumbs, logs] = await Promise.all([
          getSOSBreadcrumbs(alertId),
          getSOSLogs(alertId)
        ]);
        setBreadcrumbsMap(prev => ({ ...prev, [alertId]: crumbs }));
        setLogsMap(prev => ({ ...prev, [alertId]: logs }));
      } catch (err) {
        console.error('Error loading history details:', err);
        toast.error('Failed to load logs/breadcrumbs.');
      } finally {
        setLoadingDetails(false);
      }
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (alert) => {
    if (!alert.timestamp || !alert.resolvedAt) return null;
    const start = alert.timestamp.toDate ? alert.timestamp.toDate() : new Date(alert.timestamp);
    const end = alert.resolvedAt.toDate ? alert.resolvedAt.toDate() : new Date(alert.resolvedAt);
    
    const diffMs = end - start;
    const diffSec = Math.floor(diffMs / 1000);
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const toggleAudio = (alertId, audioUrl) => {
    if (playingAudioId === alertId) {
      audioRef.current.pause();
      setPlayingAudioId(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setPlayingAudioId(null);
      audioRef.current.play();
      setPlayingAudioId(alertId);
    }
  };

  // Canvas drawing ref handler
  const renderCanvas = (alertId, crumbs) => {
    if (!crumbs || crumbs.length === 0) return null;

    return (canvas) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      const lats = crumbs.map(c => c.latitude);
      const lngs = crumbs.map(c => c.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      const latSpan = maxLat - minLat || 0.001;
      const lngSpan = maxLng - minLng || 0.001;

      const toCanvas = (lat, lng) => {
        const padding = 25;
        const x = padding + ((lng - minLng) / lngSpan) * (width - 2 * padding);
        const y = height - (padding + ((lat - minLat) / latSpan) * (height - 2 * padding));
        return { x, y };
      };

      // Draw Path
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      crumbs.forEach((crumb, i) => {
        const { x, y } = toCanvas(crumb.latitude, crumb.longitude);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Start/End points
      const start = toCanvas(crumbs[0].latitude, crumbs[0].longitude);
      ctx.fillStyle = '#10b981'; // Green for start
      ctx.beginPath(); ctx.arc(start.x, start.y, 5, 0, 2*Math.PI); ctx.fill();

      const end = toCanvas(crumbs[crumbs.length-1].latitude, crumbs[crumbs.length-1].longitude);
      ctx.fillStyle = '#ef4444'; // Red for end
      ctx.beginPath(); ctx.arc(end.x, end.y, 5, 0, 2*Math.PI); ctx.fill();
    };
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  return (
    <div className="px-4 pt-4 pb-6 space-y-6 max-w-2xl mx-auto lg:pt-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
        >
          <ChevronLeft size={20} className="text-slate-300" />
        </button>
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-100">Emergency Log</h1>
          <p className="text-slate-400 text-sm mt-0.5">Timeline and evidence details of previous alerts</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="w-full h-32 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="glass-card p-8 text-center flex flex-col items-center justify-center gap-4 border-dashed border-white/10">
          <div className="w-16 h-16 rounded-full bg-slate-500/10 flex items-center justify-center border border-slate-500/20">
            <Shield size={28} className="text-slate-400" />
          </div>
          <div>
            <h3 className="text-slate-300 font-semibold text-base">No Emergency Logs Recorded</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-xs leading-relaxed">
              Your SOS logs will appear here. We hope you never have to see any logs here!
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((alert) => {
            const isExpanded = expandedId === alert.id;
            const crumbs = breadcrumbsMap[alert.id] || [];
            const logs = logsMap[alert.id] || [];
            const duration = calculateDuration(alert);

            return (
              <GlassCard
                key={alert.id}
                className={`border-l-4 transition-all duration-300 ${
                  alert.status === 'active' ? 'border-l-red-500 border-red-500/20' : 'border-l-emerald-500 border-emerald-500/20'
                }`}
              >
                <div className="flex flex-col gap-3">
                  {/* Title Bar */}
                  <div
                    className="flex items-center justify-between cursor-pointer select-none"
                    onClick={() => handleExpand(alert.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Shield size={16} className={alert.status === 'active' ? 'text-red-400' : 'text-emerald-400'} />
                      <span className={`text-xs font-bold uppercase tracking-wider ${
                        alert.status === 'active' ? 'text-red-400' : 'text-emerald-400'
                      }`}>
                        {alert.status === 'active' ? 'Active Alert' : 'Resolved Alert'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                        <Calendar size={12} />
                        <span>{formatDate(alert.timestamp)}</span>
                      </div>
                      {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                  </div>

                  {/* Summary coordinates & contacts */}
                  {!isExpanded && (
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <p className="truncate max-w-[200px]">
                        {alert.location
                          ? `📍 Location: ${alert.location.latitude.toFixed(4)}, ${alert.location.longitude.toFixed(4)}`
                          : 'Location not recorded'}
                      </p>
                      {alert.contacts && (
                        <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded border border-white/5">
                          {alert.contacts.length} Contacts
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="border-t border-white/5 pt-4 space-y-4 animate-slide-down">
                      {loadingDetails ? (
                        <div className="flex items-center justify-center py-6 gap-2 text-xs text-slate-500">
                          <div className="w-4 h-4 rounded-full border-t border-pink-400 animate-spin" />
                          Loading session breadcrumbs and event history...
                        </div>
                      ) : (
                        <>
                          {/* Duration & Audio Evidence Row */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col justify-between">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <Clock size={11} /> Duration
                              </span>
                              <span className="text-lg font-bold text-slate-300 mt-2">
                                {duration || 'N/A'}
                              </span>
                            </div>

                            <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col justify-between">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <Volume2 size={11} /> Evidence
                              </span>
                              {alert.audioUrl ? (
                                <button
                                  onClick={() => toggleAudio(alert.id, alert.audioUrl)}
                                  className="mt-2 py-1.5 bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-bold rounded-lg hover:bg-pink-500/20 transition-all flex items-center justify-center gap-1.5"
                                >
                                  <Play size={11} fill="currentColor" className={playingAudioId === alert.id ? 'animate-ping' : ''} />
                                  {playingAudioId === alert.id ? 'Pause' : 'Play Audio'}
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-600 mt-2 italic">No audio recorded</span>
                              )}
                            </div>
                          </div>

                          {/* Map Traced Path Canvas */}
                          {crumbs.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <MapPin size={10} /> Traced Breadcrumb Route
                              </p>
                              <div className="relative rounded-xl overflow-hidden bg-slate-950/80 border border-white/5">
                                <canvas
                                  ref={renderCanvas(alert.id, crumbs)}
                                  width={400}
                                  height={150}
                                  className="w-full aspect-[8/3]"
                                />
                              </div>
                            </div>
                          )}

                          {/* Logs / Event timeline list */}
                          <div className="space-y-2">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <Activity size={10} /> Session Log events
                            </p>
                            <div className="border-l border-white/10 ml-1.5 pl-3.5 space-y-3 py-1">
                              {logs.map((log, i) => (
                                <div key={i} className="relative text-[11px] text-slate-400">
                                  {/* Dot */}
                                  <div className="absolute -left-[20px] top-1 w-2 h-2 rounded-full bg-pink-500/50 border border-pink-500" />
                                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                                    <span className="font-semibold">{log.event}</span>
                                    <span className="font-mono text-[9px]">
                                      {new Date(log.timestamp?.toDate ? log.timestamp.toDate() : log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                  </div>
                                  {log.details && (
                                    <p className="text-[9px] bg-white/[0.01] border border-white/5 p-1 rounded font-mono text-slate-500">
                                      {JSON.stringify(log.details)}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Contacts Notified details */}
                          {alert.contacts && alert.contacts.length > 0 && (
                            <div className="pt-2 border-t border-white/5">
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-2">Trusted Contacts Alert Status</p>
                              <div className="flex flex-wrap gap-2">
                                {alert.contacts.map((c, idx) => (
                                  <div key={idx} className="flex items-center gap-2 px-2.5 py-1 bg-white/5 border border-white/5 rounded-xl text-[10px] text-slate-300">
                                    <span>{c.name}</span>
                                    <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border ${
                                      c.status === 'acknowledged' ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400' :
                                      c.status === 'viewed' ? 'bg-indigo-500/15 border-indigo-500/20 text-indigo-400' :
                                      'bg-slate-500/10 border-slate-500/20 text-slate-500'
                                    }`}>
                                      {c.status || 'sent'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Google Maps link button */}
                          {alert.location && (
                            <a
                              href={`https://maps.google.com/?q=${alert.location.latitude},${alert.location.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-300 transition-all"
                            >
                              <MapPin size={12} className="text-pink-400" /> Open Final GPS Location
                            </a>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
