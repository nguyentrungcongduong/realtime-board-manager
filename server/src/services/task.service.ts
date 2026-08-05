import { taskRepository } from '../repositories/task.repository';
import { cardRepository } from '../repositories/card.repository';
import { boardRepository } from '../repositories/board.repository';
import { AppError } from '../middleware/error.middleware';
import { Task, TaskStatus, TaskPriority, GitHubAttachment } from '../models';
import { Server as SocketServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

export const createTaskService = (io?: SocketServer) => ({
  async getTasks(boardId: string, cardId: string, userId: string): Promise<Task[]> {
    const board = await boardRepository.findById(boardId);
    if (!board) throw new AppError('Board not found', 404);
    if (!board.members.includes(userId)) throw new AppError('Access denied', 403);

    const card = await cardRepository.findById(boardId, cardId);
    if (!card || card.boardId !== boardId) throw new AppError('Card not found', 404);

    return taskRepository.findByCard(boardId, cardId);
  },

  async getTaskById(boardId: string, cardId: string, taskId: string, userId: string): Promise<Task> {
    const board = await boardRepository.findById(boardId);
    if (!board) throw new AppError('Board not found', 404);
    if (!board.members.includes(userId)) throw new AppError('Access denied', 403);

    const task = await taskRepository.findById(boardId, cardId, taskId);
    if (!task || task.cardId !== cardId) throw new AppError('Task not found', 404);
    return task;
  },

  async createTask(
    boardId: string,
    cardId: string,
    userId: string,
    data: {
      title: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      deadline?: string;
      assigneeId?: string;
    }
  ): Promise<Task> {
    const board = await boardRepository.findById(boardId);
    if (!board) throw new AppError('Board not found', 404);
    if (!board.members.includes(userId)) throw new AppError('Access denied', 403);

    const card = await cardRepository.findById(boardId, cardId);
    if (!card || card.boardId !== boardId) throw new AppError('Card not found', 404);

    const task = await taskRepository.create({
      cardId,
      boardId,
      title: data.title,
      description: data.description ?? '',
      status: data.status ?? 'backlog',
      priority: data.priority ?? 'medium',
      deadline: data.deadline ?? null,
      assigneeId: data.assigneeId ?? null,
      githubAttachments: [],
    });

    // Broadcast to all members in this board room
    if (io) {
      const allTasks = await taskRepository.findByBoard(boardId);
      io.to(`board:${boardId}`).emit('board:updated', { boardId, tasks: allTasks });
    }

    return task;
  },

  async updateTask(
    boardId: string,
    cardId: string,
    taskId: string,
    userId: string,
    data: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      deadline: string | null;
      assigneeId: string | null;
      cardId: string;
    }>
  ): Promise<Task> {
    const board = await boardRepository.findById(boardId);
    if (!board) throw new AppError('Board not found', 404);
    if (!board.members.includes(userId)) throw new AppError('Access denied', 403);

    const task = await taskRepository.findById(boardId, cardId, taskId);
    if (!task || task.cardId !== cardId) throw new AppError('Task not found', 404);

    await taskRepository.update(boardId, cardId, taskId, data);
    const updated = await taskRepository.findById(boardId, cardId, taskId);

    // Broadcast
    if (io) {
      const allTasks = await taskRepository.findByBoard(boardId);
      io.to(`board:${boardId}`).emit('board:updated', { boardId, tasks: allTasks });
    }

    return updated!;
  },

  async deleteTask(
    boardId: string,
    cardId: string,
    taskId: string,
    userId: string
  ): Promise<void> {
    const board = await boardRepository.findById(boardId);
    if (!board) throw new AppError('Board not found', 404);
    if (!board.members.includes(userId)) throw new AppError('Access denied', 403);

    const task = await taskRepository.findById(boardId, cardId, taskId);
    if (!task || task.cardId !== cardId) throw new AppError('Task not found', 404);

    await taskRepository.delete(boardId, cardId, taskId);

    // Broadcast
    if (io) {
      const allTasks = await taskRepository.findByBoard(boardId);
      io.to(`board:${boardId}`).emit('board:updated', { boardId, tasks: allTasks });
    }
  },

  async attachGitHub(
    boardId: string,
    cardId: string,
    taskId: string,
    userId: string,
    attachment: Omit<GitHubAttachment, 'id'>
  ): Promise<Task> {
    const board = await boardRepository.findById(boardId);
    if (!board) throw new AppError('Board not found', 404);
    if (!board.members.includes(userId)) throw new AppError('Access denied', 403);

    const task = await taskRepository.findById(boardId, cardId, taskId);
    if (!task || task.cardId !== cardId) throw new AppError('Task not found', 404);

    const newAttachment: GitHubAttachment = { id: uuidv4(), ...attachment };
    await taskRepository.update(boardId, cardId, taskId, {
      githubAttachments: [...task.githubAttachments, newAttachment],
    });
    const updated = await taskRepository.findById(boardId, cardId, taskId);

    return updated!;
  },

  async removeGitHubAttachment(
    boardId: string,
    cardId: string,
    taskId: string,
    attachmentId: string,
    userId: string
  ): Promise<Task> {
    const board = await boardRepository.findById(boardId);
    if (!board) throw new AppError('Board not found', 404);
    if (!board.members.includes(userId)) throw new AppError('Access denied', 403);

    const task = await taskRepository.findById(boardId, cardId, taskId);
    if (!task || task.cardId !== cardId) throw new AppError('Task not found', 404);

    await taskRepository.update(boardId, cardId, taskId, {
      githubAttachments: task.githubAttachments.filter((a) => a.id !== attachmentId),
    });
    const updated = await taskRepository.findById(boardId, cardId, taskId);

    return updated!;
  },
});
