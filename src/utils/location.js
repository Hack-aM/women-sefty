/**
 * location.js — Location and Geolocation utilities for SafeHer.
 */

/**
 * Fetches the user's current GPS location coordinates.
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number}>}
 */
export const getCurrentGPSLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let msg = 'Failed to fetch location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied by the user.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

/**
 * Generates a Google Maps link from coordinates.
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {string}
 */
export const generateGoogleMapsLink = (latitude, longitude) => {
  if (!latitude || !longitude) return 'Location unavailable';
  return `https://maps.google.com/?q=${latitude},${longitude}`;
};
