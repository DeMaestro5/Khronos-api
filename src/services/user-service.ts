import { Types } from 'mongoose';
import { BadRequestError } from '../core/ApiError';
import UserRepo from '../database/repository/UserRepo';
import User from '../database/model/User';
import { getUserData } from '../routes/access/utils';

export interface UpdateProfileData {
  name?: string;
  profilePicUrl?: string;
}

class UserService {
  async findById(id: Types.ObjectId): Promise<User | null> {
    return UserRepo.findById(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return UserRepo.findByEmail(email);
  }

  async updateProfile(
    userId: Types.ObjectId,
    data: UpdateProfileData,
  ): Promise<any> {
    const user = await UserRepo.findById(userId);
    if (!user) throw new BadRequestError('User not found');

    await UserRepo.updateInfo({
      _id: userId,
      ...data,
    } as User);

    const updatedUser = await UserRepo.findById(userId);
    if (!updatedUser) throw new BadRequestError('User not found');
    return getUserData(updatedUser);
  }

  async deleteAccount(userId: Types.ObjectId): Promise<void> {
    const user = await UserRepo.findById(userId);
    if (!user) throw new BadRequestError('User not found');

    await UserRepo.updateInfo({
      _id: userId,
      status: false,
    } as User);
  }

  async verifyEmail(userId: Types.ObjectId): Promise<void> {
    const user = await UserRepo.findById(userId);
    if (!user) throw new BadRequestError('User not found');

    await UserRepo.updateInfo({
      _id: userId,
      verified: true,
    } as User);
  }

  async exists(id: Types.ObjectId): Promise<boolean> {
    return UserRepo.exists(id);
  }
}

export default new UserService();
