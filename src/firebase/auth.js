import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db, hasConfig } from './config';

// ── Mock Auth Manager for Local Demo Mode ────────────────────────────────────
let mockAuthListeners = [];

const triggerMockAuthChange = (user) => {
  console.log('[SafeHer Auth] Mock AuthState changed:', user ? user.email : 'Null (Signed Out)');
  mockAuthListeners.forEach((cb) => cb(user));
};

const getMockUsers = () => {
  try {
    const list = localStorage.getItem('safeher_mock_users');
    return list ? JSON.parse(list) : [];
  } catch {
    return [];
  }
};

const saveMockUsers = (users) => {
  try {
    localStorage.setItem('safeher_mock_users', JSON.stringify(users));
  } catch (err) {
    console.error('[SafeHer Auth] Failed to save mock users database:', err);
  }
};

// ── Recaptcha and OTP ────────────────────────────────────────────────────────
export const setupRecaptcha = (containerId) => {
  if (!hasConfig) {
    console.log('[SafeHer Auth] Mock Recaptcha setup.');
    return { clear: () => {} };
  }
  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear();
  }
  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {},
    'expired-callback': () => {},
  });
  return window.recaptchaVerifier;
};

export const sendOTP = async (phoneNumber, recaptchaVerifier) => {
  if (!hasConfig) {
    console.log('[SafeHer Auth] Mock OTP send to:', phoneNumber);
    return {
      confirm: async (otp) => {
        if (otp === '1234' || otp.length === 4) {
          const user = {
            uid: `mock-phone-uid-${phoneNumber.replace(/\D/g, '')}`,
            phoneNumber,
            displayName: 'Demo Phone User',
            email: `${phoneNumber.replace(/\D/g, '')}@safeher.demo`,
          };
          localStorage.setItem('safeher_mock_user', JSON.stringify(user));
          triggerMockAuthChange(user);
          return { user };
        }
        throw new Error('Invalid verification code');
      }
    };
  }
  const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
  return confirmation;
};

export const verifyOTP = async (confirmationResult, otp) => {
  const result = await confirmationResult.confirm(otp);
  return result.user;
};

// ── Sign Up ──
export const registerUser = async (email, password, displayName) => {
  if (!hasConfig) {
    console.log('[SafeHer Auth] Registering mock user:', email);
    const users = getMockUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      const err = new Error('Email already in use');
      err.code = 'auth/email-already-in-use';
      throw err;
    }

    const mockUser = {
      uid: `mock-uid-${Date.now()}`,
      email: email.trim(),
      displayName: displayName.trim(),
      createdAt: new Date().toISOString(),
      emergencyContacts: [],
      settings: { sosAutoSend: true, fakeCallEnabled: true, sirenEnabled: true },
    };

    // Save to users database and set active user session
    users.push({ ...mockUser, password });
    saveMockUsers(users);
    localStorage.setItem('safeher_mock_user', JSON.stringify(mockUser));
    triggerMockAuthChange(mockUser);
    return mockUser;
  }

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await setDoc(doc(db, 'users', cred.user.uid), {
    uid: cred.user.uid,
    email,
    displayName,
    createdAt: new Date().toISOString(),
    emergencyContacts: [],
    settings: { sosAutoSend: true, fakeCallEnabled: true, sirenEnabled: true },
  });
  return cred.user;
};

// ── Sign In ──
export const loginUser = async (email, password) => {
  if (!hasConfig) {
    console.log('[SafeHer Auth] Logging in mock user:', email);
    const users = getMockUsers();
    const found = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!found) {
      const err = new Error('Invalid email or password');
      err.code = 'auth/invalid-credential';
      throw err;
    }

    const userSession = {
      uid: found.uid,
      email: found.email,
      displayName: found.displayName,
      settings: found.settings || { sosAutoSend: true, fakeCallEnabled: true, sirenEnabled: true },
    };

    localStorage.setItem('safeher_mock_user', JSON.stringify(userSession));
    triggerMockAuthChange(userSession);
    return userSession;
  }

  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
};

// ── Sign Out ──
export const logoutUser = async () => {
  if (!hasConfig) {
    console.log('[SafeHer Auth] Logging out mock user.');
    localStorage.removeItem('safeher_mock_user');
    triggerMockAuthChange(null);
    return;
  }
  await signOut(auth);
};

// ── Profiles ──
export const getUserProfile = async (uid) => {
  if (!hasConfig) {
    console.log('[SafeHer Auth] Fetching mock user profile:', uid);
    const session = localStorage.getItem('safeher_mock_user');
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.uid === uid) return parsed;
    }
    const users = getMockUsers();
    const found = users.find((u) => u.uid === uid);
    return found ? { uid: found.uid, email: found.email, displayName: found.displayName, settings: found.settings } : null;
  }

  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};

export const updateUserProfile = async (uid, data) => {
  if (!hasConfig) {
    console.log('[SafeHer Auth] Updating mock user profile:', uid, data);
    const session = localStorage.getItem('safeher_mock_user');
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.uid === uid) {
        const updated = { ...parsed, ...data };
        localStorage.setItem('safeher_mock_user', JSON.stringify(updated));
        triggerMockAuthChange(updated);
      }
    }
    const users = getMockUsers();
    const updatedUsers = users.map((u) => (u.uid === uid ? { ...u, ...data } : u));
    saveMockUsers(updatedUsers);
    return;
  }

  await updateDoc(doc(db, 'users', uid), data);
};

// ── Auth Change Subscriber ──
export const onAuthChange = (callback) => {
  if (!hasConfig) {
    console.log('[SafeHer Auth] Subscribed mock auth change listener.');
    mockAuthListeners.push(callback);
    // Emit initial cached state immediately
    const cached = localStorage.getItem('safeher_mock_user');
    try {
      callback(cached ? JSON.parse(cached) : null);
    } catch {
      callback(null);
    }

    return () => {
      mockAuthListeners = mockAuthListeners.filter((cb) => cb !== callback);
      console.log('[SafeHer Auth] Unsubscribed mock auth change listener.');
    };
  }

  return onAuthStateChanged(auth, callback);
};

