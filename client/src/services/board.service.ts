import api from '@/api/axios';
import { Board, Card, Task, TaskStatus, TaskPriority, GitHubAttachment } from '@/types';

// ==================== BOARDS ====================
export const boardApi = {
  getAll: () =>
    api.get<{ data: Board[] }>('/boards'),

  getById: (boardId: string) =>
    api.get<{ data: Board }>(`/boards/${boardId}`),

  create: (data: { name: string; description: string }) =>
    api.post<{ data: Board }>('/boards', data),

  update: (boardId: string, data: { name?: string; description?: string }) =>
    api.put<{ data: Board }>(`/boards/${boardId}`, data),

  delete: (boardId: string) =>
    api.delete(`/boards/${boardId}`),
};

// ==================== CARDS ====================
export const cardApi = {
  getAll: (boardId: string) =>
    api.get<{ data: Card[] }>(`/boards/${boardId}/cards`),

  getById: (boardId: string, cardId: string) =>
    api.get<{ data: Card }>(`/boards/${boardId}/cards/${cardId}`),

  create: (boardId: string, data: { name: string; description: string }) =>
    api.post<{ data: Card }>(`/boards/${boardId}/cards`, data),

  update: (boardId: string, cardId: string, data: { name?: string; description?: string }) =>
    api.put<{ data: Card }>(`/boards/${boardId}/cards/${cardId}`, data),

  delete: (boardId: string, cardId: string) =>
    api.delete(`/boards/${boardId}/cards/${cardId}`),
};

// ==================== TASKS ====================
export const taskApi = {
  getAll: (boardId: string, cardId: string) =>
    api.get<{ data: Task[] }>(`/boards/${boardId}/cards/${cardId}/tasks`),

  getById: (boardId: string, cardId: string, taskId: string) =>
    api.get<{ data: Task }>(`/boards/${boardId}/cards/${cardId}/tasks/${taskId}`),

  create: (
    boardId: string,
    cardId: string,
    data: {
      title: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      deadline?: string;
      assigneeId?: string;
    }
  ) =>
    api.post<{ data: Task }>(`/boards/${boardId}/cards/${cardId}/tasks`, data),

  update: (
    boardId: string,
    cardId: string,
    taskId: string,
    data: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      deadline: string | null;
      assigneeId: string | null;
      cardId: string;
    }>
  ) =>
    api.put<{ data: Task }>(`/boards/${boardId}/cards/${cardId}/tasks/${taskId}`, data),

  delete: (boardId: string, cardId: string, taskId: string) =>
    api.delete(`/boards/${boardId}/cards/${cardId}/tasks/${taskId}`),

  attachGitHub: (
    boardId: string,
    cardId: string,
    taskId: string,
    attachment: Omit<GitHubAttachment, 'id'>
  ) =>
    api.post<{ data: Task }>(`/boards/${boardId}/cards/${cardId}/tasks/${taskId}/github-attach`, attachment),

  removeAttachment: (boardId: string, cardId: string, taskId: string, attachmentId: string) =>
    api.delete<{ data: Task }>(`/boards/${boardId}/cards/${cardId}/tasks/${taskId}/github-attachments/${attachmentId}`),
};
