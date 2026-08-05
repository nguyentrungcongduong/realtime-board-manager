import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { boardApi, cardApi, taskApi } from '@/services/board.service';
import { invitationApi } from '@/services/invitation.service';
import { joinBoard, leaveBoard, getSocket } from '@/socket/socket';
import { Task, Card, TaskStatus, Board } from '@/types';
import { cn } from '@/utils';
import {
  Plus, Loader2, UserPlus, X, User,
  Eye, AlignLeft, List, Archive, Github,
  Copy, Link as LinkIcon
} from 'lucide-react';
import avatarImg from '@/images/avata.png';

const DND_TYPE = 'TASK';

// ──────────────────────────────────────
// Task Card Item
// ──────────────────────────────────────
interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

function TaskCard({ task, onClick }: TaskCardProps) {
  const [{ isDragging }, drag] = useDrag({
    type: DND_TYPE,
    item: { taskId: task.id, cardId: task.cardId, status: task.status },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  return (
    <div
      ref={drag as unknown as React.Ref<HTMLDivElement>}
      onClick={onClick}
      className={cn(
        'bg-[#22272B] hover:bg-[#2C333A] text-slate-200 border border-slate-700/60 rounded-md p-2.5 text-xs font-medium cursor-grab active:cursor-grabbing transition-all select-none shadow-sm',
        isDragging && 'opacity-30'
      )}
    >
      <p className="line-clamp-2">{task.title}</p>
      {task.githubAttachments.length > 0 && (
        <div className="flex gap-1 mt-2">
          {task.githubAttachments.map((a) => (
            <span key={a.id} className="bg-slate-800 text-blue-400 text-[10px] px-1.5 py-0.5 rounded border border-slate-700 flex items-center gap-1">
              <Github className="w-3 h-3" />
              #{a.number ?? a.sha?.slice(0, 6)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────
// Kanban Column
// ──────────────────────────────────────
interface KanbanColumnProps {
  column: { id: TaskStatus; label: string };
  tasks: Task[];
  cards: Card[];
  onDrop: (taskId: string, fromCardId: string, toStatus: TaskStatus) => void;
  onAddTask: (cardId: string, status: TaskStatus) => void;
  onTaskClick: (task: Task) => void;
}

function KanbanColumn({ column, tasks, cards, onDrop, onAddTask, onTaskClick }: KanbanColumnProps) {
  const [{ isOver }, drop] = useDrop({
    accept: DND_TYPE,
    drop: (item: { taskId: string; cardId: string; status: TaskStatus }) => {
      if (item.status !== column.id) {
        onDrop(item.taskId, item.cardId, column.id);
      }
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  const defaultCard = cards[0];

  return (
    <div
      ref={drop as unknown as React.Ref<HTMLDivElement>}
      className={cn(
        'bg-[#101214] text-slate-300 rounded-xl p-3 min-w-[270px] w-[270px] flex flex-col gap-2 shrink-0 border border-slate-800/80 transition-all',
        isOver && 'ring-2 ring-blue-500/80 bg-[#161a1d]'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-1 py-0.5">
        <h4 className="font-bold text-xs text-slate-200">{column.label}</h4>
        <span className="text-[11px] text-slate-500 font-semibold">...</span>
      </div>

      {/* List of Tasks */}
      <div className="flex flex-col gap-2 min-h-[50px]">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
      </div>

      {/* "+ Add a card" Button matching Figma */}
      {defaultCard && (
        <button
          onClick={() => onAddTask(defaultCard.id, column.id)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1.5 rounded hover:bg-slate-800/60 transition-colors mt-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add a card</span>
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────
// Task Detail Modal (Matching Figma Image 5)
// ──────────────────────────────────────
interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: () => void;
}

function TaskDetailModal({ task, onClose, onUpdate }: TaskDetailModalProps) {
  const [description, setDescription] = useState(task.description || '');
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<string[]>([]);
  const [showGithubMenu, setShowGithubMenu] = useState(false);
  const [githubInput, setGithubInput] = useState('');
  const [attachType, setAttachType] = useState<'pull_request' | 'commit' | 'issue'>('pull_request');
  const [saving, setSaving] = useState(false);

  const handleSaveDescription = async () => {
    setSaving(true);
    try {
      await taskApi.update(task.boardId, task.cardId, task.id, { description });
      onUpdate();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setComments((prev) => [...prev, comment]);
    setComment('');
  };

  const handleAttachGithub = async () => {
    if (!githubInput.trim()) return;
    try {
      await taskApi.attachGitHub(task.boardId, task.cardId, task.id, {
        type: attachType,
        number: parseInt(githubInput, 10) || undefined,
        sha: attachType === 'commit' ? githubInput : undefined,
      });
      setShowGithubMenu(false);
      setGithubInput('');
      onUpdate();
    } catch (err) { console.error(err); }
  };

  const handleArchive = async () => {
    try {
      await taskApi.delete(task.boardId, task.cardId, task.id);
      onUpdate();
      onClose();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#282E33] border border-slate-700 text-slate-200 rounded-xl w-full max-w-2xl p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            💳 {task.title}
          </h2>
          <p className="text-xs text-slate-400">in list <span className="underline">{task.status}</span></p>
        </div>

        {/* Members & Notifications bar */}
        <div className="flex gap-6 items-center text-xs">
          <div>
            <p className="text-slate-400 font-semibold mb-1">Members</p>
            <div className="flex items-center gap-1.5">
              <img src={avatarImg} alt="Avatar" className="w-7 h-7 rounded-full object-cover" />
              <button className="w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <p className="text-slate-400 font-semibold mb-1">Notifications</p>
            <button className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 font-medium flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Watch
            </button>
          </div>
        </div>

        {/* Two-Column Body matching Figma Image 5 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content (2 Cols) */}
          <div className="md:col-span-2 space-y-6 text-xs">
            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-200 text-sm">
                <AlignLeft className="w-4 h-4" />
                <h3>Description</h3>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a more detailed description"
                className="w-full bg-[#1D2125] border border-slate-700 rounded p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none h-24"
              />
              <button
                onClick={handleSaveDescription}
                disabled={saving}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>

            {/* Activity / Comments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-200 text-sm">
                  <List className="w-4 h-4" />
                  <h3>Activity</h3>
                </div>
                <button className="px-2.5 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 font-medium text-[11px]">
                  Show details
                </button>
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2.5 items-start">
                <img src={avatarImg} alt="Avatar" className="w-7 h-7 rounded-full object-cover shrink-0" />
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 bg-[#1D2125] border border-slate-700 px-3 py-2 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </form>

              {comments.map((c, i) => (
                <div key={i} className="flex gap-2.5 items-start pl-1">
                  <img src={avatarImg} alt="Avatar" className="w-6 h-6 rounded-full object-cover shrink-0" />
                  <div className="bg-[#1D2125] border border-slate-700/80 p-2 rounded text-slate-300">
                    {c}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Sidebar Actions (1 Col) matching Figma */}
          <div className="space-y-4 text-xs">
            <div>
              <p className="text-slate-400 font-bold mb-2">Add to card</p>
              <button className="w-full bg-[#353D45] hover:bg-slate-600 text-slate-200 px-3 py-2 rounded flex items-center gap-2 font-semibold transition-colors mb-2">
                <User className="w-3.5 h-3.5" /> Members
              </button>
            </div>

            <div>
              <p className="text-slate-400 font-bold mb-2">Power-Ups</p>
              <div className="relative">
                <button
                  onClick={() => setShowGithubMenu(!showGithubMenu)}
                  className="w-full bg-[#353D45] hover:bg-slate-600 text-slate-200 px-3 py-2 rounded flex items-center gap-2 font-semibold transition-colors"
                >
                  <Github className="w-3.5 h-3.5" /> GitHub
                </button>

                {showGithubMenu && (
                  <div className="mt-2 p-3 bg-[#1D2125] border border-slate-700 rounded-lg space-y-2">
                    <select
                      value={attachType}
                      onChange={(e) => setAttachType(e.target.value as typeof attachType)}
                      className="w-full bg-slate-800 border border-slate-700 p-1.5 rounded text-slate-200 text-xs"
                    >
                      <option value="pull_request">Attach Pull Request</option>
                      <option value="commit">Attach Commit</option>
                      <option value="issue">Attach Issue</option>
                    </select>
                    <input
                      value={githubInput}
                      onChange={(e) => setGithubInput(e.target.value)}
                      placeholder={attachType === 'commit' ? 'Commit SHA' : 'PR/Issue Number'}
                      className="w-full bg-slate-800 border border-slate-700 p-1.5 rounded text-slate-200 text-xs"
                    />
                    <button
                      onClick={handleAttachGithub}
                      className="w-full py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs"
                    >
                      Attach
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-slate-400 font-bold mb-2">Actions</p>
              <button
                onClick={handleArchive}
                className="w-full bg-[#353D45] hover:bg-red-600/80 text-slate-200 px-3 py-2 rounded flex items-center gap-2 font-semibold transition-colors"
              >
                <Archive className="w-3.5 h-3.5" /> Archive
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────
// Invite to Board Modal (Matching Figma Image 6)
// ──────────────────────────────────────
function InviteModal({ boardId, onClose }: { boardId: string; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await invitationApi.invite(boardId, email);
      setMsg(`Invitation sent to ${email}!`);
      setEmail('');
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMsg(m ?? 'Failed to send invitation');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#282E33] border border-slate-700 text-slate-200 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
        <h3 className="text-base font-bold text-white">Invite to Board</h3>

        {msg && (
          <p className={cn('text-xs p-2 rounded', msg.includes('sent') ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300')}>
            {msg}
          </p>
        )}

        <form onSubmit={handleInvite} className="relative">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address or name"
            className="w-full bg-[#1D2125] border border-slate-700 px-3 py-2 pr-8 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            autoFocus
          />
          {email && (
            <button type="button" onClick={() => setEmail('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        <div className="flex items-center justify-between pt-2 border-t border-slate-700 text-xs">
          <div>
            <p className="text-slate-400 text-[11px]">Invite someone to this Workspace with a link:</p>
            <span className="text-blue-400 text-[11px] cursor-pointer hover:underline">Disable link</span>
          </div>

          <button
            onClick={handleCopyLink}
            className="px-3 py-1.5 bg-[#353D45] hover:bg-slate-600 text-slate-200 rounded font-semibold text-xs transition-colors flex items-center gap-1.5 shrink-0"
          >
            {copied ? <Copy className="w-3.5 h-3.5 text-emerald-400" /> : <LinkIcon className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy link'}</span>
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────
// Main Board Detail Page
// ──────────────────────────────────────
const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'icebox',  label: 'To do' },
  { id: 'ongoing', label: 'Doing' },
  { id: 'done',    label: 'Done' },
];

function BoardDetailPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Fetch board info
  const { data: board, isLoading: boardLoading } = useQuery<Board>({
    queryKey: ['board', boardId],
    queryFn: async () => (await boardApi.getById(boardId!)).data.data,
    enabled: !!boardId,
  });

  // Fetch cards
  const { data: cards = [] } = useQuery<Card[]>({
    queryKey: ['cards', boardId],
    queryFn: async () => (await cardApi.getAll(boardId!)).data.data,
    enabled: !!boardId,
  });

  // Auto-create default Card if none exists
  const createDefaultCardMutation = useMutation({
    mutationFn: () => cardApi.create(boardId!, { name: 'Main Card', description: '' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards', boardId] }),
  });

  useEffect(() => {
    if (cards.length === 0 && !boardLoading && boardId) {
      createDefaultCardMutation.mutate();
    }
  }, [cards, boardLoading, boardId]);

  // Fetch all tasks
  const { data: fetchedTasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['tasks', boardId],
    queryFn: async () => {
      if (cards.length === 0) return [];
      const results = await Promise.all(
        cards.map((card) => taskApi.getAll(boardId!, card.id).then((r) => r.data.data))
      );
      return results.flat();
    },
    enabled: cards.length > 0,
  });

  useEffect(() => {
    setTasks(fetchedTasks);
  }, [fetchedTasks]);

  // Socket.IO real-time listeners
  useEffect(() => {
    if (!boardId) return;
    joinBoard(boardId);
    const socket = getSocket();
    const handler = (data: { boardId: string; tasks: Task[] }) => {
      if (data.boardId === boardId) setTasks(data.tasks);
    };
    socket.on('board:updated', handler);
    return () => {
      leaveBoard(boardId);
      socket.off('board:updated', handler);
    };
  }, [boardId]);

  // Mutations
  const moveTask = useMutation({
    mutationFn: ({ taskId, cardId, status }: { taskId: string; cardId: string; status: TaskStatus }) =>
      taskApi.update(boardId!, cardId, taskId, { status }),
    onMutate: ({ taskId, status }) => {
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status } : t));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', boardId] }),
  });

  const handleDrop = useCallback((taskId: string, fromCardId: string, toStatus: TaskStatus) => {
    moveTask.mutate({ taskId, cardId: fromCardId, status: toStatus });
  }, [moveTask]);

  const handleAddTask = useCallback(async (cardId: string, status: TaskStatus) => {
    const title = prompt('Enter card title:');
    if (!title) return;
    try {
      await taskApi.create(boardId!, cardId, { title, status });
      queryClient.invalidateQueries({ queryKey: ['tasks', boardId] });
    } catch (err) { console.error(err); }
  }, [boardId, queryClient]);

  if (boardLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!board) return null;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="-m-6 flex flex-col h-[calc(100vh-3rem)]">
        {/* Magenta / Purple Board Bar matching Figma Image 4 */}
        <div className="bg-trello-boardbar px-4 py-2.5 flex items-center justify-between shrink-0 shadow-sm">
          <h1 className="font-bold text-sm text-white">{board.name}</h1>

          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-black/20 hover:bg-black/30 text-white rounded text-xs font-semibold transition-colors border border-white/20"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite member</span>
          </button>
        </div>

        {/* Main Kanban Canvas */}
        <div className="flex-1 p-6 overflow-x-auto flex gap-4 items-start bg-trello-workspace">
          {tasksLoading ? (
            <div className="flex justify-center py-12 w-full">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : (
            <>
              {COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  tasks={tasks.filter((t) => t.status === col.id)}
                  cards={cards}
                  onDrop={handleDrop}
                  onAddTask={handleAddTask}
                  onTaskClick={(t) => setSelectedTask(t)}
                />
              ))}

              {/* "+ Add another list" Button matching Figma Image 4 */}
              <button
                onClick={() => {
                  const cardName = prompt('Enter list name:');
                  if (cardName) {
                    cardApi.create(boardId!, { name: cardName, description: '' }).then(() => {
                      queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
                    });
                  }
                }}
                className="bg-trello-boardbar/80 hover:bg-trello-boardbar text-white px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-colors"
              >
                + Add another list
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ['tasks', boardId] })}
        />
      )}

      {showInviteModal && (
        <InviteModal boardId={boardId!} onClose={() => setShowInviteModal(false)} />
      )}
    </DndProvider>
  );
}

export default BoardDetailPage;
