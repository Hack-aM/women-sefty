import { useRef, useCallback, useEffect, useState } from 'react';

const TRIGGER_KEYWORDS = [
  'help me', 'help', 'emergency', 'bachao', 'save me',
  'danger', 'sos', 'call police', 'somebody help',
];

/**
 * useVoiceTrigger — listens for emergency keywords via Web Speech API.
 * Calls `onTrigger()` when a keyword is detected.
 * Gracefully disabled if SpeechRecognition is not supported.
 */
export const useVoiceTrigger = (onTrigger) => {
  const recRef = useRef(null);
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(false);
  const [lastHeard, setLastHeard] = useState('');

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(!!SpeechRecognition);
  }, []);

  const start = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-IN'; // works for both Hindi/English mixed
    rec.maxAlternatives = 3;

    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        setLastHeard(transcript);
        if (TRIGGER_KEYWORDS.some((kw) => transcript.includes(kw))) {
          onTrigger?.(transcript);
        }
      }
    };

    rec.onerror = (e) => {
      if (e.error !== 'no-speech') {
        console.warn('[SafeHer Voice] Error:', e.error);
      }
    };

    // Auto-restart when it stops (continuous listening)
    rec.onend = () => {
      if (recRef.current) {
        try { rec.start(); } catch { /* already started */ }
      }
    };

    rec.start();
    recRef.current = rec;
    setActive(true);
  }, [onTrigger]);

  const stop = useCallback(() => {
    if (recRef.current) {
      recRef.current.onend = null; // prevent restart
      recRef.current.stop();
      recRef.current = null;
      setActive(false);
      setLastHeard('');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop]);

  return { active, supported, lastHeard, start, stop };
};
