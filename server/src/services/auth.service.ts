import { userRepository } from '../repositories/user.repository';
import { verificationCodeRepository } from '../repositories/verificationCode.repository';
import { emailService } from './email.service';
import { generateOTP } from '../utils/otp';
import { signToken } from '../utils/jwt';
import { AppError } from '../middleware/error.middleware';
import { User } from '../models';

export const authService = {
  /**
   * Step 1 of auth: Generate and send OTP to email
   */
  async sendVerificationCode(email: string): Promise<void> {
    const code = generateOTP();
    await verificationCodeRepository.create({
      email,
      code,
      expiresAt: new Date(Date.now() + 600000).toISOString() as any,
      used: false,
    });
    await emailService.sendVerificationCode(email, code);
  },

  /**
   * Step 2 of signup: Verify OTP and create user account
   */
  async signUp(email: string, verificationCode: string): Promise<User> {
    const record = await verificationCodeRepository.findValid(email, verificationCode);
    if (!record) {
      throw new AppError('Invalid or expired verification code', 400);
    }

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    await verificationCodeRepository.markUsed(record.id);

    const displayName = email.split('@')[0];
    const user = await userRepository.create({
      email,
      displayName,
      avatar: `https://api.dicebear.com/8.x/initials/svg?seed=${displayName}`,
    });

    return user;
  },

  /**
   * Step 2 of signin: Verify OTP and return JWT
   */
  async signIn(email: string, verificationCode: string): Promise<{ accessToken: string; user: User }> {
    const record = await verificationCodeRepository.findValid(email, verificationCode);
    if (!record) {
      throw new AppError('Invalid or expired verification code', 400);
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('User not found. Please sign up first.', 404);
    }

    await verificationCodeRepository.markUsed(record.id);

    const accessToken = signToken({ userId: user.id, email: user.email });

    return { accessToken, user };
  },

  async getMe(userId: string): Promise<User> {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    return user;
  },
};
