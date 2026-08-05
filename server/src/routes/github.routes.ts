import { Router } from 'express';
import { githubController } from '../controllers/github.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// GET /api/github/oauth/url — Get GitHub OAuth URL
router.get('/oauth/url', authMiddleware, githubController.getOAuthUrl);

// GET /api/github/callback — OAuth callback redirect from GitHub (public, uses state param for userId)
router.get('/callback', githubController.handleCallback);

// GET /api/github/repositories — List user's repositories
router.get('/repositories', authMiddleware, githubController.getRepositories);

// GET /api/github/repositories/:owner/:repo — Full repo info
router.get('/repositories/:owner/:repo', authMiddleware, githubController.getRepositoryInfo);

export default router;
