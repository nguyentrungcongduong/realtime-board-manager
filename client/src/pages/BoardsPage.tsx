import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { boardApi } from '@/services/board.service';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutDashboard, Users, Trash2, Pencil, Loader2 } from 'lucide-react';
import { Board } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import { cn, formatDate } from '@/utils';

function BoardsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const res = await boardApi.getAll();
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) => boardApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      setShowCreate(false);
      setName('');
      setDescription('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (boardId: string) => boardApi.delete(boardId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boards'] }),
  });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            My <span className="gradient-text">Boards</span>
          </h1>
          <p className="text-slate-500 mt-1">Manage your projects and collaborate with your team</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Board
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card p-6 mb-6 animate-fade-in border-indigo-100">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Create a new board</h2>
          <div className="space-y-3">
            <div>
              <label className="label">Board name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="e.g. Marketing Campaign Q3"
              />
            </div>
            <div>
              <label className="label">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input resize-none h-20"
                placeholder="What is this board about?"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => createMutation.mutate({ name, description })}
                disabled={!name.trim() || createMutation.isPending}
                className="btn-primary"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Board'}
              </button>
              <button onClick={() => setShowCreate(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Board grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : data?.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4 shadow-button">
            <LayoutDashboard className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">No boards yet</h3>
          <p className="text-slate-500 mt-1">Create your first board to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.map((board: Board) => (
            <div
              key={board.id}
              className="card p-5 cursor-pointer group"
              onClick={() => navigate(`/boards/${board.id}`)}
            >
              {/* Board icon */}
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-button">
                  <LayoutDashboard className="w-5 h-5 text-white" />
                </div>
                {board.ownerId === user?.id && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(board.id); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <h3 className="font-bold text-slate-800 text-lg mb-1 line-clamp-1">{board.name}</h3>
              <p className="text-sm text-slate-500 line-clamp-2 mb-4 min-h-[40px]">
                {board.description || 'No description'}
              </p>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className={cn('flex items-center gap-1', 'text-slate-400')}>
                  <Users className="w-3.5 h-3.5" />
                  <span>{board.members.length} member{board.members.length !== 1 ? 's' : ''}</span>
                </div>
                <span>{formatDate(board.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BoardsPage;
