import { Request, Response, NextFunction } from 'express';
import { cardService } from '../services/card.service';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(''),
});
const updateSchema = createSchema.partial();

export const cardController = {
  async getCards(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cards = await cardService.getCards(req.params.boardId, req.user!.userId);
      sendSuccess(res, cards);
    } catch (err) { next(err); }
  },

  async getCardById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const card = await cardService.getCardById(req.params.boardId, req.params.cardId, req.user!.userId);
      sendSuccess(res, card);
    } catch (err) { next(err); }
  },

  async createCard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createSchema.parse(req.body);
      const card = await cardService.createCard(req.params.boardId, req.user!.userId, data);
      sendCreated(res, card);
    } catch (err) { next(err); }
  },

  async updateCard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = updateSchema.parse(req.body);
      const card = await cardService.updateCard(req.params.boardId, req.params.cardId, req.user!.userId, data);
      sendSuccess(res, card);
    } catch (err) { next(err); }
  },

  async deleteCard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await cardService.deleteCard(req.params.boardId, req.params.cardId, req.user!.userId);
      sendNoContent(res);
    } catch (err) { next(err); }
  },
};
