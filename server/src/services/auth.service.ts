import { userRepository } from '../repositories/user.repository';
import { verificationCodeRepository } from '../repositories/verificationCode.repository';
import { emailService } from './email.service';
import { generateOTP } from '../utils/otp';
import { signToken } from '../utils/jwt';
import { AppError } from '../middleware/error.middleware';
import { User } from '../models';

export const authService = {
  /**
   * Step 1: Generate and send OTP to email
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
   * Step 2: Verify OTP -> Get or create user -> Return JWT token + User
   */
  async verifyAndAuthenticate(email: string, verificationCode: string): Promise<{ accessToken: string; user: User }> {
    const record = await verificationCodeRepository.findValid(email, verificationCode);
    if (!record) {
      throw new AppError('Invalid or expired verification code', 400);
    }

    await verificationCodeRepository.markUsed(record.id);

    let user = await userRepository.findByEmail(email);
    if (!user) {
      const displayName = email.split('@')[0];
      user = await userRepository.create({
        email,
        displayName,
        avatar: `https://api.dicebear.com/8.x/initials/svg?seed=${displayName}`,
      });
    }

    const accessToken = signToken({ userId: user.id, email: user.email });
    return { accessToken, user };
  },

  async signUp(email: string, verificationCode: string): Promise<{ accessToken: string; user: User }> {
    return this.verifyAndAuthenticate(email, verificationCode);
  },

  async signIn(email: string, verificationCode: string): Promise<{ accessToken: string; user: User }> {
    return this.verifyAndAuthenticate(email, verificationCode);
  },

  async getMe(userId: string): Promise<User> {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    return user;
  },
};
