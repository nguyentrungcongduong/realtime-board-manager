import { Router } from 'express';
import { Server as SocketServer } from 'socket.io';
import authRoutes from './auth.routes';
import boardRoutes from './board.routes';
import cardRoutes from './card.routes';
import githubRoutes from './github.routes';
import userRoutes from './user.routes';
import { createTaskRouter } from './task.routes';
import { createInvitationRouter, createBoardInviteRouter } from './invitation.routes';

export const createRouter = (io?: SocketServer): Router => {
  const router = Router();

  // Auth
  router.use('/auth', authRoutes);

  // Boards
  router.use('/boards', boardRoutes);

  // Cards (nested under boards)
  router.use('/boards/:boardId/cards', cardRoutes);

  // Tasks (nested under boards/cards)
  router.use('/boards/:boardId/cards/:cardId/tasks', createTaskRouter(io));

  // Board invite (nested under boards)
  router.use('/boards/:boardId/invite', createBoardInviteRouter(io));

  // Invitations (top-level for current user)
  router.use('/invitations', createInvitationRouter(io));

  // GitHub
  router.use('/github', githubRoutes);

  // Users
  router.use('/users', userRoutes);

  // Health check
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return router;
};
