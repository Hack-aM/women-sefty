/**
 * emergencyHelpers.js — SOS help and device utilities for SafeHer.
 */

/**
 * Triggers a vibration pattern for haptic emergency warnings.
 */
export const triggerHapticFeedback = () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    // SOS pattern: 3 short, 3 long, 3 short
    navigator.vibrate([
      200, 100, 200, 100, 200, // S (... )
      300, 400, 100, 400, 100, 400, // O (---)
      300, 200, 100, 200, 100, 200, // S (... )
    ]);
  }
};

/**
 * Cancels any active vibration patterns.
 */
export const cancelHapticFeedback = () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(0);
  }
};

/**
 * Constructs a standardized emergency message for emergency contacts.
 * @param {string} senderName 
 * @param {string} mapsLink 
 * @returns {string}
 */
export const constructEmergencyMessage = (senderName, mapsLink) => {
  const name = senderName || 'A SafeHer User';
  const locationText = mapsLink ? `Location link: ${mapsLink}` : 'Location unavailable';
  return `🚨 EMERGENCY! I need help immediately!\n👤 Sent by: ${name}\n📍 ${locationText}\n\nThis is an automated alert from SafeHer.`;
};

/**
 * Check if the browser is currently offline.
 * @returns {boolean}
 */
export const isOffline = () => {
  return typeof navigator !== 'undefined' && !navigator.onLine;
};
