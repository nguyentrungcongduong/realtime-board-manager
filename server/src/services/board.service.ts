import { boardRepository } from '../repositories/board.repository';
import { AppError } from '../middleware/error.middleware';
import { Board } from '../models';

export const boardService = {
  async getBoards(userId: string): Promise<Board[]> {
    return boardRepository.findByMember(userId);
  },

  async getBoardById(boardId: string, userId: string): Promise<Board> {
    const board = await boardRepository.findById(boardId);
    if (!board) throw new AppError('Board not found', 404);
    if (!board.members.includes(userId)) {
      throw new AppError('You are not a member of this board', 403);
    }
    return board;
  },

  async getBoardPreview(boardId: string): Promise<{ id: string; name: string; description: string; membersCount: number }> {
    const board = await boardRepository.findById(boardId);
    if (!board) throw new AppError('Board not found', 404);
    return {
      id: board.id,
      name: board.name,
      description: board.description,
      membersCount: board.members.length,
    };
  },

  async joinBoard(boardId: string, userId: string): Promise<Board> {
    const board = await boardRepository.findById(boardId);
    if (!board) throw new AppError('Board not found', 404);

    if (!board.members.includes(userId)) {
      const updatedMembers = [...board.members, userId];
      await boardRepository.update(boardId, { members: updatedMembers });
      board.members = updatedMembers;
    }
    return board;
  },

  async createBoard(
    userId: string,
    data: { name: string; description: string }
  ): Promise<Board> {
    return boardRepository.create({
      name: data.name,
      description: data.description,
      ownerId: userId,
      members: [userId],
    });
  },

  async updateBoard(
    boardId: string,
    userId: string,
    data: { name?: string; description?: string }
  ): Promise<Board> {
    const board = await boardRepository.findById(boardId);
    if (!board) throw new AppError('Board not found', 404);
    if (board.ownerId !== userId) {
      throw new AppError('Only the board owner can update the board', 403);
    }

    await boardRepository.update(boardId, data);
    const updated = await boardRepository.findById(boardId);
    return updated!;
  },

  async deleteBoard(boardId: string, userId: string): Promise<void> {
    const board = await boardRepository.findById(boardId);
    if (!board) throw new AppError('Board not found', 404);
    if (board.ownerId !== userId) {
      throw new AppError('Only the board owner can delete the board', 403);
    }
    await boardRepository.delete(boardId);
  },
};
