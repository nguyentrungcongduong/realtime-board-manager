import { cardRepository } from '../repositories/card.repository';
import { boardRepository } from '../repositories/board.repository';
import { AppError } from '../middleware/error.middleware';
import { Card } from '../models';

export const cardService = {
  async getCards(boardId: string, userId: string): Promise<Card[]> {
    const board = await boardRepository.findById(boardId);
    if (!board) throw new AppError('Board not found', 404);
    if (!board.members.includes(userId)) {
      throw new AppError('Access denied', 403);
    }
    return cardRepository.findByBoard(boardId);
  },

  async getCardById(boardId: string, cardId: string, userId: string): Promise<Card> {
    const board = await boardRepository.findById(boardId);
    if (!board) throw new AppError('Board not found', 404);
    if (!board.members.includes(userId)) throw new AppError('Access denied', 403);

    const card = await cardRepository.findById(boardId, cardId);
    if (!card || card.boardId !== boardId) throw new AppError('Card not found', 404);
    return card;
  },

  async createCard(
    boardId: string,
    userId: string,
    data: { name: string; description: string }
  ): Promise<Card> {
    const board = await boardRepository.findById(boardId);
    if (!board) throw new AppError('Board not found', 404);
    if (!board.members.includes(userId)) throw new AppError('Access denied', 403);

    return cardRepository.create({
      boardId,
      name: data.name,
      description: data.description,
      createdBy: userId,
    });
  },

  async updateCard(
    boardId: string,
    cardId: string,
    userId: string,
    data: { name?: string; description?: string }
  ): Promise<Card> {
    const board = await boardRepository.findById(boardId);
    if (!board) throw new AppError('Board not found', 404);
    if (!board.members.includes(userId)) throw new AppError('Access denied', 403);

    const card = await cardRepository.findById(boardId, cardId);
    if (!card || card.boardId !== boardId) throw new AppError('Card not found', 404);

    await cardRepository.update(boardId, cardId, data);
    const updated = await cardRepository.findById(boardId, cardId);
    return updated!;
  },

  async deleteCard(boardId: string, cardId: string, userId: string): Promise<void> {
    const board = await boardRepository.findById(boardId);
    if (!board) throw new AppError('Board not found', 404);
    if (board.ownerId !== userId) {
      throw new AppError('Only the board owner can delete cards', 403);
    }

    const card = await cardRepository.findById(boardId, cardId);
    if (!card || card.boardId !== boardId) throw new AppError('Card not found', 404);

    await cardRepository.delete(boardId, cardId);
  },
};
