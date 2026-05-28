import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from '../components/navigation/BottomNav';
import TopBar from '../components/navigation/TopBar';
import Sidebar from '../components/navigation/Sidebar';
import InstallBanner from '../components/ui/InstallBanner';

export default function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-dvh bg-dark-400 flex relative overflow-hidden">
      {/* Ambient bg orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-[-10%] w-[400px] h-[400px] bg-pink-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-[-10%] w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/2 rounded-full blur-[150px]" />
      </div>

      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 lg:ml-64 relative z-10 min-h-dvh">
        <TopBar />
        <InstallBanner />

        <main className="flex-1 overflow-y-auto safe-pb">
          <div key={location.pathname} className="page-fade-in h-full">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom nav */}
        <BottomNav />
      </div>
    </div>
  );
}
