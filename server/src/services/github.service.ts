import { Octokit } from '@octokit/rest';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../middleware/error.middleware';
import { env } from '../config/env';

const getOctokit = async (userId: string): Promise<Octokit> => {
  const user = await userRepository.findById(userId);
  if (!user?.githubToken) {
    throw new AppError('GitHub account not connected. Please sign in with GitHub.', 401);
  }
  return new Octokit({ auth: user.githubToken });
};

export const githubService = {
  getOAuthUrl(userId?: string): string {
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: env.GITHUB_CALLBACK_URL,
      scope: 'read:user user:email repo',
      state: userId || '',
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  },

  async handleCallback(code: string, userId: string): Promise<void> {
    // Exchange code for access token
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const data = (await response.json()) as { access_token?: string; error?: string };

    if (!data.access_token) {
      throw new AppError('Failed to exchange GitHub code for token', 400);
    }

    // Get GitHub user info
    const octokit = new Octokit({ auth: data.access_token });
    const { data: githubUser } = await octokit.users.getAuthenticated();

    await userRepository.update(userId, {
      githubToken: data.access_token,
      githubUsername: githubUser.login,
      avatar: githubUser.avatar_url,
    });
  },

  async getRepositories(userId: string) {
    const octokit = await getOctokit(userId);
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 50,
    });
    return data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      private: repo.private,
      updatedAt: repo.updated_at,
    }));
  },

  async getRepositoryInfo(userId: string, owner: string, repo: string) {
    const octokit = await getOctokit(userId);

    const [branchesRes, pullsRes, issuesRes, commitsRes] = await Promise.all([
      octokit.repos.listBranches({ owner, repo, per_page: 30 }),
      octokit.pulls.list({ owner, repo, state: 'open', per_page: 30 }),
      octokit.issues.listForRepo({ owner, repo, state: 'open', per_page: 30 }),
      octokit.repos.listCommits({ owner, repo, per_page: 30 }),
    ]);

    return {
      branches: branchesRes.data.map((b) => ({
        name: b.name,
        lastCommitSha: b.commit.sha,
      })),
      pulls: pullsRes.data.map((p) => ({
        number: p.number,
        title: p.title,
        url: p.html_url,
        state: p.state,
      })),
      issues: issuesRes.data
        .filter((i) => !i.pull_request)
        .map((i) => ({
          number: i.number,
          title: i.title,
          url: i.html_url,
          state: i.state,
        })),
      commits: commitsRes.data.map((c) => ({
        sha: c.sha,
        message: c.commit.message,
        url: c.html_url,
      })),
    };
  },
};
