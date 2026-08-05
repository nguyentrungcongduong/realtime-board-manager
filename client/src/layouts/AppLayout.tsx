import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { disconnectSocket } from '@/socket/socket';
import { LayoutDashboard, LogOut, Bell } from 'lucide-react';

function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/boards" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-slate-900">BoardManager</span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Notifications placeholder */}
            <button className="btn-ghost p-2 rounded-lg relative">
              <Bell className="w-5 h-5 text-slate-500" />
            </button>

            {/* User avatar */}
            <div className="flex items-center gap-2">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.displayName}
                  className="w-8 h-8 rounded-full object-cover border-2 border-indigo-100"
                />
              ) : (
                <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold">
                  {user?.displayName?.[0]?.toUpperCase()}
                </div>
              )}
              <span className="text-sm font-semibold text-slate-700 hidden sm:block">
                {user?.displayName}
              </span>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="btn-ghost p-2 rounded-lg text-slate-500 hover:text-red-500"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
