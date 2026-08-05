import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { disconnectSocket } from '@/socket/socket';
import { SkipliLogo } from '@/components/SkipliLogo';
import { LayoutGrid, Rocket, LayoutDashboard, Users, LogOut } from 'lucide-react';
import { cn } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { boardApi } from '@/services/board.service';
import avatarImg from '@/images/avata.png';

function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { boardId } = useParams<{ boardId?: string }>();

  // Fetch current board if in board detail view
  const { data: currentBoard } = useQuery({
    queryKey: ['board', boardId],
    queryFn: async () => (await boardApi.getById(boardId!)).data.data,
    enabled: !!boardId,
  });

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/login');
  };

  const isBoardDetail = location.pathname.startsWith('/boards/') && boardId;

  return (
    <div className="min-h-screen bg-trello-workspace text-trello-text flex flex-col font-sans">
      {/* Top Navbar matching Figma */}
      <header className="h-12 bg-trello-topbar border-b border-trello-border/40 px-4 flex items-center justify-between shrink-0 z-40">
        {/* Left: Grid Icon + Skipli Logo */}
        <div className="flex items-center gap-3">
          <button className="text-slate-400 hover:text-white transition-colors">
            <LayoutGrid className="w-5 h-5" />
          </button>
          <div
            onClick={() => navigate('/boards')}
            className="flex items-center gap-1.5 cursor-pointer select-none"
          >
            <SkipliLogo className="w-6 h-6" />
          </div>
        </div>

        {/* Right: Rocket Icon + Avatar Image */}
        <div className="flex items-center gap-3">
          <button className="text-slate-400 hover:text-white transition-colors" title="Quick actions">
            <Rocket className="w-4 h-4" />
          </button>

          {/* Avatar image matching Figma SD circle */}
          <div
            onClick={handleLogout}
            className="w-7 h-7 rounded-full overflow-hidden border border-red-500 cursor-pointer hover:opacity-90 transition-opacity"
            title={`Logged in as ${user?.displayName || user?.email} (Click to logout)`}
          >
            <img src={avatarImg} alt="Avatar" className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Dark Left Sidebar */}
        <aside className="w-64 bg-trello-sidebar border-r border-trello-border/40 flex flex-col justify-between p-4 shrink-0 text-sm select-none">
          {!isBoardDetail ? (
            /* Dashboard Sidebar View */
            <div className="space-y-1">
              <button
                onClick={() => navigate('/boards')}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded text-left font-medium transition-colors',
                  location.pathname === '/boards'
                    ? 'bg-trello-border/40 text-white border border-trello-border/60'
                    : 'hover:bg-trello-border/20 text-trello-text'
                )}
              >
                <LayoutDashboard className="w-4 h-4 text-blue-400" />
                <span>Boards</span>
              </button>

              <button
                className="w-full flex items-center gap-3 px-3 py-2 rounded text-left font-medium hover:bg-trello-border/20 text-trello-text transition-colors"
              >
                <Users className="w-4 h-4 text-slate-400" />
                <span>All Members</span>
              </button>
            </div>
          ) : (
            /* Board Detail Sidebar View matching Figma Image 4 */
            <div className="space-y-6 overflow-y-auto">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
                  <span>Your boards</span>
                  <span className="cursor-pointer hover:text-white">...</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 text-slate-200 font-medium text-sm">
                  <span className="w-2 h-2 rounded-sm bg-pink-600"></span>
                  <span className="truncate">{currentBoard?.name || 'Board'}</span>
                </div>
              </div>

              {/* Members List */}
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold mb-3">
                  <Users className="w-3.5 h-3.5" />
                  <span>Members</span>
                </div>
                <div className="space-y-2.5 pl-2">
                  {currentBoard?.members.map((memberId, idx) => (
                    <div key={memberId} className="flex items-center gap-2 text-xs text-slate-300">
                      <img src={avatarImg} alt="Avatar" className="w-5 h-5 rounded-full object-cover" />
                      <span>{idx === 0 ? 'User 1 (Owner)' : `User ${idx + 1}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sidebar Footer */}
          {isBoardDetail ? (
            <div className="pt-4 border-t border-trello-border/40 space-y-2">
              <p className="text-[11px] text-slate-500 leading-tight">
                You can't find and reopen closed boards if close the board
              </p>
              <button
                onClick={() => navigate('/boards')}
                className="w-full py-2 bg-red-500/80 hover:bg-red-600 text-white font-semibold text-xs rounded transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="pt-4 border-t border-trello-border/40">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-trello-border/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-trello-workspace p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
