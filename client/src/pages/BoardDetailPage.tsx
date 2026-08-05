import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { boardApi, cardApi, taskApi } from '@/services/board.service';
import { invitationApi } from '@/services/invitation.service';
import { joinBoard, leaveBoard, getSocket } from '@/socket/socket';
import { useAuthStore } from '@/store/auth.store';
import { Task, Card, TaskStatus, Board } from '@/types';
import { cn, formatDate, isOverdue } from '@/utils';
import {
  ArrowLeft, Plus, Loader2, Users, Calendar,
  MoreHorizontal, Trash2, GripVertical, UserPlus,
  GitPullRequest, GitCommit, AlertCircle, X
} from 'lucide-react';

// ──────────────────────────────────────
// Constants
// ──────────────────────────────────────
const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'icebox',  label: '🧊 Icebox',   color: 'bg-slate-100 border-slate-200' },
  { id: 'backlog', label: '📋 Backlog',  color: 'bg-blue-50 border-blue-200' },
  { id: 'ongoing', label: '⚡ Ongoing',  color: 'bg-amber-50 border-amber-200' },
  { id: 'review',  label: '🔍 Review',   color: 'bg-purple-50 border-purple-200' },
  { id: 'done',    label: '✅ Done',     color: 'bg-emerald-50 border-emerald-200' },
];

const DND_TYPE = 'TASK';

// ──────────────────────────────────────
// Task Card (Draggable)
// ──────────────────────────────────────
interface TaskCardProps {
  task: Task;
  boardId: string;
  onDelete: (taskId: string, cardId: string) => void;
}

function TaskCard({ task, boardId, onDelete }: TaskCardProps) {
  const [{ isDragging }, drag] = useDrag({
    type: DND_TYPE,
    item: { taskId: task.id, cardId: task.cardId, status: task.status },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const priorityClass = {
    low: 'badge-low',
    medium: 'badge-medium',
    high: 'badge-high',
  }[task.priority];

  return (
    <div
      ref={drag as unknown as React.Ref<HTMLDivElement>}
      className={cn(
        'bg-white rounded-xl border border-slate-100 p-3.5 shadow-soft cursor-grab active:cursor-grabbing',
        'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-hover group',
        isDragging && 'opacity-40 rotate-2 scale-95'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2 flex-1">
          {task.title}
        </p>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <GripVertical className="w-3.5 h-3.5 text-slate-300" />
          <button
            onClick={() => onDelete(task.id, task.cardId)}
            className="p-0.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-slate-400 mb-2 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={cn('badge text-xs', priorityClass)}>
          {task.priority}
        </span>

        {task.deadline && (
          <span className={cn(
            'flex items-center gap-1 text-xs',
            isOverdue(task.deadline) ? 'text-red-500' : 'text-slate-400'
          )}>
            <Calendar className="w-3 h-3" />
            {formatDate(task.deadline)}
          </span>
        )}
      </div>

      {task.githubAttachments.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {task.githubAttachments.map((a) => (
            <span key={a.id} className="badge bg-slate-100 text-slate-600 text-xs">
              {a.type === 'pull_request' && <GitPullRequest className="w-3 h-3" />}
              {a.type === 'commit' && <GitCommit className="w-3 h-3" />}
              {a.type === 'issue' && <AlertCircle className="w-3 h-3" />}
              #{a.number ?? a.sha?.slice(0, 7)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────
// Kanban Column (Droppable)
// ──────────────────────────────────────
interface KanbanColumnProps {
  column: typeof COLUMNS[0];
  tasks: Task[];
  cards: Card[];
  boardId: string;
  onDrop: (taskId: string, fromCardId: string, toStatus: TaskStatus) => void;
  onDeleteTask: (taskId: string, cardId: string) => void;
  onAddTask: (cardId: string, status: TaskStatus) => void;
}

function KanbanColumn({ column, tasks, cards, boardId, onDrop, onDeleteTask, onAddTask }: KanbanColumnProps) {
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
        'flex flex-col rounded-2xl border-2 min-w-[260px] w-[260px] transition-all duration-200',
        column.color,
        isOver && 'scale-[1.01] shadow-hover ring-2 ring-indigo-300'
      )}
    >
      {/* Column header */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-700">{column.label}</span>
        <span className="text-xs font-semibold text-slate-400 bg-white rounded-full px-2 py-0.5 shadow-sm">
          {tasks.length}
        </span>
      </div>

      {/* Tasks */}
      <div className="flex-1 px-3 pb-3 flex flex-col gap-2 min-h-[120px]">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            boardId={boardId}
            onDelete={onDeleteTask}
          />
        ))}

        {isOver && tasks.length === 0 && (
          <div className="flex-1 rounded-xl border-2 border-dashed border-indigo-300 flex items-center justify-center min-h-[80px]">
            <p className="text-xs text-indigo-400">Drop here</p>
          </div>
        )}
      </div>

      {/* Add task button */}
      {defaultCard && (
        <div className="px-3 pb-3">
          <button
            onClick={() => onAddTask(defaultCard.id, column.id)}
            className="w-full flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-indigo-600 hover:bg-white/70 transition-all duration-200"
          >
            <Plus className="w-3.5 h-3.5" />
            Add task
          </button>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────
// Add Task Modal
// ──────────────────────────────────────
interface AddTaskModalProps {
  cardId: string;
  boardId: string;
  defaultStatus: TaskStatus;
  onClose: () => void;
  onSuccess: () => void;
}

function AddTaskModal({ cardId, boardId, defaultStatus, onClose, onSuccess }: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      await taskApi.create(boardId, cardId, {
        title,
        description,
        priority,
        status: defaultStatus,
        deadline: deadline || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-hover w-full max-w-md p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Add Task</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="Task title..."
              autoFocus
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input resize-none h-20"
              placeholder="Optional description..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className="input"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="label">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="input"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={!title.trim() || loading} className="btn-primary flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Task'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ──────────────────────────────────────
// Invite Modal
// ──────────────────────────────────────
function InviteModal({ boardId, onClose }: { boardId: string; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await invitationApi.invite(boardId, email);
      setMsg(`Invitation sent to ${email}!`);
      setEmail('');
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMsg(m ?? 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-hover w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Invite Member</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {msg && (
          <p className={cn('text-sm mb-3 p-3 rounded-lg', msg.includes('sent') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
            {msg}
          </p>
        )}

        <form onSubmit={handleInvite} className="space-y-3">
          <div>
            <label className="label">Member email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="colleague@example.com"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={!email || loading} className="btn-primary flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Invite'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ──────────────────────────────────────
// Main Page
// ──────────────────────────────────────
function BoardDetailPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [addTaskModal, setAddTaskModal] = useState<{ cardId: string; status: TaskStatus } | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Fetch board
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

  // Fetch all tasks (from all cards)
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

  // Sync fetched tasks to local state
  useEffect(() => {
    setTasks(fetchedTasks);
  }, [fetchedTasks]);

  // Socket.IO — join board room and listen for real-time updates
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

  // Mutation: move task
  const moveTask = useMutation({
    mutationFn: ({ taskId, cardId, status }: { taskId: string; cardId: string; status: TaskStatus }) =>
      taskApi.update(boardId!, cardId, taskId, { status }),
    onMutate: ({ taskId, status }) => {
      // Optimistic update
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status } : t));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', boardId] });
    },
  });

  // Mutation: delete task
  const deleteTask = useMutation({
    mutationFn: ({ taskId, cardId }: { taskId: string; cardId: string }) =>
      taskApi.delete(boardId!, cardId, taskId),
    onMutate: ({ taskId }) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', boardId] });
    },
  });

  const handleDrop = useCallback((taskId: string, fromCardId: string, toStatus: TaskStatus) => {
    moveTask.mutate({ taskId, cardId: fromCardId, status: toStatus });
  }, [moveTask]);

  const handleDeleteTask = useCallback((taskId: string, cardId: string) => {
    deleteTask.mutate({ taskId, cardId });
  }, [deleteTask]);

  const handleAddTask = useCallback((cardId: string, status: TaskStatus) => {
    setAddTaskModal({ cardId, status });
  }, []);

  if (boardLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!board) return null;

  const isOwner = board.ownerId === user?.id;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="animate-fade-in flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/boards')} className="btn-ghost p-2 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                <span className="gradient-text">{board.name}</span>
              </h1>
              {board.description && (
                <p className="text-sm text-slate-500 mt-0.5">{board.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-500">
              <Users className="w-3.5 h-3.5" />
              <span>{board.members.length} members</span>
            </div>
            {isOwner && (
              <button onClick={() => setShowInvite(true)} className="btn-primary text-sm py-2">
                <UserPlus className="w-4 h-4" /> Invite
              </button>
            )}
          </div>
        </div>

        {/* Kanban board */}
        {tasksLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-6 flex-1">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={tasks.filter((t) => t.status === col.id)}
                cards={cards}
                boardId={boardId!}
                onDrop={handleDrop}
                onDeleteTask={handleDeleteTask}
                onAddTask={handleAddTask}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {addTaskModal && (
        <AddTaskModal
          cardId={addTaskModal.cardId}
          boardId={boardId!}
          defaultStatus={addTaskModal.status}
          onClose={() => setAddTaskModal(null)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['tasks', boardId] })}
        />
      )}
      {showInvite && (
        <InviteModal boardId={boardId!} onClose={() => setShowInvite(false)} />
      )}
    </DndProvider>
  );
}

export default BoardDetailPage;
