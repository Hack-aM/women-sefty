import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, ArrowLeft, RefreshCw } from 'lucide-react';
import { setupRecaptcha, sendOTP, verifyOTP } from '../firebase/auth';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

export default function OTPVerify() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [loading, setLoading] = useState(false);
  const [confirmResult, setConfirmResult] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    let t;
    if (countdown > 0) t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) { toast.error('Enter valid phone number'); return; }
    setLoading(true);
    try {
      const verifier = setupRecaptcha('recaptcha-container');
      const formatted = phone.startsWith('+') ? phone : `+91${phone}`;
      const result = await sendOTP(formatted, verifier);
      setConfirmResult(result);
      setStep('otp');
      setCountdown(30);
      toast.success('OTP sent successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[idx] = val;
    setOtp(newOtp);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
    if (!val && idx > 0) inputRefs.current[idx - 1]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) { toast.error('Enter complete 6-digit OTP'); return; }
    setLoading(true);
    try {
      await verifyOTP(confirmResult, code);
      toast.success('Verified! Welcome to SafeHer 💖');
      navigate('/');
    } catch {
      toast.error('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-12 min-h-dvh">
      <div id="recaptcha-container" />
      <div
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mb-4 shadow-glow-pink">
            <Shield size={30} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-3xl gradient-text mb-1">Verify Number</h1>
          <p className="text-slate-400 text-sm text-center">
            {step === 'phone' ? 'Enter your phone number to receive an OTP' : `OTP sent to +91 ${phone}`}
          </p>
        </div>

        {step === 'phone' ? (
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-400 text-sm">
                <span>🇮🇳</span><span>+91</span>
                <div className="w-px h-5 bg-white/10 ml-1" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="98765 43210"
                className="input-field pl-24 text-lg tracking-widest"
                inputMode="numeric"
              />
            </div>
            <Button fullWidth loading={loading} onClick={handleSendOTP} size="lg">
              Send OTP
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex gap-2 justify-center">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOTPChange(idx, e.target.value)}
                  onKeyDown={(e) => e.key === 'Backspace' && !digit && idx > 0 && inputRefs.current[idx - 1]?.focus()}
                  className={`w-12 h-14 text-center text-xl font-bold rounded-xl transition-all duration-200 ${
                    digit
                      ? 'border border-pink-500/50 bg-pink-500/10 text-pink-400'
                      : 'border border-white/10 bg-white/5 text-slate-100'
                  }`}
                />
              ))}
            </div>
            <Button fullWidth loading={loading} onClick={handleVerify} size="lg">
              Verify OTP
            </Button>
            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-slate-500 text-sm">Resend OTP in {countdown}s</p>
              ) : (
                <button onClick={handleSendOTP} className="text-pink-400 text-sm flex items-center gap-1 mx-auto hover:text-pink-300">
                  <RefreshCw size={14} /> Resend OTP
                </button>
              )}
            </div>
          </div>
        )}

        <button onClick={() => navigate('/login')} className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mt-6 mx-auto">
          <ArrowLeft size={16} /> Back to login
        </button>
      </div>
    </div>
  );
}
