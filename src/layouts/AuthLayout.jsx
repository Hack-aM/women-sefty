import { Outlet } from 'react-router-dom';
export default function AuthLayout() {
  return (
    <div className="min-h-dvh bg-dark-400 flex flex-col relative overflow-hidden">
      {/* Ambient background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-[40%] left-[60%] w-[200px] h-[200px] bg-pink-500/5 rounded-full blur-[60px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(236,72,153,0.5) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(236,72,153,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 flex flex-col flex-1">
        <Outlet />
      </div>
    </div>
  );
}
