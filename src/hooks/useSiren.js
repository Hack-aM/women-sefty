import { useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';

let sirenAudioCtx = null;
let sirenSource = null;
let sirenGain = null;

const createSirenSound = (ctx) => {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  lfo.frequency.value = 1.5;
  lfoGain.gain.value = 300;
  lfo.connect(lfoGain);
  lfoGain.connect(oscillator.frequency);

  oscillator.frequency.value = 800;
  oscillator.type = 'sawtooth';

  gainNode.gain.value = 0.6;
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  lfo.start();
  oscillator.start();

  return { oscillator, gainNode, lfo };
};

export const useSiren = () => {
  const { sirenOn, toggleSiren } = useApp();
  const nodesRef = useRef(null);

  const startSiren = useCallback(() => {
    try {
      sirenAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      nodesRef.current = createSirenSound(sirenAudioCtx);
      toggleSiren(true);
    } catch (e) {
      console.error('Siren failed:', e);
    }
  }, [toggleSiren]);

  const stopSiren = useCallback(() => {
    try {
      if (nodesRef.current) {
        nodesRef.current.oscillator.stop();
        nodesRef.current.lfo.stop();
        nodesRef.current = null;
      }
      if (sirenAudioCtx) {
        sirenAudioCtx.close();
        sirenAudioCtx = null;
      }
    } catch { /* ignore */ }
    toggleSiren(false);
  }, [toggleSiren]);

  const toggleSirenFn = useCallback(() => {
    if (sirenOn) stopSiren();
    else startSiren();
  }, [sirenOn, startSiren, stopSiren]);

  return { sirenOn, startSiren, stopSiren, toggleSiren: toggleSirenFn };
};
