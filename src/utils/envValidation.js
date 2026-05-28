/**
 * envValidation.js — Validates required environment variables for SafeHer.
 * Gracefully logs missing parameters and flags demo status to prevent app crashes.
 */

export const validateEnvironment = () => {
  const firebaseConfig = {
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  };

  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;

  const missingFirebase = Object.entries(firebaseConfig)
    .filter(([_, val]) => !val)
    .map(([key]) => key);

  console.log('%c🛡️ SafeHer Environment Check', 'color: #ec4899; font-weight: bold; font-size: 14px;');

  if (missingFirebase.length > 0) {
    console.warn(
      `[SafeHer Warning] Missing Firebase environment variables: ${missingFirebase.join(', ')}.\n` +
      `The application will launch in DEMO MODE with local simulated databases.`
    );
  } else {
    console.log('%c✓ Firebase configuration is complete.', 'color: #10b981;');
  }

  if (!mapsApiKey) {
    console.warn(
      `[SafeHer Warning] VITE_GOOGLE_MAPS_KEY is missing in your .env file.\n` +
      `The app will automatically fall back to an interactive radar-sweep canvas for Safe Zones & location tracking.`
    );
  } else {
    console.log('%c✓ Google Maps API key loaded.', 'color: #10b981;');
  }

  // Check browser capability support
  const capabilities = {
    geolocation: 'geolocation' in navigator,
    notifications: 'Notification' in window,
    serviceWorker: 'serviceWorker' in navigator,
    mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    vibration: 'vibrate' in navigator,
  };

  console.log('Device Capabilities:', capabilities);

  return {
    isDemoMode: missingFirebase.length > 0,
    hasMapsKey: !!mapsApiKey,
    capabilities,
  };
};
