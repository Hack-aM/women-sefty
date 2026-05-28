import { useLocation, Link } from 'react-router-dom';
import { Bell, Shield, Download } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useEffect } from 'react';

const pageTitles = {
  '/':          'Dashboard',
  '/sos':       'SOS Emergency',
  '/tracking':  'Live Tracking',
  '/nearby':    'Nearby Help',
  '/contacts':  'Emergency Contacts',
  '/fakecall':  'Fake Call',
  '/tips':      'Safety Tips',
  '/profile':   'Profile & Settings',
  '/ai-safety': 'AI Safety Assistant',
};

export default function TopBar() {
  const location = useLocation();
  const { sosActive, installPrompt, setInstallPrompt } = useApp();
  const title = pageTitles[location.pathname] || 'SafeHer';

  // Capture PWA install prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [setInstallPrompt]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  return (
    <header
      className="sticky top-0 z-40 lg:hidden"
      style={{
        background: 'rgba(10, 10, 15, 0.9)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3.5">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-glow-pink">
            <Shield size={16} className="text-white" />
          </div>
          <span className="font-display font-bold text-lg gradient-text">SafeHer</span>
        </Link>

        {/* Page title */}
        <h1 className="text-sm font-semibold text-slate-300 absolute left-1/2 -translate-x-1/2 pointer-events-none">
          {title}
        </h1>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* SOS active indicator */}
          {sosActive && (
            <Link to="/sos" className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/30">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-xs font-bold">SOS</span>
            </Link>
          )}

          {/* Install prompt */}
          {installPrompt && (
            <button
              onClick={handleInstall}
              className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 hover:bg-pink-500/20 transition-all"
              title="Install SafeHer"
            >
              <Download size={15} />
            </button>
          )}

          {/* Notifications / Profile */}
          <Link
            to="/profile"
            className="w-8 h-8 rounded-xl glass-card flex items-center justify-center text-slate-400 hover:text-pink-400 transition-colors"
            title="Profile"
          >
            <Bell size={16} />
          </Link>
        </div>
      </div>
    </header>
  );
}
