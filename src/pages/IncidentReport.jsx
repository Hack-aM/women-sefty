import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertOctagon, Mic, MicOff, Camera, MapPin, Loader2,
  Trash2, Play, Square, ChevronLeft, Shield, FileText, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { useIncidentReport } from '../hooks/useIncidentReport';
import { getIncidentReports } from '../firebase/firestore';
import useAudioRecorder from '../hooks/useAudioRecorder';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';

const INCIDENT_TYPES = [
  { value: 'harassment', label: 'Harassment / Stalking', color: 'border-red-500/30 text-red-400' },
  { value: 'threat', label: 'Physical Threat / Danger', color: 'border-orange-500/30 text-orange-400' },
  { value: 'suspicious', label: 'Suspicious Activity', color: 'border-yellow-500/30 text-yellow-400' },
  { value: 'domestic', label: 'Domestic Abuse', color: 'border-pink-500/30 text-pink-400' },
  { value: 'medical', label: 'Medical Emergency', color: 'border-blue-500/30 text-blue-400' },
  { value: 'other', label: 'Other Safety Concern', color: 'border-slate-500/30 text-slate-400' },
];

export default function IncidentReport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getCurrentPosition } = useGeolocation();
  const { submitReport, submitting } = useIncidentReport();
  const {
    recording,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecorder();

  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history'
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Form states
  const [type, setType] = useState('harassment');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [attachLocation, setAttachLocation] = useState(true);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  useEffect(() => {
    if (activeTab === 'history' && user) {
      loadHistory();
    }
  }, [activeTab, user]);

  const loadHistory = async () => {
    setLoadingReports(true);
    try {
      const data = await getIncidentReports(user.uid);
      setReports(data);
    } catch (err) {
      console.error('Error fetching incident reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Please describe what happened');
      return;
    }

    let locationData = null;
    if (attachLocation) {
      setFetchingLocation(true);
      try {
        const pos = await getCurrentPosition();
        locationData = {
          latitude: pos.latitude,
          longitude: pos.longitude,
        };
      } catch (err) {
        toast.warn('Could not auto-fetch location. Submitting without coords.');
      } finally {
        setFetchingLocation(false);
      }
    }

    try {
      await submitReport({
        type,
        description,
        location: locationData,
        imageFile,
        audioBlob,
      });

      // Clear form
      setDescription('');
      setType('harassment');
      removeImage();
      clearRecording();
      setActiveTab('history');
    } catch {
      // toast is already shown by useIncidentReport
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

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
          <h1 className="font-display font-bold text-2xl text-slate-100">Report Incident</h1>
          <p className="text-slate-400 text-sm mt-0.5">Securely upload evidence and details</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 p-1 bg-slate-900/50 rounded-xl">
        <button
          onClick={() => setActiveTab('new')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'new'
              ? 'bg-pink-500 text-white shadow-glow-pink'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText size={14} /> Report Incident
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'history'
              ? 'bg-pink-500 text-white shadow-glow-pink'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle2 size={14} /> My Reports
        </button>
      </div>

      {activeTab === 'new' ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Incident Type Select */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Incident Type</label>
            <div className="grid grid-cols-2 gap-2">
              {INCIDENT_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                    type === t.value
                      ? 'bg-pink-500/10 border-pink-500/50 text-pink-400'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Describe what happened</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide key details e.g. location details, suspect descriptors, vehicles, sequence of events..."
              rows={4}
              className="w-full rounded-2xl bg-white/5 border border-white/5 p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500/30 focus:bg-white/10 transition-all resize-none"
            />
          </div>

          {/* Photo upload */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upload Photo Evidence (Optional)</label>
            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-video">
                <img src={imagePreview} alt="Evidence preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl p-6 hover:border-pink-500/30 transition-all bg-white/5 cursor-pointer">
                <Camera size={24} className="text-slate-400 mb-2" />
                <span className="text-xs font-semibold text-slate-300">Tap to capture or upload photo</span>
                <span className="text-[10px] text-slate-500 mt-1">PNG, JPG up to 5MB</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>

          {/* Audio recording */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Audio Recording / Voice Memo (Optional)</label>
            <div className="glass-card p-4 flex items-center justify-between border-white/5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  recording ? 'bg-red-500 animate-pulse text-white' : 'bg-white/5 text-slate-400'
                }`}>
                  <Mic size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    {recording ? 'Recording voice memo...' : audioBlob ? 'Voice memo recorded' : 'Voice Memo'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {recording ? 'Tap STOP to finish' : audioBlob ? 'Play to review or Trash to delete' : 'Tap record to add audio context'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {recording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all"
                  >
                    <Square size={16} fill="white" />
                  </button>
                ) : audioBlob ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const aud = new Audio(audioUrl);
                        aud.play();
                      }}
                      className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center justify-center hover:bg-pink-500/20 transition-all"
                    >
                      <Play size={14} fill="currentColor" />
                    </button>
                    <button
                      type="button"
                      onClick={clearRecording}
                      className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-slate-300 flex items-center justify-center hover:bg-white/10 transition-all"
                  >
                    <Mic size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Location Toggle */}
          <div className="flex items-center justify-between glass-card p-4 border-white/5">
            <div className="flex items-center gap-3">
              <MapPin size={18} className="text-pink-400" />
              <div>
                <p className="text-xs font-semibold text-slate-200">Attach GPS Coordinates</p>
                <p className="text-[10px] text-slate-500">Auto-include current device location</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={attachLocation}
                onChange={() => setAttachLocation(!attachLocation)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500" />
            </label>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={submitting || fetchingLocation}
            className="shadow-glow-pink"
          >
            {submitting || fetchingLocation ? (
              <>
                <Loader2 size={18} className="animate-spin mr-2" />
                {fetchingLocation ? 'Fetching GPS...' : 'Uploading Report...'}
              </>
            ) : (
              <>
                <AlertOctagon size={18} className="mr-2" /> Submit Report Securely
              </>
            )}
          </Button>
        </form>
      ) : (
        /* History list */
        <div className="space-y-4">
          {loadingReports ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="w-full h-24 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="glass-card p-8 text-center flex flex-col items-center justify-center gap-4 border-dashed border-white/10">
              <div className="w-14 h-14 rounded-full bg-slate-500/10 flex items-center justify-center">
                <FileText size={24} className="text-slate-400" />
              </div>
              <div>
                <h3 className="text-slate-300 font-semibold text-sm">No Reports Submitted</h3>
                <p className="text-slate-500 text-xs mt-1">Your submitted incident reports will show up here.</p>
              </div>
            </div>
          ) : (
            reports.map((r) => (
              <GlassCard key={r.id} className="border-white/5">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20 capitalize">
                      {r.type}
                    </span>
                    <span className="text-[10px] text-slate-500">{formatDate(r.timestamp)}</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{r.description}</p>

                  {(r.imageUrl || r.audioUrl) && (
                    <div className="flex gap-2">
                      {r.imageUrl && (
                        <a
                          href={r.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] text-slate-300 hover:bg-white/10"
                        >
                          <Camera size={12} className="text-pink-400" /> View Image
                        </a>
                      )}
                      {r.audioUrl && (
                        <button
                          onClick={() => {
                            const aud = new Audio(r.audioUrl);
                            aud.play();
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] text-slate-300 hover:bg-white/10"
                        >
                          <Play size={12} className="text-pink-400" /> Play Audio
                        </button>
                      )}
                    </div>
                  )}

                  {r.location && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <MapPin size={10} className="text-pink-400" />
                      <span>
                        GPS coordinates attached ({r.location.latitude.toFixed(4)}, {r.location.longitude.toFixed(4)})
                      </span>
                    </div>
                  )}
                </div>
              </GlassCard>
            ))
          )}
        </div>
      )}
    </div>
  );
}
