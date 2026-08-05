import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// POST /api/auth/send-code  — Send OTP to email
router.post('/send-code', authController.sendCode);

// POST /api/auth/signup  — Register with OTP
router.post('/signup', authController.signUp);

// POST /api/auth/signin  — Login with OTP
router.post('/signin', authController.signIn);

// GET /api/auth/me  — Get current user (protected)
router.get('/me', authMiddleware, authController.getMe);

export default router;
