import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useSmartDetection = (onTriggerSOS) => {
  // Shake detection state
  const [shakeEnabled, setShakeEnabled] = useState(() => {
    return localStorage.getItem('safeher_shake_enabled') === 'true';
  });
  
  // Power simulation state
  const [powerSimEnabled, setPowerSimEnabled] = useState(() => {
    return localStorage.getItem('safeher_power_sim_enabled') === 'true';
  });

  // Inactivity check-in timer state
  const [inactivityActive, setInactivityActive] = useState(false);
  const [inactivityDuration, setInactivityDuration] = useState(0); // in seconds
  const [inactivityTimeLeft, setInactivityTimeLeft] = useState(0);
  const [pinRequired, setPinRequired] = useState(false);
  const [pinCountdown, setPinCountdown] = useState(15); // 15 seconds to enter PIN

  // Smart emergency warning countdown state (shared by shake & power trigger)
  const [warningActive, setWarningActive] = useState(false);
  const [warningTimeLeft, setWarningTimeLeft] = useState(5); // 5s warning
  const warningReason = useRef('');

  // Refs for tracking timers
  const inactivityTimerRef = useRef(null);
  const pinCountdownRef = useRef(null);
  const warningTimerRef = useRef(null);
  const keyClicksRef = useRef([]); // timestamps of recent key presses

  // Vibration / Beep helper during countdowns
  const playWarningBeep = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(200);
    }
  };

  // Toggles
  const toggleShake = () => {
    setShakeEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('safeher_shake_enabled', String(next));
      toast.success(next ? 'Shake detection enabled' : 'Shake detection disabled');
      return next;
    });
  };

  const togglePowerSim = () => {
    setPowerSimEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('safeher_power_sim_enabled', String(next));
      toast.success(next ? 'Triple-click Space/Escape key trigger enabled' : 'Power simulation disabled');
      return next;
    });
  };

  // Start warning countdown (5s) before triggering full SOS
  const startWarningCountdown = useCallback((reason) => {
    setWarningActive(true);
    setWarningTimeLeft(5);
    warningReason.current = reason;
    playWarningBeep();
    toast(`⚠️ Smart Trigger: ${reason}! SOS in 5 seconds unless cancelled.`, {
      icon: '🚨',
      duration: 5000,
    });
  }, []);

  // Cancel warning countdown
  const cancelWarning = useCallback(() => {
    if (warningTimerRef.current) {
      clearInterval(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    setWarningActive(false);
    setWarningTimeLeft(5);
    toast.success('Smart emergency trigger cancelled.');
  }, []);

  // Handle warning countdown tick
  useEffect(() => {
    if (warningActive) {
      warningTimerRef.current = setInterval(() => {
        setWarningTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(warningTimerRef.current);
            warningTimerRef.current = null;
            setWarningActive(false);
            onTriggerSOS(warningReason.current);
            return 0;
          }
          playWarningBeep();
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (warningTimerRef.current) clearInterval(warningTimerRef.current);
    };
  }, [warningActive, onTriggerSOS]);

  // Shake detector listener
  useEffect(() => {
    if (!shakeEnabled || warningActive) return;

    let lastUpdate = 0;
    let lastX, lastY, lastZ;
    const SHAKE_THRESHOLD = 800; // sensitivity parameter

    const handleDeviceMotion = (event) => {
      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration) return;

      const curTime = Date.now();
      if ((curTime - lastUpdate) > 100) {
        const diffTime = curTime - lastUpdate;
        lastUpdate = curTime;

        const x = acceleration.x;
        const y = acceleration.y;
        const z = acceleration.z;

        const speed = Math.abs(x + y + z - lastX - lastY - lastZ) / diffTime * 10000;

        if (speed > SHAKE_THRESHOLD) {
          startWarningCountdown('Significant Device Shake Detected');
        }

        lastX = x;
        lastY = y;
        lastZ = z;
      }
    };

    window.addEventListener('devicemotion', handleDeviceMotion);
    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
    };
  }, [shakeEnabled, warningActive, startWarningCountdown]);

  // Key clicks listener (Triple press Escape or Space)
  useEffect(() => {
    if (!powerSimEnabled || warningActive) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === ' ') {
        // Space in text inputs shouldn't trigger
        if (e.key === ' ' && ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
          return;
        }

        const now = Date.now();
        // filter out clicks older than 2s
        keyClicksRef.current = [...keyClicksRef.current.filter((t) => now - t < 2000), now];

        if (keyClicksRef.current.length >= 3) {
          keyClicksRef.current = [];
          startWarningCountdown('Rapid Keypress Sequence (Power Simulation)');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [powerSimEnabled, warningActive, startWarningCountdown]);

  // Inactivity Timer
  const startInactivityTimer = (seconds) => {
    cancelInactivityTimer();
    setInactivityActive(true);
    setInactivityDuration(seconds);
    setInactivityTimeLeft(seconds);
    setPinRequired(false);
    setPinCountdown(15);
  };

  const cancelInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearInterval(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (pinCountdownRef.current) {
      clearInterval(pinCountdownRef.current);
      pinCountdownRef.current = null;
    }
    setInactivityActive(false);
    setInactivityTimeLeft(0);
    setPinRequired(false);
    setPinCountdown(15);
  }, []);

  // Inactivity count down tick
  useEffect(() => {
    if (inactivityActive && !pinRequired && inactivityTimeLeft > 0) {
      inactivityTimerRef.current = setInterval(() => {
        setInactivityTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(inactivityTimerRef.current);
            inactivityTimerRef.current = null;
            setPinRequired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (inactivityTimerRef.current) clearInterval(inactivityTimerRef.current);
    };
  }, [inactivityActive, pinRequired, inactivityTimeLeft]);

  // PIN countdown tick
  useEffect(() => {
    if (pinRequired) {
      playWarningBeep();
      pinCountdownRef.current = setInterval(() => {
        setPinCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(pinCountdownRef.current);
            pinCountdownRef.current = null;
            cancelInactivityTimer();
            onTriggerSOS('Inactivity Timeout Check-In Failure');
            return 0;
          }
          playWarningBeep();
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (pinCountdownRef.current) clearInterval(pinCountdownRef.current);
    };
  }, [pinRequired, onTriggerSOS, cancelInactivityTimer]);

  const verifyPin = (enteredPin) => {
    if (enteredPin === '1234') {
      cancelInactivityTimer();
      toast.success('Safe check-in confirmed!');
      return true;
    } else {
      toast.error('Incorrect PIN. Please try again.');
      return false;
    }
  };

  return {
    shakeEnabled,
    toggleShake,
    powerSimEnabled,
    togglePowerSim,
    inactivityActive,
    inactivityTimeLeft,
    inactivityDuration,
    startInactivityTimer,
    cancelInactivityTimer,
    pinRequired,
    pinCountdown,
    verifyPin,
    warningActive,
    warningTimeLeft,
    cancelWarning,
  };
};
