import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if any key is missing or contains placeholder values
const isPlaceholder = (val) => {
  if (!val) return true;
  const s = String(val).toLowerCase();
  return s.includes('your_') || s.includes('here') || s.includes('project_id') || s.includes('sender_id') || s.includes('app_id');
};

const hasConfig = Object.values(firebaseConfig).every(val => val && !isPlaceholder(val));

let app = null;
let auth = null;
let db = null;
let storage = null;

if (!hasConfig) {
  console.log('%c🛡️ [SafeHer] Firebase configuration is incomplete or contains placeholder keys. Running in Local Demo Mode.', 'color: #ea580c; font-weight: bold;');
  console.warn(
    '[SafeHer] To run in Production Mode, copy .env.example -> .env and fill in real Firebase values.'
  );
} else {
  try {
    console.log('%c✓ [SafeHer] Initializing Firebase in Production Mode.', 'color: #16a34a; font-weight: bold;');
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (err) {
    console.error('[SafeHer] Firebase initialization failed. Falling back to Demo Mode:', err);
    app = null;
    auth = null;
    db = null;
    storage = null;
  }
}

export { auth, db, storage, hasConfig };
export default app;

