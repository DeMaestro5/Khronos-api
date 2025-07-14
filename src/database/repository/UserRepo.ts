import User, { UserModel, UserRole } from '../model/User';
import { InternalError } from '../../core/ApiError';
import { Types } from 'mongoose';
import KeystoreRepo from './KeystoreRepo';
import Keystore from '../model/Keystore';

async function exists(id: Types.ObjectId): Promise<boolean> {
  const user = await UserModel.exists({ _id: id, status: true });
  return user !== null && user !== undefined;
}

async function findPrivateProfileById(
  id: Types.ObjectId,
): Promise<User | null> {
  return UserModel.findOne({ _id: id, status: true })
    .select('+email')
    .lean<User>()
    .exec();
}

// contains critical information of the user
async function findById(id: Types.ObjectId): Promise<User | null> {
  return UserModel.findOne({ _id: id, status: true })
    .select('+email +password')
    .lean()
    .exec();
}

async function findByEmail(email: string): Promise<User | null> {
  return UserModel.findOne({ email: email })
    .select(
      '+email +password +gender +dob +grade +country +state +city +school +bio +hobbies',
    )
    .lean()
    .exec();
}

async function findByGoogleId(googleId: string): Promise<User | null> {
  return UserModel.findOne({ googleId: googleId, status: true })
    .select('+email +googleId +googleEmail')
    .lean()
    .exec();
}

async function findFieldsById(
  id: Types.ObjectId,
  ...fields: string[]
): Promise<User | null> {
  return UserModel.findOne({ _id: id, status: true }, [...fields])
    .lean()
    .exec();
}

async function findPublicProfileById(id: Types.ObjectId): Promise<User | null> {
  return UserModel.findOne({ _id: id, status: true }).lean().exec();
}

async function create(
  user: User,
  accessTokenKey: string,
  refreshTokenKey: string,
  roleCode: string,
): Promise<{ user: User; keystore: Keystore }> {
  const now = new Date();

  if (!Object.values(UserRole).includes(roleCode as UserRole)) {
    throw new InternalError('Invalid role');
  }

  user.role = roleCode;
  user.createdAt = user.updatedAt = now;
  const createdUser = await UserModel.create(user);
  const keystore = await KeystoreRepo.create(
    createdUser,
    accessTokenKey,
    refreshTokenKey,
  );
  return {
    user: { ...createdUser.toObject() },
    keystore: keystore,
  };
}

async function createWithGoogle(
  user: User,
  accessTokenKey: string,
  refreshTokenKey: string,
  roleCode: string,
): Promise<{ user: User; keystore: Keystore }> {
  const now = new Date();

  if (!Object.values(UserRole).includes(roleCode as UserRole)) {
    throw new InternalError('Invalid role');
  }

  user.role = roleCode;
  user.createdAt = user.updatedAt = now;
  user.authProvider = 'google';
  const createdUser = await UserModel.create(user);
  const keystore = await KeystoreRepo.create(
    createdUser,
    accessTokenKey,
    refreshTokenKey,
  );
  return {
    user: { ...createdUser.toObject() },
    keystore: keystore,
  };
}

async function linkGoogleAccount(
  userId: Types.ObjectId,
  googleData: { googleId: string; googleEmail: string; authProvider: string },
): Promise<User> {
  const updatedUser = await UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        googleId: googleData.googleId,
        googleEmail: googleData.googleEmail,
        authProvider: googleData.authProvider,
        updatedAt: new Date(),
      },
    },
    { new: true },
  )
    .select('+email +googleId +googleEmail')
    .lean()
    .exec();

  if (!updatedUser) {
    throw new InternalError('Failed to link Google account');
  }

  return updatedUser;
}

async function update(
  user: User,
  accessTokenKey: string,
  refreshTokenKey: string,
): Promise<{ user: User; keystore: Keystore }> {
  user.updatedAt = new Date();
  await UserModel.updateOne({ _id: user._id }, { $set: { ...user } })
    .lean()
    .exec();
  const keystore = await KeystoreRepo.create(
    user,
    accessTokenKey,
    refreshTokenKey,
  );
  return { user: user, keystore: keystore };
}

async function updateInfo(user: User): Promise<any> {
  user.updatedAt = new Date();
  return UserModel.updateOne({ _id: user._id }, { $set: { ...user } })
    .lean()
    .exec();
}

export default {
  exists,
  findPrivateProfileById,
  findById,
  findByEmail,
  findByGoogleId,
  findFieldsById,
  findPublicProfileById,
  create,
  createWithGoogle,
  linkGoogleAccount,
  update,
  updateInfo,
};
