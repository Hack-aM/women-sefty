import { useState, useEffect, useRef } from 'react';
import {
  Phone, MapPin, Hospital, Shield, AlertCircle, ExternalLink,
  ChevronLeft, ChevronRight, Navigation, Info, Map, Compass
} from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import { useApp } from '../context/AppContext';
import { getCurrentGPSLocation } from '../utils/location';
import toast from 'react-hot-toast';

const categories = ['All', 'Helplines', 'Police', 'Hospital', 'Women'];

const helpItems = [
  { id: 1, category: 'Helplines', name: 'Women Helpline', number: '1091', desc: '24/7 women support', icon: Shield, color: 'from-pink-500 to-rose-500' },
  { id: 2, category: 'Police',    name: 'Police Emergency', number: '100', desc: 'National emergency', icon: Shield, color: 'from-red-500 to-red-700' },
  { id: 3, category: 'Helplines', name: 'Ambulance',       number: '108', desc: 'Medical emergency', icon: AlertCircle, color: 'from-emerald-500 to-teal-600' },
  { id: 4, category: 'Women',     name: 'Domestic Violence', number: '181', desc: 'Violence against women', icon: Shield, color: 'from-purple-500 to-violet-600' },
  { id: 5, category: 'Helplines', name: 'Child Helpline',  number: '1098', desc: 'Child protection', icon: Phone, color: 'from-blue-500 to-indigo-600' },
  { id: 6, category: 'Helplines', name: 'Disaster Mgmt',  number: '1070', desc: 'State disaster authority', icon: AlertCircle, color: 'from-amber-500 to-orange-500' },
  { id: 7, category: 'Police',    name: 'Cyber Crime',     number: '1930', desc: 'Online crime & fraud', icon: Shield, color: 'from-cyan-500 to-blue-500' },
  { id: 8, category: 'Women',     name: 'NCW Helpline',    number: '7827-170-170', desc: "National Commission for Women", icon: Shield, color: 'from-pink-400 to-purple-500' },
  { id: 9, category: 'Hospital',  name: 'Blood Bank',      number: '104',  desc: 'Blood requirement', icon: AlertCircle, color: 'from-red-400 to-rose-600' },
  { id: 10,category: 'Police',    name: 'Railway Police',  number: '1512', desc: 'Railway security', icon: Phone, color: 'from-slate-500 to-slate-700' },
];

const nearbyServices = [
  { icon: Shield, label: 'Police Stations', hint: 'Find nearest', color: 'text-red-400' },
  { icon: Hospital, label: 'Hospitals', hint: 'Emergency care', color: 'text-emerald-400' },
  { icon: MapPin, label: 'Safe Zones', hint: 'Public spaces', color: 'text-blue-400' },
];

// Helper to load Google Maps Script dynamically
const loadGoogleMapsScript = (apiKey, callback) => {
  if (window.google && window.google.maps) {
    callback();
    return;
  }
  const existing = document.getElementById('google-maps-api-script');
  if (existing) {
    existing.addEventListener('load', () => callback());
    return;
  }
  const script = document.createElement('script');
  script.id = 'google-maps-api-script';
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = () => callback();
  script.onerror = () => console.error('Google Maps script load failed');
  document.head.appendChild(script);
};

// Places generator based on User coordinates
const getNearbyResourcesList = (type, userLat, userLng) => {
  const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const createItem = (id, name, latOffset, lngOffset, category, desc, phone) => {
    const lat = userLat + latOffset;
    const lng = userLng + lngOffset;
    const dist = getHaversineDistance(userLat, userLng, lat, lng);
    return { id, name, lat, lng, category, desc, phone, distance: dist };
  };

  if (type === 'Police Stations') {
    return [
      createItem('p1', 'Women Safety Police Station', 0.0028, -0.0015, 'Police', 'Special protection force unit', '100'),
      createItem('p2', 'Metro Station Security Post', -0.0035, 0.0042, 'Police', '24/7 passenger assistance', '011-23010101'),
      createItem('p3', 'Sector 12 Police Head Post', 0.0051, 0.0029, 'Police', 'Local administrative precinct', '112'),
    ].sort((a, b) => a.distance - b.distance);
  }

  if (type === 'Hospitals') {
    return [
      createItem('h1', 'City General Hospital & Emergency', -0.0019, -0.0031, 'Hospital', '24/7 trauma & medical care', '108'),
      createItem('h2', 'St. Mary Women & Children Hospital', 0.0045, -0.0025, 'Hospital', 'Specialist maternal & kids care', '011-26490303'),
      createItem('h3', 'Metro Life Care & First Aid', 0.0012, 0.0058, 'Hospital', 'Immediate clinic response', '102'),
    ].sort((a, b) => a.distance - b.distance);
  }

  // Safe Zones
  return [
    createItem('s1', 'SafeHer Community Support Center', -0.0025, 0.0021, 'Safe Zone', 'NGO support & safe transit rest shelter', '181'),
    createItem('s2', 'Central Library Safe Area Hub', 0.0039, -0.0011, 'Safe Zone', 'Well-lit public security zone', '1091'),
    createItem('s3', 'National Women Transit Shelter', -0.0048, -0.0032, 'Safe Zone', 'Temporary night security housing', '1091'),
    createItem('s4', 'Public Plaza Safe Haven Post', 0.0018, 0.0039, 'Safe Zone', 'Security guarded public area', '100'),
  ].sort((a, b) => a.distance - b.distance);
};

export default function NearbyHelp() {
  const { currentLocation, setLocation } = useApp();
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Selection/Map view states
  const [selectedService, setSelectedService] = useState(null); // 'Police Stations' | 'Hospitals' | 'Safe Zones'
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);

  // Auto-retrieve location on mount if not already present
  useEffect(() => {
    if (!currentLocation) {
      console.log('[SafeHer NearbyHelp] No current location in AppContext. Fetching live GPS...');
      getCurrentGPSLocation()
        .then((coords) => {
          console.log('[SafeHer NearbyHelp] GPS location auto-retrieved successfully:', coords);
          setLocation(coords);
        })
        .catch((err) => {
          console.warn('[SafeHer NearbyHelp] GPS location auto-retrieval failed, using Delhi fallback:', err.message);
        });
    }
  }, [currentLocation, setLocation]);
  
  // Maps API states
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [fetchingGPS, setFetchingGPS] = useState(false);

  const mapRef = useRef(null);
  const googleMapInstance = useRef(null);
  const markersRef = useRef([]);
  const radarCanvasRef = useRef(null);

  const baseLat = currentLocation?.latitude || 28.6139;
  const baseLng = currentLocation?.longitude || 77.2090;

  // Filter Helplines list
  const filteredHelplines = activeCategory === 'All'
    ? helpItems
    : helpItems.filter((h) => h.category === activeCategory);

  // Load places and trigger map rendering
  useEffect(() => {
    if (!selectedService) return;

    setFetchingGPS(true);
    const list = getNearbyResourcesList(selectedService, baseLat, baseLng);
    setPlaces(list);
    if (list.length > 0) setSelectedPlace(list[0]);
    
    // Simulate slight loading latency for UX realism
    const timer = setTimeout(() => {
      setFetchingGPS(false);
    }, 600);

    const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';
    if (!mapsApiKey) {
      setMapError(true);
    } else {
      loadGoogleMapsScript(mapsApiKey, () => {
        setMapLoaded(true);
        setMapError(false);
      });
    }

    return () => clearTimeout(timer);
  }, [selectedService, baseLat, baseLng]);

  // Google Map Initialization & markers wiring
  useEffect(() => {
    if (selectedService && mapLoaded && !mapError && mapRef.current && places.length > 0) {
      const center = { lat: baseLat, lng: baseLng };

      try {
        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#111122' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#111122' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#888899' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d0d1a' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1b1b33' }] },
          ],
        });
        googleMapInstance.current = map;

        // Reset existing markers
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];

        // Victim user location marker
        const userMarker = new window.google.maps.Marker({
          position: center,
          map,
          title: 'Your Location',
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#ec4899',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          }
        });
        markersRef.current.push(userMarker);

        // Add places markers
        places.forEach(item => {
          const marker = new window.google.maps.Marker({
            position: { lat: item.lat, lng: item.lng },
            map,
            title: item.name,
            icon: {
              url: item.category === 'Hospital'
                ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                : item.category === 'Police'
                ? 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                : 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            }
          });

          marker.addListener('click', () => {
            setSelectedPlace(item);
            map.panTo({ lat: item.lat, lng: item.lng });
          });

          markersRef.current.push(marker);
        });
      } catch (err) {
        console.warn('Google maps initialisation crashed, falling back to radar view:', err);
        setMapError(true);
      }
    }
  }, [selectedService, mapLoaded, mapError, places, baseLat, baseLng]);

  // Center maps on selected item
  useEffect(() => {
    if (googleMapInstance.current && selectedPlace) {
      googleMapInstance.current.panTo({ lat: selectedPlace.lat, lng: selectedPlace.lng });
    }
  }, [selectedPlace]);

  // Canvas radar animation sweep fallback (when Google Maps API key is missing)
  useEffect(() => {
    if (selectedService && (mapError || !mapLoaded) && radarCanvasRef.current && places.length > 0) {
      const canvas = radarCanvasRef.current;
      const ctx = canvas.getContext('2d');
      let animId;
      let angle = 0;

      const renderRadar = () => {
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(cx, cy) - 10;

        ctx.clearRect(0, 0, w, h);

        // Web grid
        ctx.strokeStyle = 'rgba(236,72,153,0.12)';
        ctx.lineWidth = 1;
        for (let r = radius / 3; r <= radius; r += radius / 3) {
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy);
        ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius);
        ctx.stroke();

        // Sweep cone
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        const sweepGrad = ctx.createRadialGradient(0,0,0, 0,0, radius);
        sweepGrad.addColorStop(0, 'rgba(236,72,153,0.25)');
        sweepGrad.addColorStop(0.5, 'rgba(236,72,153,0.04)');
        sweepGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = sweepGrad;
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.arc(0, 0, radius, -0.25, 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        angle = (angle + 0.015) % (2 * Math.PI);

        // Draw User Center dot
        ctx.fillStyle = '#ec4899';
        ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 2 * Math.PI); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();

        // Draw place dots
        places.forEach((item) => {
          const mapScale = radius / 0.008; // scale offset coordinates to fit radar
          const dx = (item.lng - baseLng) * mapScale;
          const dy = -(item.lat - baseLat) * mapScale;

          const px = cx + dx;
          const py = cy + dy;

          const isSelected = selectedPlace?.id === item.id;

          if (isSelected) {
            ctx.strokeStyle = 'rgba(236,72,153,0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px, py, 12 + (Date.now() % 800) / 75, 0, 2 * Math.PI);
            ctx.stroke();
          }

          ctx.fillStyle = item.category === 'Hospital' ? '#10b981' : item.category === 'Police' ? '#ef4444' : '#3b82f6';
          ctx.beginPath();
          ctx.arc(px, py, isSelected ? 6.5 : 4.5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        });

        animId = requestAnimationFrame(renderRadar);
      };

      renderRadar();
      return () => cancelAnimationFrame(animId);
    }
  }, [selectedService, mapError, mapLoaded, places, selectedPlace, baseLat, baseLng]);

  // Click handler on fallback Radar canvas to select markers
  const handleRadarClick = (e) => {
    if (!radarCanvasRef.current) return;
    const canvas = radarCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy) - 10;
    const mapScale = radius / 0.008;

    let closest = null;
    let minD = 18; // 18px click threshold

    places.forEach((item) => {
      const dx = (item.lng - baseLng) * mapScale;
      const dy = -(item.lat - baseLat) * mapScale;
      const px = cx + dx;
      const py = cy + dy;

      const d = Math.sqrt((clickX - px) ** 2 + (clickY - py) ** 2);
      if (d < minD) {
        minD = d;
        closest = item;
      }
    });

    if (closest) {
      setSelectedPlace(closest);
    }
  };

  const triggerExternalNavigation = (place) => {
    if (!place) return;
    const dirUrl = `https://www.google.com/maps/dir/?api=1&origin=${baseLat},${baseLng}&destination=${place.lat},${place.lng}&travelmode=walking`;
    window.open(dirUrl, '_blank');
  };

  return (
    <div className="px-4 pt-4 pb-6 space-y-6 max-w-2xl mx-auto lg:pt-6">
      
      {/* Page Header */}
      <div className="flex items-center gap-3">
        {selectedService && (
          <button
            onClick={() => { setSelectedService(null); setSelectedPlace(null); }}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
          >
            <ChevronLeft size={20} className="text-slate-300" />
          </button>
        )}
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-100">
            {selectedService ? `Nearby ${selectedService}` : 'Nearby Help'}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {selectedService ? `Locating local ${selectedService.toLowerCase()} inside app` : 'Emergency helplines & embedded map finders'}
          </p>
        </div>
      </div>

      {/* Main Area: Helpline grid or Map Dashboard */}
      {!selectedService ? (
        <>
          {/* Services Selector Cards Grid */}
          <div className="grid grid-cols-3 gap-3">
            {nearbyServices.map(({ icon: Icon, label, hint, color }) => (
              <button
                key={label}
                onClick={() => setSelectedService(label)}
                className="glass-card p-4 flex flex-col items-center gap-2 hover:border-white/10 transition-all text-center"
              >
                <Icon size={24} className={color} />
                <p className="text-xs font-semibold text-slate-200">{label}</p>
                <p className="text-[10px] text-slate-500">{hint}</p>
              </button>
            ))}
          </div>

          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeCategory === cat
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                    : 'glass-card text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Helplines list */}
          <div className="space-y-3">
            {filteredHelplines.map(({ id, name, number, desc, icon: Icon, color }) => (
              <GlassCard key={id} className="flex items-center gap-4 hover:border-white/10 transition-all">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                  <Icon size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-100 text-sm truncate">{name}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
                <a
                  href={`tel:${number}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 text-sm font-bold hover:bg-pink-500/20 transition-all flex-shrink-0"
                >
                  {number}
                </a>
              </GlassCard>
            ))}
          </div>
        </>
      ) : (
        /* Embedded Map & Places Dashboard View */
        <div className="space-y-5">
          {fetchingGPS ? (
            /* Loading Skeleton */
            <div className="w-full space-y-4">
              <div className="w-full h-64 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
              <div className="space-y-2">
                <div className="w-full h-16 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
                <div className="w-full h-16 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
              </div>
            </div>
          ) : (
            <>
              {/* Map Panel Wrapper */}
              <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-slate-950/80 aspect-[16/9] w-full">
                {!mapError && mapLoaded ? (
                  /* Embed Google Maps */
                  <div ref={mapRef} className="w-full h-full" />
                ) : (
                  /* canvas Radar Mock Map fallback */
                  <div className="relative w-full h-full flex items-center justify-center">
                    <canvas
                      ref={radarCanvasRef}
                      width={440}
                      height={248}
                      onClick={handleRadarClick}
                      className="bg-slate-950/90 w-full h-full cursor-crosshair"
                    />
                    
                    {/* Radar swept guide overlays */}
                    <div className="absolute top-3 left-3 bg-white/5 border border-white/10 rounded-lg p-2 flex items-center gap-1.5 pointer-events-none text-slate-400 text-[10px]">
                      <Compass size={11} className="text-pink-400 animate-spin" style={{ animationDuration: '4s' }} />
                      <span>Radar Active — Tap dots to select</span>
                    </div>

                    <div className="absolute bottom-3 right-3 bg-white/5 border border-white/10 rounded-lg p-1.5 pointer-events-none text-[8px] text-slate-500">
                      Google SDK Fallback Active
                    </div>
                  </div>
                )}
              </div>

              {/* Selected place details panel */}
              {selectedPlace && (
                <GlassCard className="border-pink-500/20 bg-pink-500/[0.01] p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-pink-500/10 border border-pink-500/20 text-pink-400 uppercase tracking-wider">
                        {selectedPlace.category}
                      </span>
                      <h3 className="font-bold text-slate-100 mt-1.5 text-base">{selectedPlace.name}</h3>
                      <p className="text-slate-400 text-xs mt-1 leading-relaxed">{selectedPlace.desc}</p>
                    </div>

                    {/* Calculated distance label */}
                    <div className="text-right flex flex-col items-end">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Distance</span>
                      <span className="text-lg font-display font-black text-pink-400 mt-0.5">
                        {selectedPlace.distance < 1
                          ? `${Math.round(selectedPlace.distance * 1000)} m`
                          : `${selectedPlace.distance.toFixed(2)} km`}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <a
                      href={`tel:${selectedPlace.phone}`}
                      className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-all"
                    >
                      <Phone size={14} /> Call Helpline ({selectedPlace.phone})
                    </a>

                    <button
                      onClick={() => triggerExternalNavigation(selectedPlace)}
                      className="py-3 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 text-pink-400 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-glow-pink"
                    >
                      <Navigation size={14} /> Navigate directions
                    </button>
                  </div>
                </GlassCard>
              )}

              {/* Places List below map */}
              <div className="space-y-3">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Info size={11} /> Nearby Locations List ({places.length} found)
                </p>

                {places.map((place) => {
                  const isSelected = selectedPlace?.id === place.id;
                  return (
                    <div
                      key={place.id}
                      onClick={() => setSelectedPlace(place)}
                      className={`glass-card p-3 rounded-2xl flex items-center justify-between cursor-pointer border transition-all ${
                        isSelected
                          ? 'border-pink-500/30 bg-pink-500/[0.01]'
                          : 'border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-300 truncate">{place.name}</p>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{place.desc}</p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold font-mono text-slate-400">
                          {place.distance < 1
                            ? `${Math.round(place.distance * 1000)}m`
                            : `${place.distance.toFixed(1)}km`}
                        </span>
                        <ChevronRight size={14} className="text-slate-500" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
