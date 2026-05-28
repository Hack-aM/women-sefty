import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function InstallBanner() {
  const { installPrompt, setInstallPrompt } = useApp();
  const [dismissed, setDismissed] = useState(false);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
    setDismissed(true);
  };

  const show = installPrompt && !dismissed;

  return (
    <>
      {show && (
        <div
          className="mx-4 mt-2 mb-1 glass-card p-3 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Download size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-100">Install SafeHer</p>
            <p className="text-xs text-slate-500">Add to home screen for quick access</p>
          </div>
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-semibold flex-shrink-0"
          >
            Install
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
