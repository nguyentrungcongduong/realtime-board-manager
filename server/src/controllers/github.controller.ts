import { Request, Response, NextFunction } from 'express';
import { githubService } from '../services/github.service';
import { sendSuccess } from '../utils/response';
import { param } from '../utils/param';
import { env } from '../config/env';

export const githubController = {
  async getOAuthUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const url = githubService.getOAuthUrl(req.user?.userId);
      sendSuccess(res, { url });
    } catch (err) { next(err); }
  },

  async handleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = param(req.query.code as string | string[]);
      const userId = param(req.query.state as string | string[]) || req.user?.userId || 'dev_user';
      await githubService.handleCallback(code, userId);
      res.redirect(`${env.CLIENT_URL}/github/connected`);
    } catch (err) { next(err); }
  },

  async getRepositories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const repos = await githubService.getRepositories(req.user!.userId);
      sendSuccess(res, repos);
    } catch (err) { next(err); }
  },

  async getRepositoryInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const owner = param(req.params.owner);
      const repo = param(req.params.repo);
      const info = await githubService.getRepositoryInfo(req.user!.userId, owner, repo);
      sendSuccess(res, info);
    } catch (err) { next(err); }
  },
};
