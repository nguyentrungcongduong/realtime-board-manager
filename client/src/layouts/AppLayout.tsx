import { useState } from 'react';
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { disconnectSocket } from '@/socket/socket';
import { SkipliLogo } from '@/components/SkipliLogo';
import { LayoutGrid, Rocket, LayoutDashboard, Users, LogOut, X, Loader2 } from 'lucide-react';
import { cn } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { boardApi } from '@/services/board.service';
import { authApi } from '@/services/auth.service';
import { githubApi } from '@/services/invitation.service';
import avatarImg from '@/images/avata.png';

function AppLayout() {
  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { boardId } = useParams<{ boardId?: string }>();

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState('');

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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim()) return;
    setUpdating(true);
    setMsg('');
    try {
      const res = await authApi.updateProfile(user.id, { displayName });
      setUser({ ...user, displayName: res.data.data.displayName });
      setMsg('Profile updated successfully!');
      setTimeout(() => setMsg(''), 2000);
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMsg(m ?? 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
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
            onClick={() => setShowProfileModal(true)}
            className="w-7 h-7 rounded-full overflow-hidden border border-red-500 cursor-pointer hover:opacity-90 transition-opacity"
            title={`Logged in as ${user?.displayName || user?.email} (Click for Account Settings)`}
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
                onClick={() => setShowProfileModal(true)}
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

      {/* Account Settings / Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#282E33] border border-slate-700 text-slate-200 rounded-xl w-full max-w-sm p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <img src={avatarImg} alt="Avatar" className="w-12 h-12 rounded-full border border-red-500 object-cover" />
              <div>
                <h3 className="font-bold text-sm text-white">{user?.displayName || 'User'}</h3>
                <p className="text-xs text-slate-400">{user?.email}</p>
              </div>
            </div>

            {msg && (
              <p className={cn('text-xs p-2 rounded', msg.includes('success') ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300')}>
                {msg}
              </p>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-3 pt-2 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Display Name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-[#1D2125] border border-slate-700 px-3 py-2 rounded text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Integrations</label>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await githubApi.getOAuthUrl();
                      window.location.href = res.data.data.url;
                    } catch {
                      alert('GitHub Client ID is not configured in server .env');
                    }
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  <span>Connect with GitHub</span>
                </button>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded font-semibold transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" /> Log out
                </button>

                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition-colors flex items-center gap-1.5"
                >
                  {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppLayout;
