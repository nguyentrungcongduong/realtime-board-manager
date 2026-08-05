import { Request, Response, NextFunction } from 'express';
import { githubService } from '../services/github.service';
import { sendSuccess } from '../utils/response';
import { param } from '../utils/param';
import { env } from '../config/env';

export const githubController = {
  async getOAuthUrl(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const url = githubService.getOAuthUrl();
      sendSuccess(res, { url });
    } catch (err) { next(err); }
  },

  async handleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = param(req.query.code as string | string[]);
      await githubService.handleCallback(code, req.user!.userId);
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
