import { NavLink, useNavigate } from 'react-router-dom';
import {
  Shield, Home, MapPin, Phone, Users, Lightbulb, User,
  PhoneCall, LogOut, Settings, History, AlertOctagon, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { logoutUser } from '../../firebase/auth';
import toast from 'react-hot-toast';

const navItems = [
  { path: '/',         icon: Home,         label: 'Dashboard' },
  { path: '/sos',      icon: Shield,       label: 'SOS Emergency' },
  { path: '/tracking', icon: MapPin,       label: 'Live Tracking' },
  { path: '/nearby',   icon: Phone,        label: 'Nearby Help' },
  { path: '/contacts', icon: Users,        label: 'Contacts' },
  { path: '/fakecall', icon: PhoneCall,    label: 'Fake Call' },
  { path: '/report',   icon: AlertOctagon, label: 'Report Incident' },
  { path: '/history',  icon: History,      label: 'Emergency Log' },
  { path: '/tips',     icon: Lightbulb,    label: 'Safety Tips' },
  { path: '/profile',  icon: User,         label: 'Profile' },
];

export default function Sidebar() {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/login');
      toast.success('Logged out safely');
    } catch {
      toast.error('Logout failed');
    }
  };

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 z-50"
      style={{
        background: 'rgba(10, 10, 20, 0.95)',
        backdropFilter: 'blur(30px)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}>
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-glow-pink">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl gradient-text">SafeHer</h1>
            <p className="text-xs text-slate-500">Stay Safe, Stay Brave</p>
          </div>
        </div>
      </div>

      {/* User pill */}
      <div className="px-4 py-3 mx-3 mt-4 glass-card rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/20 flex items-center justify-center font-bold text-pink-400 text-sm">
            {(profile?.displayName || user?.email || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">
              {profile?.displayName || 'User'}
            </p>
            <p className="text-xs text-slate-500 truncate">{user?.email || user?.phoneNumber}</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? 'text-pink-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.15)' }}
                  />
                )}
                <Icon size={18} className="relative z-10 flex-shrink-0" />
                <span className="relative z-10 text-sm">{label}</span>
              </>
            )}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            key="/admin"
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? 'text-red-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)' }}
                  />
                )}
                <ShieldAlert size={18} className="relative z-10 flex-shrink-0 text-red-400 animate-pulse" />
                <span className="relative z-10 text-sm font-semibold text-red-400">Admin Shield</span>
              </>
            )}
          </NavLink>
        )}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-white/5 space-y-1">
        <NavLink to="/profile" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all text-sm">
          <Settings size={18} /> Settings
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm"
        >
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
