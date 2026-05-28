import { useState, useEffect } from 'react';
import { MapPin, Navigation, Share2, Copy, CheckCircle, ExternalLink, Crosshair, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useGeolocation } from '../hooks/useGeolocation';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import toast from 'react-hot-toast';

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';

// Reverse geocode using free Nominatim API (no key needed)
const getAddress = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    return data.display_name?.split(',').slice(0, 3).join(', ') || null;
  } catch {
    return null;
  }
};

export default function LiveTracking() {
  const { isTracking, currentLocation } = useApp();
  const { startTracking, stopTracking, error } = useGeolocation();
  const [copied, setCopied] = useState(false);
  const [address, setAddress] = useState(null);
  const [loadingAddress, setLoadingAddress] = useState(false);

  const lat = currentLocation?.latitude;
  const lng = currentLocation?.longitude;
  const mapsUrl = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null;
  const staticMap = lat && lng && MAPS_KEY
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x300&maptype=roadmap&markers=color:red%7C${lat},${lng}&key=${MAPS_KEY}&style=element:geometry%7Ccolor:0x242f3e`
    : null;

  // Fetch human-readable address when location changes
  useEffect(() => {
    if (!lat || !lng) return;
    setLoadingAddress(true);
    getAddress(lat, lng).then((addr) => {
      setAddress(addr);
      setLoadingAddress(false);
    });
  }, [lat, lng]);

  const handleCopy = async () => {
    if (!mapsUrl) return;
    try {
      await navigator.clipboard.writeText(`My live location: ${mapsUrl}\n— Shared via SafeHer 🛡️`);
      setCopied(true);
      toast.success('Location link copied!');
      setTimeout(() => setCopied(false), 2500);
    } catch { toast.error('Copy failed — try sharing instead'); }
  };

  const handleShare = async () => {
    if (!mapsUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Live Location — SafeHer',
          text: '🚨 Track my live location (shared via SafeHer):',
          url: mapsUrl,
        });
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  };

  const toggle = () => { isTracking ? stopTracking() : startTracking(); };

  // Accuracy quality label
  const accuracyLabel = currentLocation?.accuracy
    ? currentLocation.accuracy < 20 ? { text: 'High Accuracy', cls: 'text-emerald-400' }
      : currentLocation.accuracy < 100 ? { text: 'Medium Accuracy', cls: 'text-amber-400' }
      : { text: 'Low Accuracy', cls: 'text-red-400' }
    : null;

  return (
    <div className="px-4 pt-4 pb-6 space-y-5 max-w-2xl mx-auto lg:pt-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-100">Live Tracking</h1>
        <p className="text-slate-400 text-sm mt-1">Share your real-time location with trusted contacts</p>
      </div>

      {/* Status & toggle card */}
      <GlassCard className={`transition-all duration-500 ${isTracking ? 'border-emerald-500/30' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
              isTracking ? 'bg-emerald-500/20' : 'bg-white/5'
            }`}>
              <Navigation size={22} className={isTracking ? 'text-emerald-400' : 'text-slate-400'} />
            </div>
            <div>
              <p className="font-semibold text-slate-100">
                {isTracking ? 'Tracking Active' : 'Tracking Inactive'}
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                {isTracking ? (
                  <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" /> Live GPS active</>
                ) : 'Tap to start sharing location'}
              </p>
            </div>
          </div>
          <Button variant={isTracking ? 'danger' : 'primary'} size="sm" onClick={toggle}>
            {isTracking ? 'Stop' : 'Start'}
          </Button>
        </div>
      </GlassCard>

      {/* Map area */}
      <div className="glass-card overflow-hidden p-0" style={{ aspectRatio: '16/9' }}>
        {currentLocation ? (
          staticMap ? (
            <img
              src={staticMap}
              alt="Your location on map"
              className="w-full h-full object-cover"
            />
          ) : (
            /* Stylised fallback map */
            <div
              className="w-full h-full flex flex-col items-center justify-center relative"
              style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)' }}
            >
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: 'linear-gradient(rgba(236,72,153,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(236,72,153,0.3) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }} />
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-5 h-5 rounded-full bg-pink-500 border-2 border-white shadow-glow-pink" />
                <div className="w-px h-8 bg-pink-500/50 mt-1" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-40 rounded-full border border-pink-500/15 animate-ping" style={{ animationDuration: '3s' }} />
              </div>
              <p className="relative z-10 mt-4 text-slate-300 text-sm font-mono">
                {lat?.toFixed(6)}, {lng?.toFixed(6)}
              </p>
              {MAPS_KEY === '' && (
                <div className="relative z-10 flex items-center gap-1 mt-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10">
                  <Info size={12} className="text-slate-500" />
                  <p className="text-slate-500 text-[10px]">Add VITE_GOOGLE_MAPS_KEY to .env for full map</p>
                </div>
              )}
            </div>
          )
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-4"
            style={{ background: 'linear-gradient(135deg, #0f0f1a, #1a1a2e)' }}
          >
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
              <MapPin size={28} className="text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-sm font-medium">Location not active</p>
              <p className="text-slate-600 text-xs mt-1">Tap "Start" to begin GPS tracking</p>
            </div>
            {error && (
              <div className="mx-4 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-xs text-center">{error}</p>
              </div>
            )}
            <Button size="sm" onClick={startTracking}>
              <Crosshair size={16} /> Enable Location
            </Button>
          </div>
        )}
      </div>

      {/* Address + coordinates */}
      {currentLocation && (
        <GlassCard className="space-y-3">
          {/* Address */}
          <div className="flex items-start gap-2">
            <MapPin size={14} className="text-pink-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-slate-300 leading-relaxed">
              {loadingAddress ? (
                <span className="text-slate-500 italic">Detecting address…</span>
              ) : address || 'Address unavailable'}
            </p>
          </div>

          {/* Coord grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Latitude',  val: lat?.toFixed(6) },
              { label: 'Longitude', val: lng?.toFixed(6) },
              { label: 'Accuracy',  val: `±${Math.round(currentLocation.accuracy)}m` },
              { label: 'Status',    val: isTracking ? '🟢 Live' : '🟡 Last known' },
            ].map(({ label, val }) => (
              <div key={label} className="bg-white/5 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                <p className="text-sm font-semibold text-slate-100 font-mono">{val}</p>
              </div>
            ))}
          </div>

          {/* Accuracy indicator */}
          {accuracyLabel && (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${accuracyLabel.cls.replace('text-', 'bg-')}`} />
              <span className={`text-xs font-medium ${accuracyLabel.cls}`}>{accuracyLabel.text}</span>
            </div>
          )}
        </GlassCard>
      )}

      {/* Share buttons */}
      <div className="grid grid-cols-3 gap-3">
        <Button variant="primary" onClick={handleShare} disabled={!currentLocation} fullWidth>
          <Share2 size={16} /> Share
        </Button>
        <Button variant="ghost" onClick={handleCopy} disabled={!currentLocation} fullWidth>
          {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy'}
        </Button>
        <a
          href={mapsUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center justify-center gap-2 rounded-2xl glass-card text-slate-300 text-sm font-semibold transition-all hover:border-white/10 ${!currentLocation ? 'opacity-40 pointer-events-none' : ''}`}
        >
          <ExternalLink size={16} /> Maps
        </a>
      </div>
    </div>
  );
}
