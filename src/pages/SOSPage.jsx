import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, X, Phone, AlertTriangle, MessageCircle, Mic, MicOff, Users,
  CheckCircle, Radio, Sparkles, Activity, ShieldAlert, Clock, RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { useSiren } from '../hooks/useSiren';
import { useContacts } from '../hooks/useContacts';
import { useVoiceTrigger } from '../hooks/useVoiceTrigger';
import { useSmartDetection } from '../hooks/useSmartDetection';
import {
  resolveSOSAlert,
  updateSOSAlertAudio,
  addSOSLogEvent,
  subscribeToSOSAlert,
  subscribeToSOSLogs
} from '../firebase/firestore';
import {
  initiateSOSAlertWorkflow,
  startActiveSOSTracking,
  stopActiveSOSTracking
} from '../services/sosService';
import { uploadSOSAudioWithProgress } from '../services/storageService';
import { triggerHapticFeedback, cancelHapticFeedback } from '../utils/emergencyHelpers';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const HOLD_DURATION = 3000;

// Web Audio synthesizer for chime alerts
const playChime = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';

    // Play a high-pitched alert chime
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    console.warn('Synth chime failed:', e);
  }
};

export default function SOSPage() {
  const { sosActive, sosAlertId, activateSOS, deactivateSOS } = useApp();
  const { user } = useAuth();
  const { currentLocation } = useGeolocation();
  const { startSiren, stopSiren } = useSiren();
  const { contacts } = useContacts();

  // Holding & loading states
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [holdTimer, setHoldTimer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activated, setActivated] = useState(false);

  // Audio recording during active SOS
  const [recording, setRecording] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);

  // Voice monitoring state
  const [voiceMonitoring, setVoiceMonitoring] = useState(false);

  // Live Emergency Sync States
  const [activeAlertData, setActiveAlertData] = useState(null);
  const [activeLogs, setActiveLogs] = useState([]);
  
  // Smart detection and settings
  const [timerDuration, setTimerDuration] = useState(30); // default 30s check-in timer
  const [enteredPin, setEnteredPin] = useState('');

  const sosStartTimeRef = useRef(null);

  // ── Smart Safety Detection Hook ─────────────────────────────────────────
  const triggerSOS = useCallback(async (reason = 'Manual Hold-to-Activate') => {
    setHolding(false);
    setProgress(0);
    setLoading(true);
    sosStartTimeRef.current = Date.now();
    chunksRef.current = [];

    try {
      // 1. Trigger haptic SOS pattern
      triggerHapticFeedback();

      // 2. Invoke production SOS service workflow
      const result = await initiateSOSAlertWorkflow(
        user ? user.uid : 'anonymous',
        user ? user : null,
        contacts
      );

      if (result.success) {
        // Activate app context
        activateSOS(result.alertId);
        startSiren();
        await startRecording();

        // 3. Start Geolocation Continuous Live Tracking
        startActiveSOSTracking(result.alertId, user ? user.uid : 'anonymous', (coords) => {
          console.log('[SafeHer Live Tracking] New coordinates:', coords);
        });

        // 4. Log the trigger reason if smart-activated
        if (reason !== 'Manual Hold-to-Activate') {
          await addSOSLogEvent(result.alertId, `Emergency triggered: ${reason}`);
        }

        setActivated(true);
        toast.success(`🚨 SOS ACTIVATED — ${result.message}`, { duration: 6000 });
      } else {
        throw new Error('Orchestration workflow returned success: false');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to send SOS. Try calling 100 directly.');
    } finally {
      setLoading(false);
    }
  }, [user, contacts, activateSOS, startSiren]);

  const smartDetection = useSmartDetection(triggerSOS);

  // ── Voice Trigger Hook ───────────────────────────────────────────────────
  const { active: voiceActive, supported: voiceSupported, start: startVoice, stop: stopVoice } = useVoiceTrigger(
    useCallback((keyword) => {
      if (!sosActive && !loading) {
        toast('🎤 Voice trigger detected: "' + keyword + '" — Activating SOS!', { icon: '🚨', duration: 3000 });
        triggerSOS(`Voice Trigger ("${keyword}")`);
      }
    }, [sosActive, loading, triggerSOS])
  );

  const toggleVoiceMonitoring = () => {
    if (voiceActive) {
      stopVoice();
      setVoiceMonitoring(false);
      toast('Voice monitoring stopped', { icon: '🔇' });
    } else {
      startVoice();
      setVoiceMonitoring(true);
      toast('🎤 Voice monitoring active — say "Help me" or "Bachao"', { duration: 4000 });
    }
  };

  // ── Real-time Firestore Listeners during active SOS ──────────────────────
  useEffect(() => {
    if (!sosActive || !sosAlertId) {
      setActiveAlertData(null);
      setActiveLogs([]);
      return;
    }

    // Subscribe to alert document (updates contact acknowledgement states)
    const unsubAlert = subscribeToSOSAlert(sosAlertId, (docData) => {
      // Play a synthesizer sound when a contact's status changes to Acknowledged!
      setActiveAlertData((prev) => {
        if (prev && docData) {
          const oldAck = prev.contacts?.filter(c => c.status === 'acknowledged').length || 0;
          const newAck = docData.contacts?.filter(c => c.status === 'acknowledged').length || 0;
          if (newAck > oldAck) {
            playChime();
            toast.success('📢 Emergency contact has acknowledged your alert!', { duration: 5000, icon: '🛡️' });
          }
        }
        return docData;
      });
    });

    // Subscribe to timeline log events
    const unsubLogs = subscribeToSOSLogs(sosAlertId, (logsList) => {
      setActiveLogs(logsList);
    });

    return () => {
      unsubAlert();
      unsubLogs();
    };
  }, [sosActive, sosAlertId]);

  // ── Audio Recording implementation ───────────────────────────────────────
  const startRecording = async () => {
    try {
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      rec.start();
      mediaRecRef.current = { rec, stream };
      setRecording(true);
    } catch (e) {
      console.warn('Audio recording permission denied:', e);
    }
  };

  const stopRecordingAndUpload = async (alertId) => {
    return new Promise((resolve) => {
      if (!mediaRecRef.current) {
        resolve();
        return;
      }

      try {
        mediaRecRef.current.rec.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          setRecording(false);
          
          if (alertId && blob.size > 0) {
            try {
              setUploadProgress(0);
              // Upload to Firebase Storage with progress tracking
              const downloadURL = await uploadSOSAudioWithProgress(
                alertId,
                blob,
                (percent) => setUploadProgress(percent)
              );
              
              const durationSec = Math.round((Date.now() - sosStartTimeRef.current) / 1000);
              // Update alert metadata in firestore
              await updateSOSAlertAudio(alertId, downloadURL, {
                sizeBytes: blob.size,
                durationSeconds: durationSec
              });
              toast.success('Audio evidence uploaded securely to cloud!');
            } catch (err) {
              console.error('Evidence upload failed:', err);
              toast.error('Failed to save audio evidence.');
            } finally {
              setUploadProgress(null);
            }
          }
          resolve();
        };

        mediaRecRef.current.rec.stop();
        mediaRecRef.current.stream.getTracks().forEach((t) => t.stop());
        mediaRecRef.current = null;
      } catch (err) {
        console.warn('Stop recording failed:', err);
        setRecording(false);
        resolve();
      }
    });
  };

  // ── Hold-to-Activate ─────────────────────────────────────────────────────
  const startHold = useCallback(() => {
    if (sosActive || loading) return;
    setHolding(true);
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setProgress(pct);
      if (elapsed >= HOLD_DURATION) {
        clearInterval(timer);
        triggerSOS('Manual Hold-to-Activate');
      }
    }, 50);
    setHoldTimer(timer);
  }, [sosActive, loading, triggerSOS]);

  const cancelHold = useCallback(() => {
    if (holdTimer) clearInterval(holdTimer);
    setHolding(false);
    setProgress(0);
  }, [holdTimer]);

  const cancelSOS = async () => {
    setLoading(true);
    stopSiren();
    cancelHapticFeedback();
    stopActiveSOSTracking();

    const currentAlertId = sosAlertId;

    // Resolve the alert in firestore first
    if (currentAlertId) {
      try {
        await resolveSOSAlert(currentAlertId);
      } catch (err) {
        console.error('Resolve SOS alert failed:', err);
      }
    }

    // Stop recording and upload evidence
    await stopRecordingAndUpload(currentAlertId);

    deactivateSOS();
    setActivated(false);
    setLoading(false);
    toast.success('SOS cancelled. Stay safe! 💖');
  };

  // ── WhatsApp Emergency ───────────────────────────────────────────────────
  const sendWhatsApp = (contact) => {
    const locLink = currentLocation
      ? `https://maps.google.com/?q=${currentLocation.latitude},${currentLocation.longitude}`
      : 'Location unavailable';
    const msg = encodeURIComponent(
      `🚨 EMERGENCY! I need help immediately!\n📍 My location: ${locLink}\n\nTrack me live at: ${window.location.origin}/sos-portal/${sosAlertId || 'demo'}\n\nThis message was sent via SafeHer.`
    );
    const phone = contact.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    const success = smartDetection.verifyPin(enteredPin);
    if (success) {
      setEnteredPin('');
    }
  };

  useEffect(() => {
    return () => {
      if (holdTimer) clearInterval(holdTimer);
      stopActiveSOSTracking();
    };
  }, [holdTimer]);

  return (
    <div className="flex flex-col items-center justify-between min-h-dvh px-6 py-8 max-w-md mx-auto relative z-10">

      {/* Header */}
      <div className="w-full text-center pt-2">
        <h1 className="font-display font-bold text-2xl text-slate-100 flex items-center justify-center gap-2">
          <Shield className="text-red-400 animate-pulse" size={24} /> SOS Emergency
        </h1>
        <p className="text-slate-400 text-sm mt-1 leading-relaxed">
          {sosActive ? 'Emergency alert is ACTIVE — Help is coming' : 'Hold button for 3 seconds to activate'}
        </p>
        {recording && (
          <div className="flex items-center justify-center gap-2 mt-2 bg-red-500/10 border border-red-500/20 py-1 px-3 rounded-full w-fit mx-auto">
            <Mic size={12} className="text-red-400 animate-pulse" />
            <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Recording Evidence</span>
          </div>
        )}
      </div>

      {/* SOS Button Area */}
      <div className="flex flex-col items-center gap-6 my-6 w-full">
        {!sosActive ? (
          <div className="relative flex items-center justify-center py-4">
            {/* Pulse rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute w-72 h-72 rounded-full border border-red-500/15 animate-ping" style={{ animationDuration: '3s' }} />
              <div className="absolute w-60 h-60 rounded-full border border-red-500/20 animate-ping" style={{ animationDuration: '2.2s' }} />
              <div className="absolute w-48 h-48 rounded-full border border-red-500/30 animate-ping" style={{ animationDuration: '1.7s' }} />
            </div>

            {/* Progress ring */}
            {holding && (
              <svg className="absolute w-[220px] h-[220px] -rotate-90" viewBox="0 0 220 220">
                <circle cx="110" cy="110" r="100" fill="none" stroke="rgba(239,68,68,0.15)" strokeWidth="8" />
                <circle
                  cx="110" cy="110" r="100"
                  fill="none" stroke="#ef4444" strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 100}`}
                  strokeDashoffset={`${2 * Math.PI * 100 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-75"
                />
              </svg>
            )}

            {/* Main button */}
            <button
              className="relative w-48 h-48 rounded-full flex flex-col items-center justify-center shadow-2xl select-none touch-none transition-all duration-150"
              style={{
                background: holding
                  ? 'linear-gradient(135deg, #dc2626, #9f1239)'
                  : 'linear-gradient(135deg, #ef4444, #e11d48)',
                boxShadow: holding
                  ? '0 0 100px rgba(239,68,68,0.8), 0 0 40px rgba(239,68,68,0.6)'
                  : '0 0 50px rgba(239,68,68,0.4)',
                transform: holding ? 'scale(1.05)' : 'scale(1)',
              }}
              onMouseDown={startHold}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
              onTouchStart={(e) => { e.preventDefault(); startHold(); }}
              onTouchEnd={cancelHold}
              onTouchCancel={cancelHold}
              disabled={loading}
            >
              <Shield size={52} className="text-white mb-2" />
              <span className="text-white font-display font-black text-3xl tracking-widest">SOS</span>
              <span className="text-red-200 text-xs mt-1 font-medium">
                {loading ? 'Activating…' : holding ? `${Math.round(progress)}%` : 'Hold to activate'}
              </span>
            </button>
          </div>
        ) : (
          /* Active SOS Screen */
          <div className="w-full space-y-4">
            <div className="relative flex items-center justify-center my-2">
              <div className="sos-ring-1 absolute w-56 h-56 rounded-full border-4 border-red-500 opacity-60" />
              <div className="sos-ring-2 absolute w-56 h-56 rounded-full border-4 border-red-400 opacity-40" />
              <div className="sos-ring-3 absolute w-56 h-56 rounded-full border-4 border-red-300 opacity-20" />
              <div
                className="w-48 h-48 rounded-full flex flex-col items-center justify-center sos-btn shadow-2xl relative z-10"
                style={{
                  background: 'linear-gradient(135deg, #dc2626, #9f1239)',
                  boxShadow: '0 0 100px rgba(239,68,68,0.8)',
                }}
              >
                <AlertTriangle size={48} className="text-white mb-2" />
                <span className="text-white font-display font-black text-2xl">ACTIVE</span>
                <span className="text-red-200 text-xs mt-1">Help is coming</span>
              </div>
            </div>

            {/* Evidence uploading progress */}
            {uploadProgress !== null && (
              <div className="w-full glass-card p-3 border border-pink-500/20 text-center space-y-2">
                <div className="flex items-center justify-between text-xs text-pink-400 font-semibold">
                  <span className="flex items-center gap-1.5"><RefreshCw className="animate-spin" size={12} /> Uploading Audio Evidence...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-pink-500 transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {/* Real-time sync panel for active emergency */}
            <div className="w-full glass-card p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-1.5 text-xs text-red-400 font-bold uppercase tracking-wider">
                  <Radio size={12} className="animate-pulse" /> Live Status Dashboard
                </div>
                <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold">
                  {activeAlertData?.status || 'dispatched'}
                </span>
              </div>

              {/* Trusted Circle states */}
              <div className="space-y-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Contact Alerts</p>
                <div className="grid grid-cols-2 gap-2">
                  {activeAlertData?.contacts?.map((c, i) => (
                    <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-300 truncate">{c.name}</p>
                        <p className="text-[9px] text-slate-500 truncate">{c.phone}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                        c.status === 'acknowledged' ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400' :
                        c.status === 'viewed' ? 'bg-indigo-500/15 border-indigo-500/20 text-indigo-400' :
                        'bg-slate-500/10 border-slate-500/20 text-slate-500'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  ))}
                  {(!activeAlertData?.contacts || activeAlertData.contacts.length === 0) && (
                    <div className="col-span-2 text-center text-xs text-slate-500 py-1">No contacts attached.</div>
                  )}
                </div>
              </div>

              {/* Live Timeline logs */}
              <div className="space-y-1.5 border-t border-white/5 pt-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={10} /> Dispatch Log events
                </p>
                <div className="space-y-1 max-h-[80px] overflow-y-auto pr-1">
                  {activeLogs.map((log, index) => (
                    <div key={index} className="flex gap-2 text-[10px] text-slate-400">
                      <span className="text-slate-600 font-mono flex-shrink-0">
                        {new Date(log.timestamp?.toDate ? log.timestamp.toDate() : log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span className="font-medium text-slate-300">{log.event}</span>
                    </div>
                  ))}
                  {activeLogs.length === 0 && (
                    <div className="text-[10px] text-slate-600 italic">Initializing logging pipeline...</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ready states and toggles */}
        {!sosActive && (
          <div className="w-full space-y-3">
            {/* Status card */}
            <div className="w-full glass-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-sm text-slate-300 font-bold">System Protected</p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Press & hold the SOS button for 3 seconds to send emergency alert + vibration + siren to your contacts
              </p>

              {voiceSupported ? (
                <div className="border-t border-white/5 pt-3 mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic size={14} className={voiceActive ? 'text-pink-400 animate-pulse' : 'text-slate-500'} />
                    <div>
                      <p className="text-xs font-semibold text-slate-300">Voice Activation</p>
                      <p className="text-[10px] text-slate-500">
                        {voiceActive ? 'Say: "Help me", "Bachao"' : 'Voice monitoring is off'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleVoiceMonitoring}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      voiceActive
                        ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                        : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {voiceActive ? 'Active' : 'Enable'}
                  </button>
                </div>
              ) : (
                <div className="border-t border-white/5 pt-2 mt-2 flex items-center gap-1.5 text-slate-600 text-[10px]">
                  <MicOff size={11} />
                  <span>Voice activation not supported by your browser</span>
                </div>
              )}
            </div>

            {/* Smart Safety Suite Settings */}
            <div className="w-full glass-card p-4 space-y-3.5">
              <div className="flex items-center gap-1.5 border-b border-white/5 pb-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Sparkles size={13} className="text-pink-400" /> Smart Safety Suite
              </div>

              {/* Shake Trigger toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-200">Shake Detection</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Triggers SOS on rapid device shake</p>
                </div>
                <button
                  onClick={smartDetection.toggleShake}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                    smartDetection.shakeEnabled ? 'bg-pink-500' : 'bg-white/10'
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    smartDetection.shakeEnabled ? 'translate-x-5.5' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Power button toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-200">Power Button Keystroke</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Press Space or Escape key 3x rapidly</p>
                </div>
                <button
                  onClick={smartDetection.togglePowerSim}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                    smartDetection.powerSimEnabled ? 'bg-pink-500' : 'bg-white/10'
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    smartDetection.powerSimEnabled ? 'translate-x-5.5' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Inactivity Check-in Timer */}
              <div className="border-t border-white/5 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Inactivity Check-In</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Triggers SOS unless code is entered</p>
                  </div>
                  {smartDetection.inactivityActive ? (
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold animate-pulse flex items-center gap-1">
                      <Clock size={10} /> Active
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-600">Inactive</span>
                  )}
                </div>

                {smartDetection.inactivityActive ? (
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-300">Checking in shortly</p>
                      <p className="text-lg font-bold font-mono text-pink-400 mt-0.5">
                        {Math.floor(smartDetection.inactivityTimeLeft / 60)}m {smartDetection.inactivityTimeLeft % 60}s
                      </p>
                    </div>
                    <Button variant="danger" size="sm" onClick={smartDetection.cancelInactivityTimer}>
                      Cancel Timer
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select
                      value={timerDuration}
                      onChange={(e) => setTimerDuration(Number(e.target.value))}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 flex-1 focus:outline-none focus:border-pink-500/30"
                    >
                      <option value="15" className="bg-dark-400">15 Seconds (Demo)</option>
                      <option value="30" className="bg-dark-400">30 Seconds (Demo)</option>
                      <option value="300" className="bg-dark-400">5 Minutes</option>
                      <option value="600" className="bg-dark-400">10 Minutes</option>
                      <option value="1800" className="bg-dark-400">30 Minutes</option>
                    </select>
                    <button
                      onClick={() => smartDetection.startInactivityTimer(timerDuration)}
                      className="px-4 py-2 bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-bold rounded-xl hover:bg-pink-500/20 transition-all flex items-center gap-1"
                    >
                      Start Check-In
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="w-full space-y-3 relative z-10">
        {sosActive ? (
          <>
            <Button variant="danger" fullWidth size="lg" onClick={cancelSOS} disabled={loading}>
              <X size={20} /> Cancel SOS Alert
            </Button>

            {/* WhatsApp contacts */}
            {contacts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 text-center">Send WhatsApp link to contacts</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {contacts.slice(0, 3).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => sendWhatsApp(c)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold hover:bg-green-500/20 transition-all"
                    >
                      <MessageCircle size={13} /> {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <a href="tel:100" className="flex items-center justify-center gap-2 py-3 rounded-2xl text-slate-300 border border-white/10 hover:bg-white/5 transition-all text-sm font-semibold">
              <Phone size={18} /> Call Police (100)
            </a>
          </>
        ) : (
          <>
            <a href="tel:1091" className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400 font-semibold hover:bg-pink-500/20 transition-all">
              <Phone size={18} /> Call Women Helpline (1091)
            </a>
            <a href="tel:100" className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl glass-card text-slate-300 font-semibold hover:bg-white/5 transition-all">
              <Phone size={18} /> Call Police (100)
            </a>
          </>
        )}
      </div>

      {/* ── Overlay 1: Smart trigger countdown overlay (5 seconds warning) ───── */}
      {smartDetection.warningActive && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-dark-400/95 backdrop-blur-md px-6 text-center select-none">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 animate-bounce mb-6">
            <ShieldAlert size={40} />
          </div>
          <h2 className="font-display font-black text-2xl text-slate-100 uppercase tracking-wide">Emergency Warning</h2>
          <p className="text-red-400 font-semibold mt-2 text-sm max-w-xs leading-relaxed">
            {smartDetection.warningReason.current}
          </p>
          
          {/* Big countdown timer */}
          <div className="text-8xl font-black font-display text-slate-100 my-10 animate-ping" style={{ animationDuration: '1s' }}>
            {smartDetection.warningTimeLeft}
          </div>

          <p className="text-slate-500 text-xs max-w-xs leading-relaxed mb-8">
            SafeHer is automatically triggering an emergency broadcast. Emergency contacts will be notified.
          </p>

          <button
            onClick={smartDetection.cancelWarning}
            className="w-full max-w-xs py-4 rounded-2xl bg-white/5 border border-white/10 text-slate-300 font-bold hover:bg-white/10 transition-all uppercase tracking-wider text-sm flex items-center justify-center gap-2"
          >
            <X size={18} /> Cancel Broadcast
          </button>
        </div>
      )}

      {/* ── Overlay 2: Inactivity PIN Check-In Modal ───────────────────────── */}
      {smartDetection.pinRequired && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-dark-400/95 backdrop-blur-md px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 animate-pulse">
            <Clock size={32} />
          </div>
          <h2 className="font-display font-bold text-xl text-slate-100">Check-In Required</h2>
          <p className="text-slate-400 text-xs mt-1 max-w-xs leading-relaxed">
            Please confirm your safety by entering your PIN. Or SOS will activate.
          </p>

          {/* Countdown indicator */}
          <div className="my-6 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-bold font-mono">
            Time Remaining: {smartDetection.pinCountdown} Seconds
          </div>

          <form onSubmit={handlePinSubmit} className="w-full max-w-xs space-y-4">
            <input
              type="password"
              placeholder="Enter PIN (Default: 1234)"
              value={enteredPin}
              onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center text-xl text-slate-100 font-bold focus:outline-none focus:border-pink-500/30 font-mono tracking-widest placeholder:text-slate-700"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="ghost" onClick={smartDetection.cancelInactivityTimer}>
                Disable
              </Button>
              <Button type="submit" variant="primary">
                Verify Safety
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
