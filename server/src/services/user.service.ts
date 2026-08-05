import { userRepository } from '../repositories/user.repository';
import { AppError } from '../middleware/error.middleware';
import { User } from '../models';

export const userService = {
  async getUserById(userId: string): Promise<User> {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    return user;
  },

  async updateUser(
    userId: string,
    currentUserId: string,
    data: Partial<{ displayName: string; avatar: string }>
  ): Promise<User> {
    if (userId !== currentUserId) {
      throw new AppError('You can only update your own profile', 403);
    }
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    await userRepository.update(userId, data);
    const updated = await userRepository.findById(userId);
    return updated!;
  },
};
