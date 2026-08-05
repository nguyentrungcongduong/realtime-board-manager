// Models — TypeScript interfaces for all Firestore collections

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar: string;
  githubToken?: string;
  githubUsername?: string;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface Board {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: string[]; // array of user IDs
  createdAt: FirebaseFirestore.Timestamp;
}

export interface Card {
  id: string;
  boardId: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: FirebaseFirestore.Timestamp;
}

export type TaskStatus = 'icebox' | 'backlog' | 'ongoing' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

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
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export type GitHubAttachmentType = 'pull_request' | 'commit' | 'issue';

export interface GitHubAttachment {
  id: string;
  type: GitHubAttachmentType;
  number?: number;    // for PR and issue
  sha?: string;       // for commit
  title?: string;
  url?: string;
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined';

export interface Invitation {
  id: string;
  boardId: string;
  ownerId: string;
  memberId: string;
  memberEmail: string;
  status: InvitationStatus;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface VerificationCode {
  id: string;
  email: string;
  code: string;
  expiresAt: FirebaseFirestore.Timestamp;
  used: boolean;
}
