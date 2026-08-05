// Shared TypeScript types for the client

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar: string;
  githubUsername?: string;
  createdAt: string;
}

export interface Board {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: string[];
  createdAt: string;
}

export interface Card {
  id: string;
  boardId: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

export type TaskStatus = 'icebox' | 'backlog' | 'ongoing' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface GitHubAttachment {
  id: string;
  type: 'pull_request' | 'commit' | 'issue';
  number?: number;
  sha?: string;
  title?: string;
  url?: string;
}

export interface Task {
  id: string;
  cardId: string;
  boardId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  assigneeId: string | null;
  githubAttachments: GitHubAttachment[];
  createdAt: string;
  updatedAt: string;
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined';

export interface Invitation {
  id: string;
  boardId: string;
  ownerId: string;
  memberId: string;
  memberEmail: string;
  status: InvitationStatus;
  createdAt: string;
}

export interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  private: boolean;
  updatedAt: string | null;
}

export interface RepositoryInfo {
  branches: { name: string; lastCommitSha: string }[];
  pulls: { number: number; title: string; url: string; state: string }[];
  issues: { number: number; title: string; url: string; state: string }[];
  commits: { sha: string; message: string; url: string }[];
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}
