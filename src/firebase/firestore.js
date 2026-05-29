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
    const parsed = data ? JSON.parse(data) : [];
    console.log(`[SafeHer LocalStorage] Read ${parsed.length} contacts for user:`, uid);
    return parsed;
  } catch (err) {
    console.error('[SafeHer LocalStorage] Read contacts failed:', err);
    return [];
  }
};

const saveLocalContacts = (uid, contacts) => {
  try {
    const key = `safeher_contacts_${uid}`;
    localStorage.setItem(key, JSON.stringify(contacts));
    console.log(`[SafeHer LocalStorage] Saved ${contacts.length} contacts for user:`, uid);
  } catch (err) {
    console.error('[SafeHer LocalStorage] Write contacts failed:', err);
  }
};

export const getContacts = async (uid) => {
  console.log('[SafeHer Firestore] getContacts requested for uid:', uid);
  if (!hasConfig) {
    return getLocalContacts(uid);
  }
  try {
    const q = query(collection(db, 'users', uid, 'contacts'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log(`[SafeHer Firestore] getContacts success. Loaded ${list.length} contacts.`);
    return list;
  } catch (err) {
    console.warn('[SafeHer] Firestore getContacts failed, falling back to LocalStorage:', err);
    return getLocalContacts(uid);
  }
};

export const addContact = async (uid, contact) => {
  console.log('[SafeHer Firestore] addContact requested for uid:', uid, contact);
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
    console.log('[SafeHer Firestore] addContact success. Doc ID:', ref2.id);
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
  console.log('[SafeHer Firestore] updateContact requested for uid:', uid, 'contactId:', contactId);
  if (!hasConfig || contactId.startsWith('local-')) {
    const local = getLocalContacts(uid);
    const updated = local.map((c) => (c.id === contactId ? { ...c, ...data } : c));
    saveLocalContacts(uid, updated);
    return;
  }
  try {
    await updateDoc(doc(db, 'users', uid, 'contacts', contactId), data);
    console.log('[SafeHer Firestore] updateContact success.');
  } catch (err) {
    console.warn('[SafeHer] Firestore updateContact failed, falling back to LocalStorage:', err);
    const local = getLocalContacts(uid);
    const updated = local.map((c) => (c.id === contactId ? { ...c, ...data } : c));
    saveLocalContacts(uid, updated);
  }
};

export const deleteContact = async (uid, contactId) => {
  console.log('[SafeHer Firestore] deleteContact requested for uid:', uid, 'contactId:', contactId);
  if (!hasConfig || contactId.startsWith('local-')) {
    const local = getLocalContacts(uid);
    const filtered = local.filter((c) => c.id !== contactId);
    saveLocalContacts(uid, filtered);
    return;
  }
  try {
    await deleteDoc(doc(db, 'users', uid, 'contacts', contactId));
    console.log('[SafeHer Firestore] deleteContact success.');
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
  console.log('[SafeHer Firestore] createSOSAlert requested:', { uid, location, contactsCount: contacts.length });
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
    console.log('[SafeHer Firestore] Mock SOS alert created. Alert ID:', alertId);
    return alertId;
  }

  try {
    const docRef = await addDoc(collection(db, 'sos_alerts'), alertData);
    console.log('[SafeHer Firestore] SOS Alert document created. ID:', docRef.id);
    // Also log the initial event
    await addSOSLogEvent(docRef.id, 'SOS Alert Triggered', location, { mode: 'manual' });
    return docRef.id;
  } catch (err) {
    console.error('[SafeHer Firestore] Failed to create Firestore SOS Alert, falling back to local simulation:', err);
    const alertId = `fallback-sos-${Date.now()}`;
    localSOSStore.alerts[alertId] = { id: alertId, ...alertData, timestamp: new Date() };
    localSOSStore.breadcrumbs[alertId] = [];
    localSOSStore.logs[alertId] = [
      { event: 'SOS Alert Triggered (Local Fallback)', timestamp: new Date(), location }
    ];
    return alertId;
  }
};

export const resolveSOSAlert = async (alertId) => {
  console.log('[SafeHer Firestore] resolveSOSAlert requested:', alertId);
  if (!hasConfig || alertId.startsWith('demo-') || alertId.startsWith('offline-') || alertId.startsWith('fallback-')) {
    if (localSOSStore.alerts[alertId]) {
      localSOSStore.alerts[alertId].status = 'resolved';
      localSOSStore.alerts[alertId].resolvedAt = new Date();
      localSOSStore.logs[alertId]?.push({
        event: 'SOS Alert Resolved',
        timestamp: new Date()
      });
      notifySOSListeners(alertId);
      console.log('[SafeHer Firestore] Mock SOS alert resolved.');
    }
    return;
  }
  try {
    await updateDoc(doc(db, 'sos_alerts', alertId), {
      status:     'resolved',
      resolvedAt: serverTimestamp(),
    });
    await addSOSLogEvent(alertId, 'SOS Alert Resolved');
    console.log('[SafeHer Firestore] Firestore SOS alert resolved.');
  } catch (err) {
    console.error('[SafeHer Firestore] Failed to resolve Firestore SOS alert, updating local mock:', err);
    if (localSOSStore.alerts[alertId]) {
      localSOSStore.alerts[alertId].status = 'resolved';
      localSOSStore.alerts[alertId].resolvedAt = new Date();
      notifySOSListeners(alertId);
    }
  }
};

export const addSOSBreadcrumb = async (alertId, coords) => {
  const breadcrumb = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy || null,
    timestamp: hasConfig ? serverTimestamp() : new Date().toISOString(),
  };

  if (!hasConfig || alertId.startsWith('demo-') || alertId.startsWith('offline-') || alertId.startsWith('fallback-')) {
    if (!localSOSStore.breadcrumbs[alertId]) {
      localSOSStore.breadcrumbs[alertId] = [];
    }
    localSOSStore.breadcrumbs[alertId].push(breadcrumb);
    if (localSOSStore.alerts[alertId]) {
      localSOSStore.alerts[alertId].location = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy
      };
      notifySOSListeners(alertId);
    }
    return;
  }

  try {
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
  } catch (err) {
    console.warn('[SafeHer Firestore] Failed to add online breadcrumb, saving locally:', err);
    if (!localSOSStore.breadcrumbs[alertId]) {
      localSOSStore.breadcrumbs[alertId] = [];
    }
    localSOSStore.breadcrumbs[alertId].push(breadcrumb);
  }
};

export const addSOSLogEvent = async (alertId, eventName, location = null, details = null) => {
  const logEvent = {
    event: eventName,
    location: location || null,
    details: details || null,
    timestamp: hasConfig ? serverTimestamp() : new Date().toISOString(),
  };

  if (!hasConfig || alertId.startsWith('demo-') || alertId.startsWith('offline-') || alertId.startsWith('fallback-')) {
    if (!localSOSStore.logs[alertId]) {
      localSOSStore.logs[alertId] = [];
    }
    localSOSStore.logs[alertId].push(logEvent);
    return;
  }

  try {
    await addDoc(collection(db, 'sos_alerts', alertId, 'logs'), logEvent);
  } catch (err) {
    console.warn('[SafeHer Firestore] Failed to write log event online:', err);
    if (!localSOSStore.logs[alertId]) {
      localSOSStore.logs[alertId] = [];
    }
    localSOSStore.logs[alertId].push(logEvent);
  }
};

export const updateContactStatusInAlert = async (alertId, phone, status) => {
  console.log('[SafeHer Firestore] updateContactStatusInAlert:', { alertId, phone, status });
  if (!hasConfig || alertId.startsWith('demo-') || alertId.startsWith('offline-') || alertId.startsWith('fallback-')) {
    const alert = localSOSStore.alerts[alertId];
    if (alert && alert.contacts) {
      alert.contacts = alert.contacts.map((c) => 
        c.phone === phone ? { ...c, status } : c
      );
      if (!localSOSStore.logs[alertId]) {
        localSOSStore.logs[alertId] = [];
      }
      localSOSStore.logs[alertId].push({
        event: `Contact Status Updated: ${status}`,
        details: { phone, status },
        timestamp: new Date()
      });
      notifySOSListeners(alertId);
    }
    return;
  }

  try {
    const alertRef = doc(db, 'sos_alerts', alertId);
    const snap = await getDoc(alertRef);
    if (snap.exists()) {
      const data = snap.data();
      const contacts = data.contacts || [];
      const updated = contacts.map((c) => {
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
  } catch (err) {
    console.error('[SafeHer Firestore] Failed to update contact status online:', err);
  }
};

export const updateSOSAlertAudio = async (alertId, audioUrl, metadata = {}) => {
  console.log('[SafeHer Firestore] updateSOSAlertAudio:', alertId);
  if (!hasConfig || alertId.startsWith('demo-') || alertId.startsWith('offline-') || alertId.startsWith('fallback-')) {
    const alert = localSOSStore.alerts[alertId];
    if (alert) {
      alert.audioUrl = audioUrl;
      alert.audioMetadata = metadata;
      if (!localSOSStore.logs[alertId]) {
        localSOSStore.logs[alertId] = [];
      }
      localSOSStore.logs[alertId].push({
        event: 'Audio Evidence Saved',
        details: { audioUrl, ...metadata },
        timestamp: new Date()
      });
      notifySOSListeners(alertId);
    }
    return;
  }

  try {
    await updateDoc(doc(db, 'sos_alerts', alertId), {
      audioUrl,
      audioMetadata: metadata,
      updatedAt: serverTimestamp()
    });
    await addSOSLogEvent(alertId, 'Audio Evidence Saved', null, { audioUrl, ...metadata });
  } catch (err) {
    console.error('[SafeHer Firestore] Failed to update SOS audio:', err);
  }
};

export const subscribeToSOSAlert = (alertId, callback) => {
  if (!hasConfig || alertId.startsWith('demo-') || alertId.startsWith('offline-') || alertId.startsWith('fallback-')) {
    if (!localSOSStore.listeners[alertId]) {
      localSOSStore.listeners[alertId] = [];
    }
    localSOSStore.listeners[alertId].push(callback);
    // Trigger initial broadcast
    const alert = localSOSStore.alerts[alertId];
    if (alert) callback(alert);

    return () => {
      localSOSStore.listeners[alertId] = localSOSStore.listeners[alertId].filter(
        (cb) => cb !== callback
      );
    };
  }

  try {
    return onSnapshot(doc(db, 'sos_alerts', alertId), (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() });
      }
    });
  } catch (err) {
    console.error('[SafeHer Firestore] onSnapshot alert subscribe failed, fallback to mock:', err);
    // fallback subscribe
    if (!localSOSStore.listeners[alertId]) localSOSStore.listeners[alertId] = [];
    localSOSStore.listeners[alertId].push(callback);
    return () => {
      localSOSStore.listeners[alertId] = localSOSStore.listeners[alertId].filter(cb => cb !== callback);
    };
  }
};

export const subscribeToSOSLogs = (alertId, callback) => {
  if (!hasConfig || alertId.startsWith('demo-') || alertId.startsWith('offline-') || alertId.startsWith('fallback-')) {
    const interval = setInterval(() => {
      const logs = localSOSStore.logs[alertId] || [];
      callback([...logs]);
    }, 1000);
    callback(localSOSStore.logs[alertId] || []);
    return () => clearInterval(interval);
  }

  try {
    const q = query(
      collection(db, 'sos_alerts', alertId, 'logs'),
      orderBy('timestamp', 'asc')
    );
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  } catch (err) {
    console.error('[SafeHer Firestore] subscribeToSOSLogs failed, falling back to mock polling:', err);
    const interval = setInterval(() => {
      const logs = localSOSStore.logs[alertId] || [];
      callback([...logs]);
    }, 1000);
    return () => clearInterval(interval);
  }
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

  try {
    const q = query(
      collection(db, 'sos_alerts', alertId, 'breadcrumbs'),
      orderBy('timestamp', 'asc')
    );
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  } catch (err) {
    console.error('[SafeHer Firestore] subscribeToSOSBreadcrumbs failed, fallback to mock polling:', err);
    const interval = setInterval(() => {
      const crumbs = localSOSStore.breadcrumbs[alertId] || [];
      callback([...crumbs]);
    }, 1000);
    return () => clearInterval(interval);
  }
};

export const getSOSHistory = async (uid, maxResults = 20) => {
  console.log('[SafeHer Firestore] getSOSHistory for:', uid);
  if (!hasConfig) {
    return Object.values(localSOSStore.alerts)
      .filter((a) => a.uid === uid)
      .sort((a, b) => b.timestamp - a.timestamp);
  }
  try {
    const q = query(
      collection(db, 'sos_alerts'),
      where('uid', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(maxResults)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('[SafeHer Firestore] getSOSHistory failed, fallback to mock alerts:', err);
    return Object.values(localSOSStore.alerts)
      .filter((a) => a.uid === uid)
      .sort((a, b) => b.timestamp - a.timestamp);
  }
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
  try {
    const q = query(
      collection(db, 'sos_alerts'),
      where('uid', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  } catch (err) {
    console.error('[SafeHer Firestore] subscribeSOSAlerts failed, using local mock interval:', err);
    const interval = setInterval(() => {
      const list = Object.values(localSOSStore.alerts)
        .filter((a) => a.uid === uid)
        .sort((a, b) => b.timestamp - a.timestamp);
      callback(list);
    }, 2000);
    return () => clearInterval(interval);
  }
};

// ── Live Location ─────────────────────────────────────────────────────────────

export const updateLiveLocation = async (uid, coords) => {
  console.log('[SafeHer Firestore] updateLiveLocation for:', uid, { lat: coords.latitude, lng: coords.longitude });
  if (!hasConfig) {
    localStorage.setItem(`safeher_live_loc_${uid}`, JSON.stringify({
      uid,
      lat: coords.latitude,
      lng: coords.longitude,
      accuracy: coords.accuracy,
      updatedAt: new Date().toISOString(),
      isTracking: true,
    }));
    return;
  }
  try {
    await setDoc(doc(db, 'live_locations', uid), {
      uid,
      lat:       coords.latitude,
      lng:       coords.longitude,
      accuracy:  coords.accuracy,
      updatedAt: serverTimestamp(),
      isTracking: true,
    });
  } catch (err) {
    console.error('[SafeHer Firestore] Failed to update live location online:', err);
  }
};

export const stopLiveLocation = async (uid) => {
  console.log('[SafeHer Firestore] stopLiveLocation for:', uid);
  if (!hasConfig) {
    const cached = localStorage.getItem(`safeher_live_loc_${uid}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      parsed.isTracking = false;
      parsed.updatedAt = new Date().toISOString();
      localStorage.setItem(`safeher_live_loc_${uid}`, JSON.stringify(parsed));
    }
    return;
  }
  try {
    await updateDoc(doc(db, 'live_locations', uid), { isTracking: false });
  } catch (err) {
    console.error('[SafeHer Firestore] Failed to stop live location online:', err);
  }
};

export const subscribeToLocation = (uid, callback) => {
  if (!hasConfig) {
    const interval = setInterval(() => {
      const cached = localStorage.getItem(`safeher_live_loc_${uid}`);
      if (cached) {
        callback(JSON.parse(cached));
      }
    }, 2000);
    return () => clearInterval(interval);
  }
  try {
    return onSnapshot(doc(db, 'live_locations', uid), (snap) => {
      if (snap.exists()) callback(snap.data());
    });
  } catch (err) {
    console.error('[SafeHer Firestore] subscribeToLocation failed, falling back to local polling:', err);
    const interval = setInterval(() => {
      const cached = localStorage.getItem(`safeher_live_loc_${uid}`);
      if (cached) callback(JSON.parse(cached));
    }, 2000);
    return () => clearInterval(interval);
  }
};

// ── Incident Reports ──────────────────────────────────────────────────────────

export const saveIncidentReport = async (uid, data) => {
  console.log('[SafeHer Firestore] saveIncidentReport requested for user:', uid);
  const payload = {
    uid,
    type:        data.type,
    description: data.description,
    location:    data.location || null,
    status:      'submitted',
    timestamp:   hasConfig ? serverTimestamp() : new Date().toISOString(),
  };

  if (!hasConfig) {
    const key = `safeher_incidents_${uid}`;
    const local = JSON.parse(localStorage.getItem(key) || '[]');
    const id = `local-inc-${Date.now()}`;
    const newInc = { id, ...payload, timestamp: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify([newInc, ...local]));
    console.log('[SafeHer LocalStorage] Incident report saved locally. ID:', id);
    return id;
  }

  try {
    // Upload image if provided
    if (data.imageFile) {
      try {
        const imgRef = ref(storage, `incidents/${uid}/${Date.now()}_photo`);
        await uploadBytes(imgRef, data.imageFile);
        payload.imageUrl = await getDownloadURL(imgRef);
      } catch (e) {
        console.warn('[SafeHer Storage] Failed to upload image evidence:', e);
      }
    }

    // Upload audio if provided
    if (data.audioBlob) {
      try {
        const audRef = ref(storage, `incidents/${uid}/${Date.now()}_audio.webm`);
        await uploadBytes(audRef, data.audioBlob);
        payload.audioUrl = await getDownloadURL(audRef);
      } catch (e) {
        console.warn('[SafeHer Storage] Failed to upload audio evidence:', e);
      }
    }

    const docRef = await addDoc(collection(db, 'incidents'), payload);
    console.log('[SafeHer Firestore] Incident saved. ID:', docRef.id);
    return docRef.id;
  } catch (err) {
    console.error('[SafeHer Firestore] saveIncidentReport failed, falling back to LocalStorage:', err);
    const key = `safeher_incidents_${uid}`;
    const local = JSON.parse(localStorage.getItem(key) || '[]');
    const id = `local-inc-fallback-${Date.now()}`;
    const newInc = { id, ...payload, timestamp: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify([newInc, ...local]));
    return id;
  }
};

export const getIncidentReports = async (uid) => {
  console.log('[SafeHer Firestore] getIncidentReports requested for:', uid);
  if (!hasConfig) {
    const key = `safeher_incidents_${uid}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  try {
    const q = query(
      collection(db, 'incidents'),
      where('uid', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log(`[SafeHer Firestore] Loaded ${list.length} incident reports online.`);
    return list;
  } catch (err) {
    console.warn('[SafeHer Firestore] getIncidentReports failed, returning local storage items:', err);
    const key = `safeher_incidents_${uid}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
};

// ── Admin Helpers ─────────────────────────────────────────────────────────────

export const getAdminStats = async () => {
  console.log('[SafeHer Firestore] getAdminStats requested.');
  if (!hasConfig) {
    // Return stats aggregated from local simulated alert lists
    const totalSOS = Object.keys(localSOSStore.alerts).length;
    const activeSOS = Object.values(localSOSStore.alerts).filter(a => a.status === 'active').length;
    return {
      totalSOS,
      totalIncidents: 0,
      activeSOS,
      recentSOS: Object.values(localSOSStore.alerts).slice(0, 5),
      recentIncidents: [],
    };
  }

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
  } catch (err) {
    console.error('[SafeHer Firestore] getAdminStats failed online:', err);
    return { totalSOS: 0, totalIncidents: 0, activeSOS: 0, recentSOS: [], recentIncidents: [] };
  }
};

// ── FCM Token ─────────────────────────────────────────────────────────────────

export const saveFCMToken = async (uid, token) => {
  if (!hasConfig) return;
  try {
    await setDoc(
      doc(db, 'fcm_tokens', uid),
      { token, updatedAt: serverTimestamp(), uid },
      { merge: true }
    );
    console.log('[SafeHer Firestore] FCM token saved online.');
  } catch (err) {
    console.error('[SafeHer Firestore] Failed to save FCM token:', err);
  }
};

// ── User Settings ─────────────────────────────────────────────────────────────

export const updateSettings = async (uid, settings) => {
  console.log('[SafeHer Firestore] updateSettings requested for user:', uid, settings);
  if (!hasConfig) {
    const cached = localStorage.getItem('safeher_mock_user');
    if (cached) {
      const parsed = JSON.parse(cached);
      parsed.settings = settings;
      localStorage.setItem('safeher_mock_user', JSON.stringify(parsed));
    }
    return;
  }
  try {
    await updateDoc(doc(db, 'users', uid), { settings });
    console.log('[SafeHer Firestore] User settings updated online.');
  } catch (err) {
    console.error('[SafeHer Firestore] Failed to update settings online:', err);
  }
};

export const getSOSBreadcrumbs = async (alertId) => {
  if (!hasConfig || alertId.startsWith('demo-') || alertId.startsWith('offline-') || alertId.startsWith('fallback-')) {
    return localSOSStore.breadcrumbs[alertId] || [];
  }
  try {
    const q = query(
      collection(db, 'sos_alerts', alertId, 'breadcrumbs'),
      orderBy('timestamp', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  } catch (err) {
    console.warn('[SafeHer Firestore] getSOSBreadcrumbs failed online, returning local mock crumbs:', err);
    return localSOSStore.breadcrumbs[alertId] || [];
  }
};

export const getSOSLogs = async (alertId) => {
  if (!hasConfig || alertId.startsWith('demo-') || alertId.startsWith('offline-') || alertId.startsWith('fallback-')) {
    return localSOSStore.logs[alertId] || [];
  }
  try {
    const q = query(
      collection(db, 'sos_alerts', alertId, 'logs'),
      orderBy('timestamp', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  } catch (err) {
    console.warn('[SafeHer Firestore] getSOSLogs failed online, returning local mock logs:', err);
    return localSOSStore.logs[alertId] || [];
  }
};

