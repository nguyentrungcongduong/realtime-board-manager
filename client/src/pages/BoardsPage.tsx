import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { boardApi } from '@/services/board.service';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2, Pencil } from 'lucide-react';
import { Board } from '@/types';
import { useAuthStore } from '@/store/auth.store';

function BoardsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const { data: boards = [], isLoading } = useQuery<Board[]>({
    queryKey: ['boards'],
    queryFn: async () => (await boardApi.getAll()).data.data,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) => boardApi.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      setShowCreate(false);
      setName('');
      setDescription('');
      navigate(`/boards/${res.data.data.id}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ boardId, data }: { boardId: string; data: { name?: string; description?: string } }) =>
      boardApi.update(boardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      setEditingBoard(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (boardId: string) => boardApi.delete(boardId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boards'] }),
  });

  const openEditModal = (board: Board, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBoard(board);
    setEditName(board.name);
    setEditDescription(board.description || '');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header matching Figma Image 3 */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-4">
          YOUR WORKSPACES
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Board Cards */}
            {boards.map((board) => (
              <div
                key={board.id}
                onClick={() => navigate(`/boards/${board.id}`)}
                className="relative bg-white text-slate-900 rounded p-4 h-28 cursor-pointer shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{board.name}</h3>
                  {board.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">{board.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {board.members.length} member{board.members.length > 1 ? 's' : ''}
                  </span>
                  {board.ownerId === user?.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => openEditModal(board, e)}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Edit board"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(board.id); }}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete board"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* "+ Create a new board" Card matching Figma */}
            <div
              onClick={() => setShowCreate(true)}
              className="bg-trello-sidebar/80 border border-trello-border/60 hover:border-trello-border rounded p-4 h-28 cursor-pointer flex items-center justify-center text-trello-text hover:text-white transition-all text-xs font-medium"
            >
              <span>+ Create a new board</span>
            </div>
          </div>
        )}
      </div>

      {/* Create Board Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-trello-modal border border-trello-border text-trello-heading rounded-lg w-full max-w-sm p-5 space-y-4">
            <h3 className="text-base font-bold text-white">Create board</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Board title *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-trello-workspace border border-trello-border px-3 py-2 rounded text-slate-200 focus:outline-none focus:border-blue-500"
                  placeholder="e.g. My Trello board"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-trello-workspace border border-trello-border px-3 py-2 rounded text-slate-200 focus:outline-none focus:border-blue-500 resize-none h-16"
                  placeholder="Optional board description..."
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate({ name, description })}
                disabled={!name.trim() || createMutation.isPending}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Board Modal */}
      {editingBoard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-trello-modal border border-trello-border text-trello-heading rounded-lg w-full max-w-sm p-5 space-y-4">
            <h3 className="text-base font-bold text-white">Edit Board</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Board title *</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-trello-workspace border border-trello-border px-3 py-2 rounded text-slate-200 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-trello-workspace border border-trello-border px-3 py-2 rounded text-slate-200 focus:outline-none focus:border-blue-500 resize-none h-16"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setEditingBoard(null)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => updateMutation.mutate({ boardId: editingBoard.id, data: { name: editName, description: editDescription } })}
                disabled={!editName.trim() || updateMutation.isPending}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BoardsPage;
