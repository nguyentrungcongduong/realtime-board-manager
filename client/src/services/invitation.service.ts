import api from '@/api/axios';
import { Invitation } from '@/types';

export const invitationApi = {
  invite: (boardId: string, memberEmail: string) =>
    api.post<{ data: Invitation }>(`/boards/${boardId}/invite`, { memberEmail }),

  getMyInvitations: () =>
    api.get<{ data: Invitation[] }>('/invitations'),

  respond: (invitationId: string, status: 'accepted' | 'declined') =>
    api.post(`/invitations/${invitationId}/respond`, { status }),
};

export const githubApi = {
  getOAuthUrl: () =>
    api.get<{ data: { url: string } }>('/github/oauth/url'),

  getRepositories: () =>
    api.get<{ data: unknown[] }>('/github/repositories'),

  getRepositoryInfo: (owner: string, repo: string) =>
    api.get<{ data: unknown }>(`/github/repositories/${owner}/${repo}`),
};
