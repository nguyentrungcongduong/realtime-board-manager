import { Request, Response, NextFunction } from 'express';
import { boardService } from '../services/board.service';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(''),
});
const updateSchema = createSchema.partial();

export const boardController = {
  async getBoards(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const boards = await boardService.getBoards(req.user!.userId);
      sendSuccess(res, boards);
    } catch (err) { next(err); }
  },

  async getBoardById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const board = await boardService.getBoardById(req.params.boardId, req.user!.userId);
      sendSuccess(res, board);
    } catch (err) { next(err); }
  },

  async createBoard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createSchema.parse(req.body);
      const board = await boardService.createBoard(req.user!.userId, data);
      sendCreated(res, board);
    } catch (err) { next(err); }
  },

  async updateBoard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = updateSchema.parse(req.body);
      const board = await boardService.updateBoard(req.params.boardId, req.user!.userId, data);
      sendSuccess(res, board);
    } catch (err) { next(err); }
  },

  async deleteBoard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await boardService.deleteBoard(req.params.boardId, req.user!.userId);
      sendNoContent(res);
    } catch (err) { next(err); }
  },
};
