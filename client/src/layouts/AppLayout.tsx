import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { disconnectSocket, getSocket } from '@/socket/socket';
import { SkipliLogo } from '@/components/SkipliLogo';
import { LayoutGrid, Rocket, LayoutDashboard, Users, LogOut, X, Loader2, Bell, Check, X as XIcon, Github, GitBranch, ExternalLink } from 'lucide-react';
import { cn } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { boardApi } from '@/services/board.service';
import { authApi } from '@/services/auth.service';
import { invitationApi, githubApi } from '@/services/invitation.service';
import { Invitation, Board } from '@/types';
import avatarImg from '@/images/avata.png';

function AppLayout() {
  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { boardId } = useParams<{ boardId?: string }>();
  const queryClient = useQueryClient();

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAllMembersModal, setShowAllMembersModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showGithubExplorer, setShowGithubExplorer] = useState(false);
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [loadingGithubRepos, setLoadingGithubRepos] = useState(false);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Fetch pending invitations
  const { data: invitations = [], refetch: refetchInvitations } = useQuery<Invitation[]>({
    queryKey: ['invitations'],
    queryFn: async () => (await invitationApi.getMyInvitations()).data.data,
  });

  // Fetch user boards for fallback
  const { data: userBoards = [] } = useQuery<Board[]>({
    queryKey: ['boards'],
    queryFn: async () => (await boardApi.getAll()).data.data,
  });

  // Fetch current board if in board detail view
  const { data: currentBoard } = useQuery({
    queryKey: ['board', boardId],
    queryFn: async () => (await boardApi.getById(boardId!)).data.data,
    enabled: !!boardId,
  });

  // Listen for socket invitation events
  useEffect(() => {
    const socket = getSocket();
    const handler = () => refetchInvitations();
    socket.on('invitation:received', handler);
    return () => {
      socket.off('invitation:received', handler);
    };
  }, [refetchInvitations]);

  // Respond to invitation mutation
  const respondMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'accepted' | 'declined' }) =>
      invitationApi.respond(id, status),
    onSuccess: () => {
      refetchInvitations();
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
  });

  const [githubNotConnected, setGithubNotConnected] = useState(false);

  const handleFetchGithubRepos = async () => {
    setShowGithubExplorer(true);
    setLoadingGithubRepos(true);
    setGithubNotConnected(false);
    try {
      const res = await githubApi.getRepositories();
      setGithubRepos((res.data.data as any[]) || []);
    } catch {
      setGithubNotConnected(true);
      setGithubRepos([]);
    } finally {
      setLoadingGithubRepos(false);
    }
  };

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

        {/* Right: GitHub Explorer + Bell Notifications + Rocket Icon + Avatar Image */}
        <div className="flex items-center gap-3">
          {/* GitHub Explorer button */}
          <button
            onClick={handleFetchGithubRepos}
            className="text-slate-400 hover:text-white transition-colors p-1 flex items-center gap-1 text-xs"
            title="GitHub Explorer"
          >
            <Github className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline font-semibold">GitHub</span>
          </button>

          {/* Bell Icon with badge */}
          <button
            onClick={() => setShowNotificationsModal(true)}
            className="relative text-slate-400 hover:text-white transition-colors p-1"
            title="Notifications & Invitations"
          >
            <Bell className="w-4 h-4" />
            {invitations.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-skipli-red text-white text-[10px] font-bold flex items-center justify-center">
                {invitations.length}
              </span>
            )}
          </button>

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
                onClick={() => setShowAllMembersModal(true)}
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
                  <span>Members ({currentBoard?.members.length || 0})</span>
                </div>
                <div className="space-y-2.5 pl-2">
                  {currentBoard?.members.map((memberId) => {
                    const isCurrentUser = memberId === user?.id;
                    const isOwner = memberId === currentBoard.ownerId;
                    const nameToDisplay = isCurrentUser
                      ? (user?.displayName || user?.email?.split('@')[0] || 'User')
                      : (isOwner ? 'Board Owner' : `Member (${memberId.slice(0, 6)})`);

                    return (
                      <div key={memberId} className="flex items-center gap-2 text-xs text-slate-300">
                        <img src={avatarImg} alt="Avatar" className="w-5 h-5 rounded-full border border-slate-700 object-cover" />
                        <span className="truncate">
                          {nameToDisplay} {isOwner && <span className="text-amber-400 font-semibold text-[10px] ml-1">(Owner)</span>}
                        </span>
                      </div>
                    );
                  })}
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

      {/* GitHub Explorer Modal */}
      {showGithubExplorer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#282E33] border border-slate-700 text-slate-200 rounded-xl w-full max-w-md p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Github className="w-4 h-4 text-blue-400" /> GitHub Repositories Explorer
              </h3>
              <button onClick={() => setShowGithubExplorer(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingGithubRepos ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
              </div>
            ) : githubNotConnected ? (
              <div className="text-center py-6 space-y-3">
                <Github className="w-10 h-10 text-blue-400 mx-auto" />
                <h4 className="font-bold text-sm text-white">Connect Your GitHub Account</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Link your GitHub account to load your real repositories, branches, commits, PRs, and issues.
                </p>
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <Github className="w-4 h-4" /> Connect with GitHub
                </button>
              </div>
            ) : githubRepos.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No repositories found in your GitHub account</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
                {githubRepos.map((repo) => (
                  <div key={repo.id} className="p-3 bg-[#1D2125] border border-slate-700 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5 text-blue-400" /> {repo.name}
                      </span>
                      <a href={repo.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1 text-[11px]">
                        <ExternalLink className="w-3 h-3" /> GitHub
                      </a>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{repo.fullName}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notifications / Pending Invitations Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#282E33] border border-slate-700 text-slate-200 rounded-xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-400" /> Pending Invitations
              </h3>
              <button onClick={() => setShowNotificationsModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {invitations.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No pending invitations</p>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto">
                {invitations.map((inv) => (
                  <div key={inv.id} className="p-3 bg-[#1D2125] border border-slate-700 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-200">Board Invitation</p>
                      <p className="text-[11px] text-slate-400">Board ID: {inv.boardId.slice(0, 8)}...</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => respondMutation.mutate({ id: inv.id, status: 'accepted' })}
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded"
                        title="Accept"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => respondMutation.mutate({ id: inv.id, status: 'declined' })}
                        className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded"
                        title="Decline"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Workspace All Members Modal */}
      {showAllMembersModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#282E33] border border-slate-700 text-slate-200 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowAllMembersModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-base text-white">Workspace Members</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Members of your Workspace can view, join, and collaborate across shared boards.
            </p>

            {/* Invite Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!inviteEmail.trim()) return;
                setInviteLoading(true);
                setInviteMsg('');
                try {
                  const targetBoardId = boardId || (userBoards.length > 0 ? userBoards[0].id : 'board_default');
                  await invitationApi.invite(targetBoardId, inviteEmail);
                  setInviteMsg(`Invitation sent to ${inviteEmail}!`);
                  setInviteEmail('');
                } catch (err: any) {
                  const m = err?.response?.data?.message;
                  setInviteMsg(m || 'Failed to send invitation');
                } finally {
                  setInviteLoading(false);
                }
              }}
              className="space-y-2 pt-1 border-t border-slate-700"
            >
              <label className="block text-xs font-semibold text-slate-300">Invite new member by Email</label>
              {inviteMsg && (
                <p className={cn(
                  'text-[11px] p-2 rounded font-semibold border',
                  inviteMsg.includes('sent')
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800'
                    : 'bg-amber-950/90 text-amber-300 border-amber-800'
                )}>
                  {inviteMsg}
                </p>
              )}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter member's email..."
                  className="flex-1 bg-[#1D2125] border border-slate-700 px-3 py-1.5 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={!inviteEmail.trim() || inviteLoading}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs transition-colors flex items-center gap-1 shrink-0 disabled:opacity-50"
                >
                  {inviteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Invite Member'}
                </button>
              </div>
            </form>

            <div className="space-y-2 max-h-48 overflow-y-auto pt-2 border-t border-slate-700">
              <p className="text-[11px] text-slate-400 font-semibold mb-1">Current Members</p>
              <div className="p-3 bg-[#1D2125] border border-slate-700 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={avatarImg} alt="Avatar" className="w-8 h-8 rounded-full border border-red-500 object-cover" />
                  <div>
                    <p className="font-bold text-xs text-white flex items-center gap-1.5">
                      {user?.displayName || 'User'}
                      <span className="text-[10px] text-amber-400 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-800/80 font-bold">You (Admin)</span>
                    </p>
                    <p className="text-[11px] text-slate-400">{user?.email}</p>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded font-semibold border border-emerald-800">
                  Active
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-700 flex justify-end">
              <button
                onClick={() => setShowAllMembersModal(false)}
                className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded font-semibold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppLayout;
