import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { sendSuccess } from '../utils/response';
import { param } from '../utils/param';
import { z } from 'zod';

const updateSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  avatar: z.string().url().optional(),
});

export const userController = {
  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getUserById(param(req.params.id));
      sendSuccess(res, user);
    } catch (err) { next(err); }
  },

  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = updateSchema.parse(req.body);
      const user = await userService.updateUser(param(req.params.id), req.user!.userId, data);
      sendSuccess(res, user);
    } catch (err) { next(err); }
  },
};
