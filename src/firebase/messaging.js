/**
 * Firebase Cloud Messaging — client-side integration
 * Handles FCM token generation and foreground messages.
 * Only initializes if VITE_FIREBASE_VAPID_KEY is set.
 */
let messaging = null;

const getMessagingInstance = async () => {
  if (messaging) return messaging;
  try {
    const { getMessaging: getMsg } = await import('firebase/messaging');
    const app = (await import('./config')).default;
    messaging = getMsg(app);
    return messaging;
  } catch {
    return null;
  }
};

/**
 * Request notification permission and get FCM token.
 * @returns {Promise<string|null>}
 */
export const getFCMToken = async () => {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn('[SafeHer FCM] VITE_FIREBASE_VAPID_KEY not set. Push notifications disabled.');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const m = await getMessagingInstance();
    if (!m) return null;

    const { getToken } = await import('firebase/messaging');
    const token = await getToken(m, {
      vapidKey,
      serviceWorkerRegistration: await navigator.serviceWorker.ready,
    });
    return token || null;
  } catch (err) {
    console.warn('[SafeHer FCM] Token error:', err.message);
    return null;
  }
};

/**
 * Listen for foreground FCM messages.
 * @param {(payload: object) => void} handler
 * @returns {Promise<() => void>} unsubscribe fn
 */
export const onForegroundMessage = async (handler) => {
  try {
    const m = await getMessagingInstance();
    if (!m) return () => {};
    const { onMessage } = await import('firebase/messaging');
    return onMessage(m, handler);
  } catch {
    return () => {};
  }
};
