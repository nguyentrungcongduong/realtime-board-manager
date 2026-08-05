import { Router } from 'express';
import { createInvitationController } from '../controllers/invitation.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { Server as SocketServer } from 'socket.io';

export const createInvitationRouter = (io?: SocketServer) => {
  const router = Router({ mergeParams: true });
  const invitationController = createInvitationController(io);

  router.use(authMiddleware);

  // GET  /api/invitations        — My pending invitations
  // POST /api/boards/:boardId/invite  — Invite a member (nested under boards)
  router.get('/', invitationController.getMyInvitations);
  router.post('/:invitationId/respond', invitationController.respond);

  return router;
};

export const createBoardInviteRouter = (io?: SocketServer) => {
  const router = Router({ mergeParams: true });
  const invitationController = createInvitationController(io);

  router.use(authMiddleware);
  router.post('/', invitationController.invite);

  return router;
};
