import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { boardApi, cardApi, taskApi } from '@/services/board.service';
import { invitationApi } from '@/services/invitation.service';
import { joinBoard, leaveBoard, getSocket } from '@/socket/socket';
import { Task, Card, TaskStatus, Board, TaskPriority } from '@/types';
import { cn, formatDate, isOverdue } from '@/utils';
import {
  Plus, Loader2, UserPlus, X, User,
  Eye, AlignLeft, List, Archive, Github,
  Copy, Link as LinkIcon, ExternalLink, GitPullRequest, GitCommit, AlertCircle,
  Trash2, Calendar, Filter, Flag, FolderPlus
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

  const priorityColor = {
    low: 'bg-slate-700 text-slate-300',
    medium: 'bg-amber-950/80 text-amber-300 border border-amber-800/60',
    high: 'bg-red-950/80 text-red-300 border border-red-800/60',
  }[task.priority || 'medium'];

  return (
    <div
      ref={drag as unknown as React.Ref<HTMLDivElement>}
      onClick={onClick}
      className={cn(
        'bg-[#22272B] hover:bg-[#2C333A] text-slate-200 border border-slate-700/60 rounded-md p-2.5 text-xs font-medium cursor-grab active:cursor-grabbing transition-all select-none shadow-sm space-y-2',
        isDragging && 'opacity-30'
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="line-clamp-2 leading-snug">{task.title}</p>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap text-[10px]">
        {/* Priority Badge */}
        <span className={cn('px-1.5 py-0.5 rounded font-bold uppercase tracking-wider', priorityColor)}>
          {task.priority || 'MED'}
        </span>

        {/* Deadline Badge */}
        {task.deadline && (
          <span className={cn(
            'flex items-center gap-1 font-semibold',
            isOverdue(task.deadline) ? 'text-red-400' : 'text-slate-400'
          )}>
            <Calendar className="w-3 h-3" />
            {formatDate(task.deadline)}
          </span>
        )}
      </div>

      {/* GitHub Attachments */}
      {task.githubAttachments.length > 0 && (
        <div className="flex gap-1 pt-1 flex-wrap">
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
  card: Card;
  tasks: Task[];
  onDrop: (taskId: string, fromCardId: string, toCardId: string) => void;
  onOpenCreateModal: (cardId: string, status: TaskStatus) => void;
  onTaskClick: (task: Task) => void;
  onDeleteCard: (cardId: string) => void;
}

function KanbanColumn({ card, tasks, onDrop, onOpenCreateModal, onTaskClick, onDeleteCard }: KanbanColumnProps) {
  const [{ isOver }, drop] = useDrop({
    accept: DND_TYPE,
    drop: (item: { taskId: string; cardId: string; status: TaskStatus }) => {
      if (item.cardId !== card.id) {
        onDrop(item.taskId, item.cardId, card.id);
      }
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
    <div
      ref={drop as unknown as React.Ref<HTMLDivElement>}
      className={cn(
        'bg-[#101214] text-slate-300 rounded-xl p-3 min-w-[270px] w-[270px] flex flex-col gap-2 shrink-0 border border-slate-800/80 transition-all group',
        isOver && 'ring-2 ring-blue-500/80 bg-[#161a1d]'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-1 py-0.5">
        <h4 className="font-bold text-xs text-slate-200">{card.name}</h4>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDeleteCard(card.id)}
            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 transition-all rounded hover:bg-slate-800"
            title="Delete list"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] text-slate-500 font-semibold">...</span>
        </div>
      </div>

      {/* List of Tasks */}
      <div className="flex flex-col gap-2 min-h-[50px]">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
      </div>

      {/* "+ Add a card" Button matching Figma */}
      <button
        onClick={() => onOpenCreateModal(card.id, 'ongoing')}
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1.5 rounded hover:bg-slate-800/60 transition-colors mt-1"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add a card</span>
      </button>
    </div>
  );
}

// ──────────────────────────────────────
// Create List (Card container) Modal
// ──────────────────────────────────────
interface CreateListModalProps {
  boardId: string;
  onClose: () => void;
  onCreated: () => void;
}

function CreateListModal({ boardId, onClose, onCreated }: CreateListModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await cardApi.create(boardId, { name, description });
      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#282E33] border border-slate-700 text-slate-200 rounded-xl w-full max-w-sm p-6 space-y-4 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <FolderPlus className="w-4 h-4 text-purple-400" /> Add Another List
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">List Title *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Backlog / In Review"
              className="w-full bg-[#1D2125] border border-slate-700 px-3 py-2 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="List category..."
              className="w-full bg-[#1D2125] border border-slate-700 px-3 py-2 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded text-slate-400 hover:text-white">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ──────────────────────────────────────
// Create Task Modal with Priority & Deadline Selection
// ──────────────────────────────────────
interface CreateTaskModalProps {
  boardId: string;
  cardId: string;
  status: TaskStatus;
  onClose: () => void;
  onCreated: () => void;
}

function CreateTaskModal({ boardId, cardId, status, onClose, onCreated }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
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
        status,
        priority,
        deadline: deadline || undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#282E33] border border-slate-700 text-slate-200 rounded-xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-400" /> Create New Card
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Card Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Design landing page hero"
              className="w-full bg-[#1D2125] border border-slate-700 px-3 py-2 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-amber-400" /> Priority Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  className={cn(
                    'py-2 px-3 rounded font-bold uppercase tracking-wider border transition-all text-[11px]',
                    priority === p
                      ? p === 'high'
                        ? 'bg-red-950 text-red-300 border-red-600'
                        : p === 'medium'
                        ? 'bg-amber-950 text-amber-300 border-amber-600'
                        : 'bg-slate-700 text-slate-200 border-slate-500'
                      : 'bg-[#1D2125] border-slate-800 text-slate-400 hover:text-slate-200'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" /> Due Date (Optional)
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-[#1D2125] border border-slate-700 px-3 py-2 rounded text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              className="w-full bg-[#1D2125] border border-slate-700 p-2.5 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none h-16"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded text-slate-400 hover:text-white">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || loading}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ──────────────────────────────────────
// Task Detail Modal (Matching Figma Image 5)
// ──────────────────────────────────────
interface TaskDetailModalProps {
  task: Task;
  listName?: string;
  onClose: () => void;
  onUpdate: () => void;
}

function TaskDetailModal({ task, listName, onClose, onUpdate }: TaskDetailModalProps) {
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<TaskPriority>(task.priority || 'medium');
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<string[]>([]);
  const [showGithubMenu, setShowGithubMenu] = useState(false);
  const [githubInput, setGithubInput] = useState('');
  const [attachType, setAttachType] = useState<'pull_request' | 'commit' | 'issue'>('pull_request');
  const [saving, setSaving] = useState(false);

  const handleSaveDescription = async () => {
    setSaving(true);
    try {
      await taskApi.update(task.boardId, task.cardId, task.id, { description, priority });
      onUpdate();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handlePriorityChange = async (newPriority: TaskPriority) => {
    setPriority(newPriority);
    try {
      await taskApi.update(task.boardId, task.cardId, task.id, { priority: newPriority });
      onUpdate();
    } catch (err) { console.error(err); }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setComments((prev) => [...prev, comment]);
    setComment('');
  };

  const handleAttachGithub = async (presetValue?: { type: 'pull_request' | 'commit' | 'issue'; val: string | number }) => {
    const typeToUse = presetValue ? presetValue.type : attachType;
    const inputToUse = presetValue ? String(presetValue.val) : githubInput;
    if (!inputToUse.trim()) return;

    try {
      await taskApi.attachGitHub(task.boardId, task.cardId, task.id, {
        type: typeToUse,
        number: typeToUse !== 'commit' ? parseInt(inputToUse, 10) || 42 : undefined,
        sha: typeToUse === 'commit' ? inputToUse : undefined,
        title: `GitHub ${typeToUse} #${inputToUse}`,
        url: `https://github.com/nguyentrungcongduong/realtime-board-manager/${typeToUse === 'pull_request' ? 'pull' : typeToUse === 'issue' ? 'issues' : 'commit'}/${inputToUse}`
      });
      setShowGithubMenu(false);
      setGithubInput('');
      onUpdate();
    } catch (err) { console.error(err); }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    try {
      await taskApi.removeAttachment(task.boardId, task.cardId, task.id, attachmentId);
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

        {/* Modal Header matching Figma Image 5 */}
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            💳 {task.title}
          </h2>
          <p className="text-xs text-slate-400">
            in list <span className="underline font-semibold text-slate-200">{listName || 'To do'}</span>
          </p>
        </div>

        {/* Priority Selector & Members bar */}
        <div className="flex gap-6 items-center text-xs flex-wrap">
          <div>
            <p className="text-slate-400 font-semibold mb-1">Priority</p>
            <div className="flex items-center gap-1">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePriorityChange(p)}
                  className={cn(
                    'px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition-colors',
                    priority === p
                      ? p === 'high' ? 'bg-red-950 text-red-300 border-red-600' : p === 'medium' ? 'bg-amber-950 text-amber-300 border-amber-600' : 'bg-slate-700 text-slate-200 border-slate-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

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

        {/* Attached GitHub items list */}
        {task.githubAttachments.length > 0 && (
          <div className="space-y-2 text-xs">
            <p className="text-slate-400 font-bold flex items-center gap-1.5">
              <Github className="w-4 h-4 text-blue-400" /> GitHub Power-Up Attachments
            </p>
            <div className="space-y-1.5">
              {task.githubAttachments.map((att) => (
                <div key={att.id} className="p-2 bg-[#1D2125] border border-slate-700 rounded flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {att.type === 'pull_request' && <GitPullRequest className="w-3.5 h-3.5 text-purple-400" />}
                    {att.type === 'commit' && <GitCommit className="w-3.5 h-3.5 text-blue-400" />}
                    {att.type === 'issue' && <AlertCircle className="w-3.5 h-3.5 text-amber-400" />}
                    <span className="font-semibold text-slate-200">
                      {att.type.toUpperCase()}: #{att.number ?? att.sha?.slice(0, 7)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {att.url && (
                      <a href={att.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> Open
                      </a>
                    )}
                    <button onClick={() => handleRemoveAttachment(att.id)} className="text-slate-400 hover:text-red-400 p-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  <div className="mt-2 p-3 bg-[#1D2125] border border-slate-700 rounded-lg space-y-2.5">
                    <p className="text-[11px] text-slate-400 font-semibold">Attach GitHub Item</p>

                    {/* Presets */}
                    <div className="space-y-1">
                      <button
                        onClick={() => handleAttachGithub({ type: 'pull_request', val: 12 })}
                        className="w-full text-left px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] text-purple-300 flex items-center gap-1.5"
                      >
                        <GitPullRequest className="w-3 h-3" /> Quick PR #12
                      </button>
                      <button
                        onClick={() => handleAttachGithub({ type: 'issue', val: 42 })}
                        className="w-full text-left px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] text-amber-300 flex items-center gap-1.5"
                      >
                        <AlertCircle className="w-3 h-3" /> Quick Issue #42
                      </button>
                      <button
                        onClick={() => handleAttachGithub({ type: 'commit', val: '7f8a3b2' })}
                        className="w-full text-left px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] text-blue-300 flex items-center gap-1.5"
                      >
                        <GitCommit className="w-3 h-3" /> Quick Commit 7f8a3b2
                      </button>
                    </div>

                    <div className="border-t border-slate-700 pt-2 space-y-2">
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
                        placeholder={attachType === 'commit' ? 'Commit SHA (e.g. 7f8a3b)' : 'PR/Issue # (e.g. 42)'}
                        className="w-full bg-slate-800 border border-slate-700 p-1.5 rounded text-slate-200 text-xs"
                      />

                      <button
                        onClick={() => handleAttachGithub()}
                        className="w-full py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs"
                      >
                        Attach Custom Item
                      </button>
                    </div>
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
function BoardDetailPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [createModalInfo, setCreateModalInfo] = useState<{ cardId: string; status: TaskStatus } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority | 'all'>('all');
  const [tasks, setTasks] = useState<Task[]>([]);

  // Fetch board info
  const { data: board, isLoading: boardLoading, isError: boardError } = useQuery<Board>({
    queryKey: ['board', boardId],
    queryFn: async () => (await boardApi.getById(boardId!)).data.data,
    enabled: !!boardId,
    retry: false,
  });

  const joinMutation = useMutation({
    mutationFn: () => boardApi.join(boardId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
  });

  // Fetch cards (Lists)
  const { data: cards = [] } = useQuery<Card[]>({
    queryKey: ['cards', boardId],
    queryFn: async () => (await cardApi.getAll(boardId!)).data.data,
    enabled: !!boardId,
  });

  // Delete card list mutation
  const deleteCardMutation = useMutation({
    mutationFn: (cardId: string) => cardApi.delete(boardId!, cardId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards', boardId] }),
  });

  const resetDefaultListsMutation = useMutation({
    mutationFn: async () => {
      // Delete all existing cards
      await Promise.all(cards.map((c) => cardApi.delete(boardId!, c.id)));
      // Re-create default 3 cards
      await cardApi.create(boardId!, { name: 'To do', description: '' });
      await cardApi.create(boardId!, { name: 'Doing', description: '' });
      await cardApi.create(boardId!, { name: 'Done', description: '' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', boardId] });
    },
  });

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

  const fetchedTasksJson = JSON.stringify(fetchedTasks);
  useEffect(() => {
    setTasks(JSON.parse(fetchedTasksJson));
  }, [fetchedTasksJson]);

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

  // Move task across lists (cards)
  const moveTask = useMutation({
    mutationFn: ({ taskId, fromCardId, toCardId }: { taskId: string; fromCardId: string; toCardId: string }) =>
      taskApi.update(boardId!, fromCardId, taskId, { cardId: toCardId }),
    onMutate: ({ taskId, toCardId }) => {
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, cardId: toCardId } : t));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', boardId] }),
  });

  const handleDrop = useCallback((taskId: string, fromCardId: string, toCardId: string) => {
    moveTask.mutate({ taskId, fromCardId, toCardId });
  }, [moveTask]);

  const handleOpenCreateModal = useCallback((cardId: string, status: TaskStatus) => {
    setCreateModalInfo({ cardId, status });
  }, []);

  const handleDeleteCard = useCallback((cardId: string) => {
    if (confirm('Are you sure you want to delete this list?')) {
      deleteCardMutation.mutate(cardId);
    }
  }, [deleteCardMutation]);

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = selectedPriority === 'all' || (t.priority || 'medium') === selectedPriority;
    return matchesSearch && matchesPriority;
  });

  if (boardError || (!boardLoading && !board)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="bg-[#282E33] border border-slate-700 p-8 rounded-xl max-w-md w-full space-y-4 shadow-xl text-slate-200">
          <UserPlus className="w-10 h-10 text-blue-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Join Workspace</h2>
          <p className="text-xs text-slate-400">
            You are accessing a shared Workspace link. Click below to join and collaborate in real-time!
          </p>
          <button
            onClick={() => joinMutation.mutate()}
            disabled={joinMutation.isPending}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded transition-colors flex items-center justify-center gap-2"
          >
            {joinMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join Workspace'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="-m-6 flex flex-col h-[calc(100vh-3rem)]">
        {/* Magenta / Purple Board Bar matching Figma Image 4 */}
        <div className="bg-trello-boardbar px-4 py-2.5 flex items-center justify-between shrink-0 shadow-sm flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-sm text-white">{board?.name || 'Board'}</h1>

            {/* Real-time Task Search Bar */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cards..."
              className="bg-black/20 text-white placeholder-white/60 px-2.5 py-1 rounded text-xs border border-white/20 focus:outline-none focus:border-white/50 w-36"
            />

            {/* Priority Filter Pills */}
            <div className="hidden sm:flex items-center gap-1 bg-black/20 p-0.5 rounded border border-white/10 text-[10px]">
              <Filter className="w-3 h-3 text-white/60 ml-1" />
              {(['all', 'high', 'medium', 'low'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPriority(p)}
                  className={cn(
                    'px-2 py-0.5 rounded font-semibold uppercase transition-colors',
                    selectedPriority === p
                      ? 'bg-white text-trello-boardbar shadow-xs'
                      : 'text-white/70 hover:text-white'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm('Reset lists to default 3 lists (To do, Doing, Done)?')) {
                  resetDefaultListsMutation.mutate();
                }
              }}
              className="px-2.5 py-1 bg-black/20 hover:bg-black/30 text-white/80 hover:text-white rounded text-xs font-semibold transition-colors border border-white/20"
              title="Reset lists to default (To do, Doing, Done)"
            >
              Reset Lists
            </button>

            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-black/20 hover:bg-black/30 text-white rounded text-xs font-semibold transition-colors border border-white/20"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite member</span>
            </button>
          </div>
        </div>

        {/* Main Kanban Canvas - Dynamic Column Rendering */}
        <div className="flex-1 p-6 overflow-x-auto flex gap-4 items-start bg-trello-workspace">
          {tasksLoading || resetDefaultListsMutation.isPending ? (
            <div className="flex justify-center py-12 w-full">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : (
            <>
              {cards.map((card) => (
                <KanbanColumn
                  key={card.id}
                  card={card}
                  tasks={filteredTasks.filter((t) => t.cardId === card.id)}
                  onDrop={handleDrop}
                  onOpenCreateModal={handleOpenCreateModal}
                  onTaskClick={(t) => setSelectedTask(t)}
                  onDeleteCard={handleDeleteCard}
                />
              ))}

              {/* "+ Add another list" Button matching Figma Image 4 */}
              <button
                onClick={() => setShowCreateListModal(true)}
                className="bg-trello-boardbar/80 hover:bg-trello-boardbar text-white px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add another list
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateListModal && (
        <CreateListModal
          boardId={boardId!}
          onClose={() => setShowCreateListModal(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['cards', boardId] })}
        />
      )}

      {createModalInfo && (
        <CreateTaskModal
          boardId={boardId!}
          cardId={createModalInfo.cardId}
          status={createModalInfo.status}
          onClose={() => setCreateModalInfo(null)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['tasks', boardId] })}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          listName={cards.find((c) => c.id === selectedTask.cardId)?.name}
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
