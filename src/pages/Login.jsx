import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Eye, EyeOff, Lock, ArrowRight, User, CheckCircle, XCircle } from 'lucide-react';
import { loginUser, registerUser } from '../firebase/auth';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';

// Password strength checker
const getPasswordStrength = (pw) => {
  if (!pw) return null;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '25%' };
  if (score === 2) return { label: 'Fair', color: 'bg-amber-500', width: '50%' };
  if (score === 3) return { label: 'Good', color: 'bg-blue-500', width: '75%' };
  return { label: 'Strong', color: 'bg-emerald-500', width: '100%' };
};

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: null }));
  };

  const validate = () => {
    const errs = {};
    if (mode === 'register' && (!form.name.trim() || form.name.trim().length < 2)) {
      errs.name = 'Name must be at least 2 characters';
    }
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!validateEmail(form.email)) errs.email = 'Enter a valid email address';
    if (!form.password) errs.password = 'Password is required';
    else if (mode === 'register' && form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      if (mode === 'register') {
        await registerUser(form.email, form.password, form.name.trim() || 'User');
        toast.success('Account created! Welcome to SafeHer 💖');
      } else {
        await loginUser(form.email, form.password);
        toast.success('Welcome back! Stay safe 💖');
      }
      await refreshProfile();
      navigate('/');
    } catch (err) {
      let msg = 'Something went wrong. Try again.';
      switch (err.code) {
        case 'auth/invalid-login-credentials':
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          msg = 'Invalid email or password'; break;
        case 'auth/email-already-in-use':
          msg = 'Email already in use'; break;
        case 'auth/weak-password':
          msg = 'Password too weak (min 6 characters)'; break;
        case 'auth/invalid-api-key':
          msg = 'Firebase not configured — check .env file'; break;
        case 'auth/network-request-failed':
          msg = 'Network error. Check your connection.'; break;
        default:
          msg = err.message || msg;
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const pwStrength = mode === 'register' ? getPasswordStrength(form.password) : null;

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-12 min-h-dvh">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 animate-glow"
            style={{
              background: 'linear-gradient(135deg, #ec4899, #a855f7)',
              boxShadow: '0 0 40px rgba(236,72,153,0.4)',
            }}
          >
            <Shield size={38} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-4xl gradient-text mb-1">SafeHer</h1>
          <p className="text-slate-400 text-sm text-center leading-relaxed">
            Your personal safety companion<br />
            <span className="text-slate-500">Stay brave, stay protected 💪</span>
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex p-1 glass-card rounded-2xl mb-6">
          {['login', 'register'].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setErrors({}); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 capitalize ${
                mode === m
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-glow-pink'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <Input
                label="Full Name"
                placeholder="Your full name"
                value={form.name}
                onChange={set('name')}
                icon={User}
                autoComplete="name"
              />
              {errors.name && (
                <p className="text-red-400 text-xs mt-1 ml-1 flex items-center gap-1">
                  <XCircle size={12} /> {errors.name}
                </p>
              )}
            </div>
          )}

          <div>
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
              icon={Mail}
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1 ml-1 flex items-center gap-1">
                <XCircle size={12} /> {errors.email}
              </p>
            )}
            {!errors.email && form.email && validateEmail(form.email) && (
              <p className="text-emerald-400 text-xs mt-1 ml-1 flex items-center gap-1">
                <CheckCircle size={12} /> Valid email
              </p>
            )}
          </div>

          <div>
            <Input
              label="Password"
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.password}
              onChange={set('password')}
              icon={Lock}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              rightElement={
                <button type="button" onClick={() => setShowPass((v) => !v)} className="text-slate-500 hover:text-slate-300 transition-colors">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
            {errors.password && (
              <p className="text-red-400 text-xs mt-1 ml-1 flex items-center gap-1">
                <XCircle size={12} /> {errors.password}
              </p>
            )}
            {/* Password strength bar */}
            {mode === 'register' && form.password && pwStrength && (
              <div className="mt-2 space-y-1">
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${pwStrength.color}`}
                    style={{ width: pwStrength.width }}
                  />
                </div>
                <p className={`text-xs ml-1 ${
                  pwStrength.label === 'Strong' ? 'text-emerald-400'
                  : pwStrength.label === 'Good' ? 'text-blue-400'
                  : pwStrength.label === 'Fair' ? 'text-amber-400'
                  : 'text-red-400'
                }`}>
                  Password strength: {pwStrength.label}
                </p>
              </div>
            )}
          </div>

          <Button type="submit" fullWidth loading={loading} size="lg" className="mt-2">
            {mode === 'login' ? 'Sign In Securely' : 'Create My Account'}
            <ArrowRight size={18} />
          </Button>
        </form>

        <p className="text-center text-xs text-slate-700 mt-6 leading-relaxed">
          By continuing, you agree to our Terms of Service.<br />
          🔒 Your safety data is encrypted and private.
        </p>
      </div>
    </div>
  );
}
