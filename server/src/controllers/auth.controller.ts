import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { z } from 'zod';

const emailSchema = z.object({ email: z.string().email() });
const verifySchema = z.object({
  email: z.string().email(),
  verificationCode: z.string().length(6),
});

export const authController = {
  async sendCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = emailSchema.parse(req.body);
      await authService.sendVerificationCode(email);
      sendSuccess(res, { message: 'Verification code sent to your email' });
    } catch (err) {
      next(err);
    }
  },

  async signUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, verificationCode } = verifySchema.parse(req.body);
      const user = await authService.signUp(email, verificationCode);
      sendCreated(res, user);
    } catch (err) {
      next(err);
    }
  },

  async signIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, verificationCode } = verifySchema.parse(req.body);
      const result = await authService.signIn(email, verificationCode);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getMe(req.user!.userId);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  },
};
