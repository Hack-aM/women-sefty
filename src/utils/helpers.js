// Utility: generate a simple colored SVG icon as a data URI
// Used in place of real PNG icons during development

export const generateIconSVG = (size = 192) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="${size}" y2="${size}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ec4899"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.25}" fill="url(#g)"/>
  <path d="M${size/2} ${size*0.19} L${size*0.75} ${size*0.31} L${size*0.75} ${size*0.53}
           C${size*0.75} ${size*0.67} ${size*0.63} ${size*0.78} ${size/2} ${size*0.81}
           C${size*0.37} ${size*0.78} ${size*0.25} ${size*0.67} ${size*0.25} ${size*0.53}
           L${size*0.25} ${size*0.31} Z"
    fill="rgba(255,255,255,0.95)"/>
</svg>`;

export const formatCoords = (lat, lng) =>
  `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}°${lng >= 0 ? 'E' : 'W'}`;

export const formatDistance = (meters) =>
  meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;

export const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const debounce = (fn, delay) => {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
};

export const validatePhone = (phone) => /^[+]?[\d\s\-()]{10,15}$/.test(phone.trim());

export const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const getInitials = (name) =>
  (name || 'U').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

export const timeAgo = (date) => {
  const secs = Math.floor((Date.now() - new Date(date)) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
};
