import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, MapPin, Users, User, Shield } from 'lucide-react';

const navItems = [
  { path: '/',         icon: Home,   label: 'Home' },
  { path: '/tracking', icon: MapPin, label: 'Track' },
  // SOS center button placeholder
  { path: '/contacts', icon: Users,  label: 'Contacts' },
  { path: '/profile',  icon: User,   label: 'Profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const sosActive = location.pathname === '/sos';

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div
        className="mx-3 mb-2 rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(12, 12, 20, 0.97)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-center justify-around px-2 py-1">
          {/* Left two items */}
          {navItems.slice(0, 2).map(({ path, icon: Icon, label }) => {
            const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
            return (
              <NavLink
                key={path}
                to={path}
                className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl relative min-w-[60px]"
              >
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-pink-500/10" />
                )}
                <Icon
                  size={20}
                  className={`relative z-10 transition-all duration-200 ${isActive ? 'text-pink-400 scale-110' : 'text-slate-500'}`}
                />
                <span className={`relative z-10 text-[10px] font-medium transition-colors duration-200 ${isActive ? 'text-pink-400' : 'text-slate-600'}`}>
                  {label}
                </span>
              </NavLink>
            );
          })}

          {/* SOS Center Button */}
          <button
            onClick={() => navigate('/sos')}
            className="relative flex flex-col items-center -mt-5"
            aria-label="SOS Emergency"
          >
            {/* Glow ring */}
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-40"
              style={{
                background: 'transparent',
                border: '2px solid rgba(239,68,68,0.5)',
                animationDuration: '2s',
              }}
            />
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #ef4444, #e11d48)',
                boxShadow: sosActive
                  ? '0 0 30px rgba(239,68,68,0.9), 0 4px 20px rgba(0,0,0,0.5)'
                  : '0 0 20px rgba(239,68,68,0.5), 0 4px 20px rgba(0,0,0,0.5)',
              }}
            >
              <Shield size={24} className="text-white" />
            </div>
            <span className={`text-[10px] font-bold mt-1 ${sosActive ? 'text-red-400' : 'text-red-500'}`}>SOS</span>
          </button>

          {/* Right two items */}
          {navItems.slice(2).map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname.startsWith(path);
            return (
              <NavLink
                key={path}
                to={path}
                className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl relative min-w-[60px]"
              >
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-pink-500/10" />
                )}
                <Icon
                  size={20}
                  className={`relative z-10 transition-all duration-200 ${isActive ? 'text-pink-400 scale-110' : 'text-slate-500'}`}
                />
                <span className={`relative z-10 text-[10px] font-medium transition-colors duration-200 ${isActive ? 'text-pink-400' : 'text-slate-600'}`}>
                  {label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
