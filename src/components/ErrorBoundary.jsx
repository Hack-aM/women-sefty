import { Component } from 'react';
import { Shield, RefreshCw, AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[SafeHer ErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12"
        style={{ background: 'var(--color-bg-primary)' }}>
        {/* Ambient glow */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-sm w-full text-center">
          {/* Icon */}
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-red-500/20 to-rose-600/20 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle size={40} className="text-red-400" />
            </div>
          </div>

          {/* Text */}
          <div>
            <h1 className="font-display font-bold text-2xl text-slate-100 mb-2">
              Something went wrong
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              SafeHer encountered an unexpected error. Your safety data is secure.
            </p>
          </div>

          {/* Error detail */}
          {this.state.error?.message && (
            <div className="w-full glass-card p-3 text-left">
              <p className="text-xs text-red-400 font-mono break-all">
                {this.state.error.message}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => window.location.reload()}
              className="bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold transition-all"
            >
              <RefreshCw size={18} />
              Reload App
            </button>
            <a
              href="/"
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all"
            >
              <Shield size={16} />
              Go to Home
            </a>
            <button
              onClick={() => {
                try {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = '/';
                } catch {
                  window.location.reload();
                }
              }}
              className="py-2.5 border border-dashed border-red-500/20 hover:bg-red-500/10 text-red-400 text-xs font-semibold rounded-2xl transition-all"
            >
              Reset SafeHer State & Clear Cache
            </button>
          </div>

          <p className="text-xs text-slate-700 mt-2">
            SafeHer v1.0.0 — Your safety is our priority
          </p>
        </div>
      </div>
    );
  }
}
