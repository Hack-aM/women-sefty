import { useState } from 'react';
import {
  User, Shield, Bell, Lock, Phone, LogOut,
  ChevronRight, Moon, Smartphone, Info, Edit3, Check, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { logoutUser, updateUserProfile } from '../firebase/auth';
import { updateSettings } from '../firebase/firestore';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';

function Toggle({ on, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-checked={on}
      role="switch"
      className={`w-12 h-6 rounded-full relative transition-colors duration-300 flex-shrink-0 ${on ? 'bg-pink-500' : 'bg-white/10'}`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${on ? 'left-[26px]' : 'left-0.5'}`}
      />
    </button>
  );
}

export default function Profile() {
  const { user, profile, setProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || user?.displayName || '');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(profile?.settings || {
    sosAutoSend: true, fakeCallEnabled: true, sirenEnabled: true, notifications: true,
  });

  const initials = (displayName || user?.email || 'U')[0].toUpperCase();

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setLoading(true);
    try {
      await updateUserProfile(user.uid, { displayName: displayName.trim() });
      await refreshProfile();
      setEditing(false);
      toast.success('Profile updated!');
    } catch { toast.error('Update failed'); }
    finally { setLoading(false); }
  };

  const toggleSetting = async (key) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    try {
      await updateSettings(user.uid, next);
    } catch { /* offline fallback */ }
  };

  const handleLogout = async () => {
    try { await logoutUser(); navigate('/login'); toast.success('Logged out safely'); }
    catch { toast.error('Logout failed'); }
  };

  const settingItems = [
    { key: 'sosAutoSend', label: 'Auto-send SOS', desc: 'Send location to contacts when SOS activated' },
    { key: 'fakeCallEnabled', label: 'Fake Call', desc: 'Enable fake call feature' },
    { key: 'sirenEnabled', label: 'Emergency Siren', desc: 'Activate siren during SOS' },
    { key: 'notifications', label: 'Notifications', desc: 'Safety alerts and reminders' },
  ];

  return (
    <div className="px-4 pt-4 pb-6 space-y-5 max-w-2xl mx-auto lg:pt-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-100">Profile & Settings</h1>
      </div>

      {/* Profile card */}
      <div>
        <GlassCard className="relative">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-[72px] h-[72px] rounded-3xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-display font-bold text-3xl shadow-glow-pink">
                {initials}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-dark-400" />
            </div>

            {/* Name + email */}
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input-field text-sm py-2 flex-1"
                    autoFocus
                  />
                  <button onClick={handleSaveName} disabled={loading} className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditing(false)} className="w-8 h-8 rounded-xl glass-card text-slate-400 flex items-center justify-center">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="font-display font-bold text-xl text-slate-100 truncate">{displayName || 'User'}</p>
                  <button onClick={() => setEditing(true)} className="text-slate-500 hover:text-slate-300 transition-colors">
                    <Edit3 size={14} />
                  </button>
                </div>
              )}
              <p className="text-sm text-slate-500 truncate mt-0.5">{user?.email || user?.phoneNumber}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="badge-success">✓ Verified</span>
                <span className="badge-success">SafeHer Member</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Safety Settings */}
      <div>
        <h3 className="section-heading">Safety Settings</h3>
        <GlassCard className="space-y-0 divide-y divide-white/5">
          {settingItems.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-sm font-semibold text-slate-200">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
              <Toggle on={settings[key]} onToggle={() => toggleSetting(key)} />
            </div>
          ))}
        </GlassCard>
      </div>

      {/* Quick links */}
      <div>
        <h3 className="section-heading">More</h3>
        <GlassCard className="space-y-0 divide-y divide-white/5">
          {[
            { icon: Shield, label: 'Privacy Policy', sub: 'How we protect your data' },
            { icon: Info,   label: 'About SafeHer',  sub: 'Version 1.0.0' },
            { icon: Phone,  label: 'Contact Support', sub: 'Get help from our team' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0 cursor-pointer hover:opacity-80">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                <Icon size={16} className="text-slate-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-200">{label}</p>
                <p className="text-xs text-slate-500">{sub}</p>
              </div>
              <ChevronRight size={16} className="text-slate-600" />
            </div>
          ))}
        </GlassCard>
      </div>

      {/* Logout */}
      <Button variant="danger" fullWidth onClick={handleLogout}>
        <LogOut size={18} /> Sign Out Safely
      </Button>

      <p className="text-center text-xs text-slate-700 pb-2">SafeHer v1.0.0 · Built with ❤️ for women's safety</p>
    </div>
  );
}
