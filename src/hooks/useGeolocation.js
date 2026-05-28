import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { updateLiveLocation, stopLiveLocation } from '../firebase/firestore';

export const useGeolocation = () => {
  const { setLocation, setTracking } = useApp();
  const { user } = useAuth();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const watchId = useRef(null);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }
    setLoading(true);
    setTracking(true);

    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        setLocation(coords);
        setLoading(false);
        if (user) {
          try { await updateLiveLocation(user.uid, pos.coords); } catch { /* offline */ }
        }
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }, [user, setLocation, setTracking]);

  const stopTracking = useCallback(async () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setTracking(false);
    if (user) {
      try { await stopLiveLocation(user.uid); } catch { /* offline */ }
    }
  }, [user, setTracking]);

  const getCurrentPosition = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('Not supported')); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setLocation(coords);
          resolve(coords);
        },
        reject,
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, [setLocation]);

  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  return { startTracking, stopTracking, getCurrentPosition, error, loading };
};
