import { Request, Response, NextFunction } from 'express';
import { createInvitationService } from '../services/invitation.service';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';
import { Server as SocketServer } from 'socket.io';
import { z } from 'zod';

const inviteSchema = z.object({ memberEmail: z.string().email() });
const respondSchema = z.object({ status: z.enum(['accepted', 'declined']) });

export const createInvitationController = (io?: SocketServer) => {
  const invitationService = createInvitationService(io);

  return {
    async invite(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const { memberEmail } = inviteSchema.parse(req.body);
        const invitation = await invitationService.inviteMember(req.params.boardId, req.user!.userId, memberEmail);
        sendCreated(res, invitation);
      } catch (err) { next(err); }
    },

    async getMyInvitations(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const invitations = await invitationService.getMyInvitations(req.user!.userId);
        sendSuccess(res, invitations);
      } catch (err) { next(err); }
    },

    async respond(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const { status } = respondSchema.parse(req.body);
        await invitationService.respondToInvitation(req.params.invitationId, req.user!.userId, status);
        sendNoContent(res);
      } catch (err) { next(err); }
    },
  };
};
