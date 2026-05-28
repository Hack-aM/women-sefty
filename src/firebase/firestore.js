import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  setDoc,
  serverTimestamp,
  getCountFromServer,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, hasConfig } from './config';

// ── Emergency Contacts ───────────────────────────────────────────────────────

const getLocalContacts = (uid) => {
  try {
    const key = `safeher_contacts_${uid}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('[SafeHer] LocalStorage read failed:', err);
    return [];
  }
};

const saveLocalContacts = (uid, contacts) => {
  try {
    const key = `safeher_contacts_${uid}`;
    localStorage.setItem(key, JSON.stringify(contacts));
  } catch (err) {
    console.error('[SafeHer] LocalStorage write failed:', err);
  }
};

export const getContacts = async (uid) => {
  if (!hasConfig) {
    return getLocalContacts(uid);
  }
  try {
    const q = query(collection(db, 'users', uid, 'contacts'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('[SafeHer] Firestore getContacts failed, falling back to LocalStorage:', err);
    return getLocalContacts(uid);
  }
};

export const addContact = async (uid, contact) => {
  if (!hasConfig) {
    const local = getLocalContacts(uid);
    const newId = `local-${Date.now()}`;
    const newContact = { id: newId, ...contact, createdAt: new Date().toISOString() };
    saveLocalContacts(uid, [newContact, ...local]);
    return newId;
  }
  try {
    const ref2 = await addDoc(collection(db, 'users', uid, 'contacts'), {
      ...contact,
      createdAt: serverTimestamp(),
    });
    return ref2.id;
  } catch (err) {
    console.warn('[SafeHer] Firestore addContact failed, falling back to LocalStorage:', err);
    const local = getLocalContacts(uid);
    const newId = `local-${Date.now()}`;
    const newContact = { id: newId, ...contact, createdAt: new Date().toISOString() };
    saveLocalContacts(uid, [newContact, ...local]);
    return newId;
  }
};

export const updateContact = async (uid, contactId, data) => {
  if (!hasConfig || contactId.startsWith('local-')) {
    const local = getLocalContacts(uid);
    const updated = local.map((c) => (c.id === contactId ? { ...c, ...data } : c));
    saveLocalContacts(uid, updated);
    return;
  }
  try {
    await updateDoc(doc(db, 'users', uid, 'contacts', contactId), data);
  } catch (err) {
    console.warn('[SafeHer] Firestore updateContact failed, falling back to LocalStorage:', err);
    const local = getLocalContacts(uid);
    const updated = local.map((c) => (c.id === contactId ? { ...c, ...data } : c));
    saveLocalContacts(uid, updated);
  }
};

export const deleteContact = async (uid, contactId) => {
  if (!hasConfig || contactId.startsWith('local-')) {
    const local = getLocalContacts(uid);
    const filtered = local.filter((c) => c.id !== contactId);
    saveLocalContacts(uid, filtered);
    return;
  }
  try {
    await deleteDoc(doc(db, 'users', uid, 'contacts', contactId));
  } catch (err) {
    console.warn('[SafeHer] Firestore deleteContact failed, falling back to LocalStorage:', err);
    const local = getLocalContacts(uid);
    const filtered = local.filter((c) => c.id !== contactId);
    saveLocalContacts(uid, filtered);
  }
};

// ── SOS Alerts ───────────────────────────────────────────────────────────────

// In-memory mock store for demo/offline simulation
const localSOSStore = {
  alerts: {},
  breadcrumbs: {},
  logs: {},
  listeners: {} // alertId -> array of functions
};

const notifySOSListeners = (alertId) => {
  const listeners = localSOSStore.listeners[alertId] || [];
  const alert = localSOSStore.alerts[alertId];
  if (alert) {
    listeners.forEach((cb) => cb(alert));
  }
};

export const createSOSAlert = async (uid, location, contacts = []) => {
  const alertData = {
    uid,
    location: location || null,
    contacts: contacts.map((c) => ({ name: c.name, phone: c.phone, status: 'sent' })),
    timestamp: hasConfig ? serverTimestamp() : new Date().toISOString(),
    status: 'active',
  };

  if (!hasConfig) {
    const alertId = `demo-sos-${Date.now()}`;
    localSOSStore.alerts[alertId] = { id: alertId, ...alertData, timestamp: new Date() };
    localSOSStore.breadcrumbs[alertId] = [];
    localSOSStore.logs[alertId] = [
      { event: 'SOS Alert Triggered', timestamp: new Date(), location }
    ];
    return alertId;
  }

  const docRef = await addDoc(collection(db, 'sos_alerts'), alertData);
  // Also log the initial event
  await addSOSLogEvent(docRef.id, 'SOS Alert Triggered', location, { mode: 'manual' });
  return docRef.id;
};

export const resolveSOSAlert = async (alertId) => {
  if (!hasConfig || alertId.startsWith('demo-') || alertId.startsWith('offline-') || alertId.startsWith('fallback-')) {
    if (localSOSStore.alerts[alertId]) {
      localSOSStore.alerts[alertId].status = 'resolved';
      localSOSStore.alerts[alertId].resolvedAt = new Date();
      localSOSStore.logs[alertId]?.push({
        event: 'SOS Alert Resolved',
        timestamp: new Date()
      });
      notifySOSListeners(alertId);
    }
    return;
  }
  await updateDoc(doc(db, 'sos_alerts', alertId), {
    status:     'resolved',
    resolvedAt: serverTimestamp(),
  });
  await addSOSLogEvent(alertId, 'SOS Alert Resolved');
};

export const addSOSBreadcrumb = async (alertId, coords) => {
  const breadcrumb = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy || null,
    timestamp: hasConfig ? serverTimestamp() : new Date().toISOString(),
  };

  if (!hasConfig || alertId.startsWith('demo-') || alertId.startsWith('offline-') || alertId.startsWith('fallback-')) {
    if (localSOSStore.breadcrumbs[alertId]) {
      localSOSStore.breadcrumbs[alertId].push(breadcrumb);
      if (localSOSStore.alerts[alertId]) {
        localSOSStore.alerts[alertId].location = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy
        };
        notifySOSListeners(alertId);
      }
    }
    return;
  }

  // Write subcollection document
  await addDoc(collection(db, 'sos_alerts', alertId, 'breadcrumbs'), breadcrumb);
  
  // Also update the main active location for quick querying
  await updateDoc(doc(db, 'sos_alerts', alertId), {
    location: {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy || null,
    },
    updatedAt: serverTimestamp()
  });
};

export const addSOSLogEvent = async (alertId, eventName, location = null, details = null) => {
  const logEvent = {
    event: eventName,
    location: location || null,
    details: details || null,
    timestamp: hasConfig ? serverTimestamp() : new Date().toISOString(),
  };

  if (!hasConfig || alertId.startsWith('demo-') || alertId.startsWith('offline-') || alertId.startsWith('fallback-')) {
    if (localSOSStore.logs[alertId]) {
      localSOSStore.logs[alertId].push(logEvent);
    }
    return;
  }

  await addDoc(collection(db, 'sos_alerts', alertId, 'logs'), logEvent);
};

export const updateContactStatusInAlert = async (alertId, phone, status) => {
  if (!hasConfig || alertId.startsWith('demo-') || alertId.startsWith('offline-') || alertId.startsWith('fallback-')) {
    const alert = localSOSStore.alerts[alertId];
    if (alert && alert.contacts) {
      alert.contacts = alert.contacts.map((c) => 
        c.phone === phone ? { ...c, status } : c
      );
      localSOSStore.logs[alertId]?.push({
        event: `Contact Status Updated: ${status}`,
        details: { phone, status },
        timestamp: new Date()
      });
      notifySOSListeners(alertId);
    }
    return;
  }

  const alertRef = doc(db, 'sos_alerts', alertId);
  const snap = await getDoc(alertRef);
  if (snap.exists()) {
    const data = snap.data();
    const contacts = data.contacts || [];
    const updated = contacts.map((c) => {
      // Compare clean phone strings
      const cPhone = c.phone.replace(/\D/g, '');
      const targetPhone = phone.replace(/\D/g, '');
      if (cPhone === targetPhone || c.phone === phone) {
        return { ...c, status };
      }
      return c;
    });

    await updateDoc(alertRef, { contacts: updated });
    await addSOSLogEvent(alertId, `Contact Status Updated: ${status}`, null, { phone, status });
  }
};

export const updateSOSAlertAudio = async (alertId, audioUrl, metadata = {}) => {
  if (!hasConfig || alertId.startsWith('demo-') || alertId.startsWith('offline-') || alertId.startsWith('fallback-')) {
    const alert = localSOSStore.alerts[alertId];
    if (alert) {
      alert.audioUrl = audioUrl;
      alert.audioMetadata = metadata;
      localSOSStore.logs[alertId]?.push({
        event: 'Audio Evidence Saved',
        details: { audioUrl, ...metadata },
        timestamp: new Date()
      });
      notifySOSListeners(alertId);
    }
    return;
  }

  await updateDoc(doc(db, 'sos_alerts', alertId), {
    audioUrl,
    audioMetadata: metadata,
    updatedAt: serverTimestamp()
  });

  await addSOSLogEvent(alertId, 'Audio Evidence Saved', null, { audioUrl, ...metadata });
};

export const subscribeToSOSAlert = (alertId, callback) => {
  if (!hasConfig || alertId.startsWith('demo-') || alertId.startsWith('offline-') || alertId.startsWith('fallback-')) {
    if (!localSOSStore.listeners[alertId]) {
      localSOSStore.listeners[alertId] = [];
    }
    localSOSStore.listeners[alertId].push(callback);
    // Initial trigger
    const alert = localSOSStore.alerts[alertId];
    if (alert) callback(alert);

    return () => {
      localSOSStore.listeners[alertId] = localSOSStore.listeners[alertId].filter(
        (cb) => cb !== callback
      );
    };
  }

  return onSnapshot(doc(db, 'sos_alerts', alertId), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    }
  });
};

export const subscribeToSOSLogs = (alertId, callback) => {
  if (!hasConfig || alertId.startsWith('demo-') || alertId.startsWith('offline-') || alertId.startsWith('fallback-')) {
    // Simple polling/interval for simulation
    const interval = setInterval(() => {
      const logs = localSOSStore.logs[alertId] || [];
      callback([...logs]);
    }, 1000);
    callback(localSOSStore.logs[alertId] || []);
    return () => clearInterval(interval);
  }

  const q = query(
    collection(db, 'sos_alerts', alertId, 'logs'),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const subscribeToSOSBreadcrumbs = (alertId, callback) => {
  if (!hasConfig || alertId.startsWith('demo-') || alertId.startsWith('offline-') || alertId.startsWith('fallback-')) {
    const interval = setInterval(() => {
      const crumbs = localSOSStore.breadcrumbs[alertId] || [];
      callback([...crumbs]);
    }, 1000);
    callback(localSOSStore.breadcrumbs[alertId] || []);
    return () => clearInterval(interval);
  }

  const q = query(
    collection(db, 'sos_alerts', alertId, 'breadcrumbs'),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const getSOSHistory = async (uid, maxResults = 20) => {
  if (!hasConfig) {
    return Object.values(localSOSStore.alerts)
      .filter((a) => a.uid === uid)
      .sort((a, b) => b.timestamp - a.timestamp);
  }
  const q = query(
    collection(db, 'sos_alerts'),
    where('uid', '==', uid),
    orderBy('timestamp', 'desc'),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const subscribeSOSAlerts = (uid, callback) => {
  if (!hasConfig) {
    const interval = setInterval(() => {
      const list = Object.values(localSOSStore.alerts)
        .filter((a) => a.uid === uid)
        .sort((a, b) => b.timestamp - a.timestamp);
      callback(list);
    }, 2000);
    return () => clearInterval(interval);
  }
  const q = query(
    collection(db, 'sos_alerts'),
    where('uid', '==', uid),
    orderBy('timestamp', 'desc'),
    limit(10)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

// ── Live Location ─────────────────────────────────────────────────────────────

export const updateLiveLocation = async (uid, coords) => {
  await setDoc(doc(db, 'live_locations', uid), {
    uid,
    lat:       coords.latitude,
    lng:       coords.longitude,
    accuracy:  coords.accuracy,
    updatedAt: serverTimestamp(),
    isTracking: true,
  });
};

export const stopLiveLocation = async (uid) => {
  await updateDoc(doc(db, 'live_locations', uid), { isTracking: false });
};

export const subscribeToLocation = (uid, callback) => {
  return onSnapshot(doc(db, 'live_locations', uid), (snap) => {
    if (snap.exists()) callback(snap.data());
  });
};

// ── Incident Reports ──────────────────────────────────────────────────────────

/**
 * @param {string} uid
 * @param {{type, description, location, audioBlob?: Blob, imageFile?: File}} data
 */
export const saveIncidentReport = async (uid, data) => {
  const payload = {
    uid,
    type:        data.type,
    description: data.description,
    location:    data.location || null,
    status:      'submitted',
    timestamp:   serverTimestamp(),
  };

  // Upload image if provided
  if (data.imageFile) {
    try {
      const imgRef = ref(storage, `incidents/${uid}/${Date.now()}_photo`);
      await uploadBytes(imgRef, data.imageFile);
      payload.imageUrl = await getDownloadURL(imgRef);
    } catch { /* storage not configured */ }
  }

  // Upload audio if provided
  if (data.audioBlob) {
    try {
      const audRef = ref(storage, `incidents/${uid}/${Date.now()}_audio.webm`);
      await uploadBytes(audRef, data.audioBlob);
      payload.audioUrl = await getDownloadURL(audRef);
    } catch { /* storage not configured */ }
  }

  const docRef = await addDoc(collection(db, 'incidents'), payload);
  return docRef.id;
};

export const getIncidentReports = async (uid) => {
  const q = query(
    collection(db, 'incidents'),
    where('uid', '==', uid),
    orderBy('timestamp', 'desc'),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ── Admin Helpers ─────────────────────────────────────────────────────────────

export const getAdminStats = async () => {
  try {
    const [sosSnap, incidentSnap] = await Promise.all([
      getCountFromServer(collection(db, 'sos_alerts')),
      getCountFromServer(collection(db, 'incidents')),
    ]);

    const activeQ = query(collection(db, 'sos_alerts'), where('status', '==', 'active'));
    const activeSnap = await getCountFromServer(activeQ);

    const recentSOS = await getDocs(
      query(collection(db, 'sos_alerts'), orderBy('timestamp', 'desc'), limit(5))
    );
    const recentIncidents = await getDocs(
      query(collection(db, 'incidents'), orderBy('timestamp', 'desc'), limit(5))
    );

    return {
      totalSOS:         sosSnap.data().count,
      totalIncidents:   incidentSnap.data().count,
      activeSOS:        activeSnap.data().count,
      recentSOS:        recentSOS.docs.map((d) => ({ id: d.id, ...d.data() })),
      recentIncidents:  recentIncidents.docs.map((d) => ({ id: d.id, ...d.data() })),
    };
  } catch {
    return { totalSOS: 0, totalIncidents: 0, activeSOS: 0, recentSOS: [], recentIncidents: [] };
  }
};

// ── FCM Token ─────────────────────────────────────────────────────────────────

export const saveFCMToken = async (uid, token) => {
  await setDoc(
    doc(db, 'fcm_tokens', uid),
    { token, updatedAt: serverTimestamp(), uid },
    { merge: true }
  );
};

// ── User Settings ─────────────────────────────────────────────────────────────

export const updateSettings = async (uid, settings) => {
  await updateDoc(doc(db, 'users', uid), { settings });
};

export const getSOSBreadcrumbs = async (alertId) => {
  if (!hasConfig || alertId.startsWith('demo-') || alertId.startsWith('offline-') || alertId.startsWith('fallback-')) {
    return localSOSStore.breadcrumbs[alertId] || [];
  }
  const q = query(
    collection(db, 'sos_alerts', alertId, 'breadcrumbs'),
    orderBy('timestamp', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
};

export const getSOSLogs = async (alertId) => {
  if (!hasConfig || alertId.startsWith('demo-') || alertId.startsWith('offline-') || alertId.startsWith('fallback-')) {
    return localSOSStore.logs[alertId] || [];
  }
  const q = query(
    collection(db, 'sos_alerts', alertId, 'logs'),
    orderBy('timestamp', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
};
