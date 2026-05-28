import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, hasConfig } from '../firebase/config';

/**
 * Uploads emergency audio blob to Firebase Storage with progress tracking.
 * Falls back to simulation if Firebase is not configured.
 * 
 * @param {string} alertId The SOS alert ID
 * @param {Blob} audioBlob The recorded audio WebM blob
 * @param {function} onProgress Callback for progress percentage: (percent: number) => void
 * @returns {Promise<string>} Download URL of the uploaded audio
 */
export const uploadSOSAudioWithProgress = (alertId, audioBlob, onProgress) => {
  return new Promise((resolve, reject) => {
    if (!audioBlob) {
      reject(new Error('No audio data provided.'));
      return;
    }

    const filename = `sos_evidence_${alertId}_${Date.now()}.webm`;
    const storagePath = `sos_evidence/${alertId}/${filename}`;

    // Demo Mode fallback
    if (!hasConfig) {
      console.warn('[SafeHer Storage] Firebase not configured. Simulating evidence upload...');
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        if (onProgress) onProgress(progress);

        if (progress >= 100) {
          clearInterval(interval);
          resolve(`https://example.com/simulated-audio-evidence-${alertId}.webm`);
        }
      }, 100);
      return;
    }

    try {
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, audioBlob);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          if (onProgress) onProgress(progress);
        },
        (error) => {
          console.error('[SafeHer Storage] Upload failed:', error);
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (err) {
            reject(err);
          }
        }
      );
    } catch (err) {
      console.error('[SafeHer Storage] Initialization failed:', err);
      reject(err);
    }
  });
};
