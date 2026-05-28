import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Home } from 'lucide-react';
import Button from '../components/ui/Button';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-dark-400 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient bg */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div
        className="flex flex-col items-center gap-6 relative z-10 text-center"
      >
        {/* 404 */}
        <div className="relative">
          <p className="font-display font-black text-[120px] leading-none"
            style={{
              background: 'linear-gradient(135deg, rgba(236,72,153,0.2), rgba(168,85,247,0.2))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
            404
          </p>
          <div
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/20 flex items-center justify-center">
              <Shield size={36} className="text-pink-400" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="font-display font-bold text-2xl text-slate-100">Page Not Found</h1>
          <p className="text-slate-400 text-sm max-w-xs">
            This page doesn't exist. Let's get you back to safety.
          </p>
        </div>

        <div className="flex gap-3 flex-wrap justify-center">
          <Button onClick={() => navigate(-1)} variant="ghost">
            <ArrowLeft size={18} /> Go Back
          </Button>
          <Button onClick={() => navigate('/')}>
            <Home size={18} /> Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
