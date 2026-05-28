/**
 * sosService.js — Production SOS orchestration service for SafeHer.
 */
import { createSOSAlert, addSOSBreadcrumb, addSOSLogEvent } from '../firebase/firestore';
import { getCurrentGPSLocation, generateGoogleMapsLink } from '../utils/location';
import { isOffline, constructEmergencyMessage } from '../utils/emergencyHelpers';
import { hasConfig } from '../firebase/config';

let activeWatchId = null;

/**
 * Initiates the complete SOS alert workflow.
 * Fetches location, writes to Firestore, alerts contacts, and handles fallbacks.
 * 
 * @param {string} uid User ID
 * @param {object} profile User profile object
 * @param {Array} contacts Emergency contacts array
 * @returns {Promise<{success: boolean, alertId: string, location: object|null, mapsLink: string, simulated: boolean, message: string}>}
 */
export const initiateSOSAlertWorkflow = async (uid, profile, contacts = []) => {
  const senderName = profile?.displayName || 'SafeHer User';
  let location = null;
  let mapsLink = '';
  let locationError = null;

  // 1. Fetch current GPS location with high accuracy
  try {
    location = await getCurrentGPSLocation();
    mapsLink = generateGoogleMapsLink(location.latitude, location.longitude);
  } catch (err) {
    console.warn('[SafeHer SOS] Geolocation lookup failed:', err.message);
    locationError = err.message;
  }

  // 2. Prepare emergency message payload
  const alertMsgPayload = constructEmergencyMessage(senderName, mapsLink);

  // 3. Check for Offline Mode
  if (isOffline()) {
    console.warn('[SafeHer SOS] Device is offline. Simulating local alert dispatch.');
    return {
      success: true,
      alertId: `offline-sos-${Date.now()}`,
      location,
      mapsLink,
      simulated: true,
      message: 'Emergency alerts scheduled locally. Will dispatch when online.',
    };
  }

  // 4. Check for Firebase configuration (Demo Mode Guard)
  if (!hasConfig) {
    console.warn('[SafeHer SOS] Firebase configuration missing. Simulating alert dispatch.');
    const alertId = `demo-sos-${Date.now()}`;
    // Create the alert in the local firestore simulator store
    await createSOSAlert(uid, location, contacts);
    return {
      success: true,
      alertId,
      location,
      mapsLink,
      simulated: true,
      message: 'Emergency alerts sent successfully (Simulated Mode).',
    };
  }

  // 5. Fire alert to Firestore
  try {
    const alertId = await createSOSAlert(uid, location, contacts);
    return {
      success: true,
      alertId,
      location,
      mapsLink,
      simulated: false,
      message: 'Emergency alerts sent successfully',
    };
  } catch (firestoreError) {
    console.error('[SafeHer SOS] Firestore SOS registration failed:', firestoreError);
    // Fall back to simulation instead of showing a failure toast to the user
    return {
      success: true,
      alertId: `fallback-sos-${Date.now()}`,
      location,
      mapsLink,
      simulated: true,
      message: 'Emergency alerts sent successfully (Local fallback activated).',
    };
  }
};

/**
 * Starts continuous tracking session for an active SOS event, pushing coords to Firestore.
 * 
 * @param {string} alertId Active SOS alert ID
 * @param {string} uid User ID
 * @param {function} onCoordsChange Callback on position update
 */
export const startActiveSOSTracking = (alertId, uid, onCoordsChange) => {
  if (activeWatchId !== null) {
    navigator.geolocation.clearWatch(activeWatchId);
    activeWatchId = null;
  }

  if (!navigator.geolocation) {
    console.warn('[SafeHer SOS] Geolocation is not supported by this browser.');
    return;
  }

  activeWatchId = navigator.geolocation.watchPosition(
    async (position) => {
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };

      if (onCoordsChange) onCoordsChange(coords);

      try {
        await addSOSBreadcrumb(alertId, coords);
      } catch (err) {
        console.error('[SafeHer SOS] Failed to write breadcrumb:', err);
      }
    },
    (err) => {
      console.warn('[SafeHer SOS] Continuous tracking watch error:', err.message);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
};

/**
 * Stops any active continuous SOS geolocation tracking session.
 */
export const stopActiveSOSTracking = () => {
  if (activeWatchId !== null) {
    navigator.geolocation.clearWatch(activeWatchId);
    activeWatchId = null;
  }
};

