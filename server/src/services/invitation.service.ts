import { invitationRepository } from '../repositories/invitation.repository';
import { boardRepository } from '../repositories/board.repository';
import { userRepository } from '../repositories/user.repository';
import { emailService } from './email.service';
import { AppError } from '../middleware/error.middleware';
import { Invitation } from '../models';
import { Server as SocketServer } from 'socket.io';

export const createInvitationService = (io?: SocketServer) => ({
  async inviteMember(
    boardId: string,
    ownerId: string,
    memberEmail: string
  ): Promise<Invitation> {
    const board = await boardRepository.findById(boardId);
    if (!board) throw new AppError('Board not found', 404);
    if (board.ownerId !== ownerId) {
      throw new AppError('Only the board owner can invite members', 403);
    }

    const member = await userRepository.findByEmail(memberEmail);
    if (!member) throw new AppError('User with this email not found', 404);
    if (member.id === ownerId) throw new AppError('Cannot invite yourself', 400);
    if (board.members.includes(member.id)) {
      throw new AppError('User is already a member', 409);
    }

    const existing = await invitationRepository.findExisting(boardId, member.id);
    if (existing) throw new AppError('Invitation already sent', 409);

    const invitation = await invitationRepository.create({
      boardId,
      ownerId,
      memberId: member.id,
      memberEmail,
      status: 'pending',
    });

    // Notify via Socket.IO if member is online
    if (io) {
      io.to(`user:${member.id}`).emit('invitation:received', invitation);
    }

    // Send email notification
    const owner = await userRepository.findById(ownerId);
    await emailService.sendInvitationEmail(
      memberEmail,
      board.name,
      owner?.displayName ?? 'Someone'
    );

    return invitation;
  },

  async getMyInvitations(userId: string): Promise<Invitation[]> {
    return invitationRepository.findByMember(userId);
  },

  async respondToInvitation(
    invitationId: string,
    userId: string,
    status: 'accepted' | 'declined'
  ): Promise<void> {
    const invitation = await invitationRepository.findById(invitationId);
    if (!invitation) throw new AppError('Invitation not found', 404);
    if (invitation.memberId !== userId) throw new AppError('Access denied', 403);
    if (invitation.status !== 'pending') {
      throw new AppError('Invitation already responded to', 400);
    }

    await invitationRepository.updateStatus(invitationId, status);

    if (status === 'accepted') {
      const board = await boardRepository.findById(invitation.boardId);
      if (board && !board.members.includes(userId)) {
        await boardRepository.update(invitation.boardId, {
          members: [...board.members, userId],
        });
      }

      // Notify owner
      if (io) {
        io.to(`user:${invitation.ownerId}`).emit('invitation:accepted', {
          boardId: invitation.boardId,
          memberId: userId,
        });
      }
    }
  },
});
