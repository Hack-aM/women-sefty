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
import { auth, db } from './config';

export const setupRecaptcha = (containerId) => {
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
  const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
  return confirmation;
};

export const verifyOTP = async (confirmationResult, otp) => {
  const result = await confirmationResult.confirm(otp);
  return result.user;
};

export const registerUser = async (email, password, displayName) => {
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

export const loginUser = async (email, password) => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
};

export const logoutUser = () => signOut(auth);

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};

export const updateUserProfile = async (uid, data) => {
  await updateDoc(doc(db, 'users', uid), data);
};

export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);
