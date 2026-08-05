import { Server as SocketServer } from 'socket.io';
import { verifyToken } from '../utils/jwt';

/**
 * Setup Socket.IO event handlers
 *
 * Rooms:
 *  - board:<boardId>  — all members of a board
 *  - user:<userId>    — personal notifications (invitations, etc.)
 */
export const setupSocket = (io: SocketServer): void => {
  // Authenticate socket connections via JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.userId;
      socket.data.email = payload.email;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket.data as { userId: string };
    console.log(`[Socket] User connected: ${userId} (${socket.id})`);

    // Join personal notification room
    socket.join(`user:${userId}`);

    // Join board room when user opens a board
    socket.on('board:join', (boardId: string) => {
      socket.join(`board:${boardId}`);
      console.log(`[Socket] ${userId} joined board:${boardId}`);
    });

    // Leave board room
    socket.on('board:leave', (boardId: string) => {
      socket.leave(`board:${boardId}`);
      console.log(`[Socket] ${userId} left board:${boardId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${userId}`);
    });
  });
};
