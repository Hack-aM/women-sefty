import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield, MapPin, Clock, Users, Play, Radio, Volume2, CheckCircle2,
  FileAudio, Activity, ChevronRight, CheckSquare, Eye, Award
} from 'lucide-react';
import {
  subscribeToSOSAlert,
  subscribeToSOSLogs,
  subscribeToSOSBreadcrumbs,
  updateContactStatusInAlert
} from '../firebase/firestore';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

export default function SOSPortal() {
  const { alertId } = useParams();
  const navigate = useNavigate();

  // Real-time states
  const [alert, setAlert] = useState(null);
  const [logs, setLogs] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Identity state
  const [selectedContact, setSelectedContact] = useState(() => {
    return localStorage.getItem(`safeher_portal_identity_${alertId}`) || '';
  });
  const [showIdentityModal, setShowIdentityModal] = useState(false);

  // Audio player state
  const [playingAudio, setPlayingAudio] = useState(false);
  const audioRef = useRef(null);

  // Canvas ref for breadcrumbs map rendering
  const canvasRef = useRef(null);

  // Subscribe to Firestore updates
  useEffect(() => {
    if (!alertId) return;

    setLoading(true);

    const unsubAlert = subscribeToSOSAlert(alertId, (data) => {
      setAlert(data);
      setLoading(false);

      // Automatically register 'viewed' status when a known contact opens the page
      const savedPhone = localStorage.getItem(`safeher_portal_identity_${alertId}`);
      if (savedPhone && data.status === 'active') {
        const contact = data.contacts?.find(c => c.phone === savedPhone);
        if (contact && contact.status === 'sent') {
          updateContactStatusInAlert(alertId, savedPhone, 'viewed').catch(console.error);
        }
      }
    });

    const unsubLogs = subscribeToSOSLogs(alertId, (data) => {
      setLogs(data);
    });

    const unsubCrumbs = subscribeToSOSBreadcrumbs(alertId, (data) => {
      setBreadcrumbs(data);
    });

    return () => {
      unsubAlert();
      unsubLogs();
      unsubCrumbs();
    };
  }, [alertId]);

  // Render path on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || breadcrumbs.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Find bounding box of coordinates to scale dynamically
    const lats = breadcrumbs.map(b => b.latitude);
    const lngs = breadcrumbs.map(b => b.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latSpan = maxLat - minLat || 0.001;
    const lngSpan = maxLng - minLng || 0.001;

    // Function to convert GPS coordinates to Canvas XY
    const toCanvasCoords = (lat, lng) => {
      const padding = 40;
      // Flip Y because canvas origin is top-left
      const x = padding + ((lng - minLng) / lngSpan) * (width - 2 * padding);
      const y = height - (padding + ((lat - minLat) / latSpan) * (height - 2 * padding));
      return { x, y };
    };

    // Draw path line
    ctx.strokeStyle = '#ec4899'; // SafeHer pink
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(236, 72, 153, 0.5)';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    breadcrumbs.forEach((crumb, idx) => {
      const { x, y } = toCanvasCoords(crumb.latitude, crumb.longitude);
      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw breadcrumb markers (past dots)
    breadcrumbs.forEach((crumb, idx) => {
      if (idx === breadcrumbs.length - 1) return; // skip latest
      const { x, y } = toCanvasCoords(crumb.latitude, crumb.longitude);
      ctx.fillStyle = 'rgba(236, 72, 153, 0.4)';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw latest victim dot (pulsing radar)
    const latestCrumb = breadcrumbs[breadcrumbs.length - 1];
    const { x: curX, y: curY } = toCanvasCoords(latestCrumb.latitude, latestCrumb.longitude);

    // Pulsing outer ring
    const pulseRadius = 12 + (Date.now() % 1000) / 100 * 1.5;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(curX, curY, pulseRadius, 0, 2 * Math.PI);
    ctx.stroke();

    // Solid inner red dot
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(curX, curY, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label coordinates
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '10px monospace';
    ctx.fillText(`${latestCrumb.latitude.toFixed(5)}, ${latestCrumb.longitude.toFixed(5)}`, curX + 10, curY - 5);

  }, [breadcrumbs]);

  const handleAcknowledge = async () => {
    if (!selectedContact) {
      setShowIdentityModal(true);
      return;
    }

    try {
      await updateContactStatusInAlert(alertId, selectedContact, 'acknowledged');
      toast.success('Your acknowledgement has been logged. The victim is notified! 🛡️');
    } catch (err) {
      console.error(err);
      toast.error('Failed to log acknowledgement.');
    }
  };

  const handleSelectIdentity = async (phone) => {
    localStorage.setItem(`safeher_portal_identity_${alertId}`, phone);
    setSelectedContact(phone);
    setShowIdentityModal(false);
    toast.success('Identity saved! Marking alert as viewed.');
    if (alert?.status === 'active') {
      try {
        await updateContactStatusInAlert(alertId, phone, 'viewed');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const toggleAudio = () => {
    if (playingAudio) {
      audioRef.current.pause();
      setPlayingAudio(false);
    } else {
      audioRef.current = new Audio(alert.audioUrl);
      audioRef.current.onended = () => setPlayingAudio(false);
      audioRef.current.play();
      setPlayingAudio(true);
    }
  };

  const calculateDuration = () => {
    if (!alert) return '0s';
    const start = alert.timestamp?.toDate ? alert.timestamp.toDate() : new Date(alert.timestamp);
    const end = alert.resolvedAt
      ? (alert.resolvedAt.toDate ? alert.resolvedAt.toDate() : new Date(alert.resolvedAt))
      : new Date();
    
    const diffMs = end - start;
    const diffSec = Math.floor(diffMs / 1000);
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center gap-4 bg-dark-400">
        <div className="w-10 h-10 rounded-full border-t-2 border-pink-500 animate-spin" />
        <p className="text-slate-400 text-xs font-semibold">Connecting to live emergency feed...</p>
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center gap-4 bg-dark-400">
        <div className="w-16 h-16 rounded-full bg-slate-500/10 flex items-center justify-center text-slate-400">
          <Shield size={32} />
        </div>
        <div>
          <h1 className="font-display font-bold text-lg text-slate-100">Emergency Alert Expired</h1>
          <p className="text-slate-500 text-xs mt-1 max-w-xs leading-relaxed">
            The link you followed is invalid, or the emergency session has expired.
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/login')}>
          Go to SafeHer Portal
        </Button>
      </div>
    );
  }

  const selectedName = alert.contacts?.find(c => c.phone === selectedContact)?.name || '';

  return (
    <div className="min-h-dvh bg-dark-400 px-4 py-8 max-w-lg mx-auto space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shadow-glow-pink">
            <Shield size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="font-display font-black text-xl text-slate-100 flex items-center gap-1.5">
              SafeHer Portal <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">EMERGENCY</span>
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">Real-time Emergency Response System</p>
          </div>
        </div>
        <span className={`text-[10px] uppercase font-bold border px-2.5 py-1 rounded-full ${
          alert.status === 'active' ? 'bg-red-500/15 border-red-500/20 text-red-400 animate-pulse' : 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400'
        }`}>
          {alert.status === 'active' ? '🟢 Active' : 'Resolved'}
        </span>
      </div>

      {/* Identity status banner */}
      {selectedContact ? (
        <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Viewing as contact: <strong className="text-pink-400">{selectedName}</strong></span>
          <button
            onClick={() => setShowIdentityModal(true)}
            className="text-pink-400 font-bold hover:underline"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col gap-2.5 text-center items-center">
          <p className="text-xs text-amber-300 font-medium">Identify yourself to send acknowledgements to the victim</p>
          <button
            onClick={() => setShowIdentityModal(true)}
            className="px-4 py-1.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold rounded-xl hover:bg-amber-500/30 transition-all"
          >
            Choose My Contact Identity
          </button>
        </div>
      )}

      {/* Main Acknowledge Action Button */}
      {alert.status === 'active' && (
        <div className="flex gap-2">
          <Button
            variant="danger"
            fullWidth
            size="lg"
            onClick={handleAcknowledge}
            className="shadow-glow-pink flex items-center justify-center gap-2"
          >
            <CheckSquare size={20} /> Acknowledge Emergency
          </Button>
        </div>
      )}

      {/* Live coordinates / Map preview */}
      <GlassCard className="p-0 overflow-hidden relative">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Radio size={12} className="text-pink-400 animate-pulse" /> Live Tracking Session
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {breadcrumbs.length} Coordinates logged
          </span>
        </div>

        {breadcrumbs.length > 0 ? (
          <canvas
            ref={canvasRef}
            width={440}
            height={240}
            className="w-full bg-slate-950/80 aspect-[16/9]"
          />
        ) : (
          <div className="aspect-[16/9] bg-slate-950/80 flex flex-col items-center justify-center text-slate-600 gap-2 p-6">
            <MapPin size={24} />
            <p className="text-xs text-center">Awaiting continuous GPS stream...</p>
          </div>
        )}

        <div className="p-4 bg-white/[0.01] border-t border-white/5 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Last tracked coordinate:</span>
            <span className="font-mono text-slate-300 font-semibold">
              {alert.location?.latitude?.toFixed(6)}, {alert.location?.longitude?.toFixed(6)}
            </span>
          </div>

          <a
            href={alert.location ? `https://maps.google.com/?q=${alert.location.latitude},${alert.location.longitude}` : '#'}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-slate-300 transition-all"
          >
            <MapPin size={14} className="text-pink-400" /> Open in Google Maps
          </a>
        </div>
      </GlassCard>

      {/* Emergency Duration and Audio Evidence */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="flex flex-col justify-between p-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={11} /> Duration
          </span>
          <span className="text-2xl font-display font-black text-slate-200 mt-2">{calculateDuration()}</span>
        </GlassCard>

        <GlassCard className="flex flex-col justify-between p-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Volume2 size={11} /> Evidence
          </span>
          {alert.audioUrl ? (
            <button
              onClick={toggleAudio}
              className="mt-2 py-2 bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-bold rounded-xl hover:bg-pink-500/20 transition-all flex items-center justify-center gap-1.5"
            >
              <Play size={12} fill="currentColor" className={playingAudio ? 'animate-ping' : ''} />
              {playingAudio ? 'Pause' : 'Play Audio'}
            </button>
          ) : (
            <span className="text-xs text-slate-600 mt-2 font-medium italic">No audio saved yet</span>
          )}
        </GlassCard>
      </div>

      {/* Trusted Circle status */}
      <GlassCard className="space-y-3">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
          <Users size={13} className="text-pink-400" /> Trusted Circle Sync
        </span>
        <div className="space-y-2">
          {alert.contacts?.map((c, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-1">
              <div>
                <p className="font-semibold text-slate-300">{c.name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{c.phone}</p>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                c.status === 'acknowledged' ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400' :
                c.status === 'viewed' ? 'bg-indigo-500/15 border-indigo-500/20 text-indigo-400' :
                'bg-slate-500/10 border-slate-500/20 text-slate-600'
              }`}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Dispatch Timeline Logs */}
      <GlassCard className="space-y-4">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
          <Activity size={13} className="text-pink-400" /> Dispatch Timeline Logs
        </span>
        <div className="relative border-l border-white/10 ml-2 pl-4 space-y-4 py-1">
          {logs.map((log, i) => (
            <div key={i} className="relative text-xs text-slate-400">
              {/* Dot */}
              <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-pink-500/50 border border-pink-500" />
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                <span className="font-semibold">{log.event}</span>
                <span className="font-mono">
                  {new Date(log.timestamp?.toDate ? log.timestamp.toDate() : log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              {log.details && (
                <p className="text-[10px] bg-white/[0.02] border border-white/5 p-1.5 rounded-lg text-slate-500 font-mono">
                  {JSON.stringify(log.details)}
                </p>
              )}
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-xs text-slate-600 italic">No events logged yet.</p>
          )}
        </div>
      </GlassCard>

      {/* Identity Choice Modal */}
      {showIdentityModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-dark-400/90 backdrop-blur-md px-6">
          <div className="glass-card w-full max-w-sm p-6 space-y-4 border border-white/10">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <span className="text-sm font-bold text-slate-200">Confirm Your Identity</span>
              <button onClick={() => setShowIdentityModal(false)} className="text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Please choose which emergency contact you are to mark status updates correctly:
            </p>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {alert.contacts?.map((c, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectIdentity(c.phone)}
                  className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-slate-300 flex justify-between items-center transition-all"
                >
                  <div>
                    <p className="font-semibold text-slate-200">{c.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{c.phone}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-500" />
                </button>
              ))}
              {(!alert.contacts || alert.contacts.length === 0) && (
                <p className="text-xs text-center text-slate-600 italic py-2">No contact options found in this alert.</p>
              )}
            </div>

            <Button variant="ghost" fullWidth onClick={() => setShowIdentityModal(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
