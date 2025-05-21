import express from 'express';
import { SuccessResponse } from '../../core/ApiResponse';
import { ProtectedRequest } from 'app-request';
import { BadRequestError } from '../../core/ApiError';
import validator from '../../helpers/validator';
import schema from './schema';
import asyncHandler from '../../helpers/asyncHandler';
import authentication from '../../auth/authentication';
import UserService from '../../services/Auth Services/user-service';
import { Types } from 'mongoose';

const router = express.Router();

/*-------------------------------------------------------------------------*/
router.use(authentication);
/*-------------------------------------------------------------------------*/

// Get current user profile
router.get(
  '/my',
  asyncHandler(async (req: ProtectedRequest, res) => {
    const user = await UserService.findById(req.user._id);
    if (!user) throw new BadRequestError('User not registered');

    return new SuccessResponse('success', {
      name: user.name,
      email: user.email,
      profilePicUrl: user.profilePicUrl,
      role: user.role,
    }).send(res);
  }),
);

// Update current user profile
router.put(
  '/',
  validator(schema.profile),
  asyncHandler(async (req: ProtectedRequest, res) => {
    const updatedUser = await UserService.updateProfile(req.user._id, {
      name: req.body.name,
      profilePicUrl: req.body.profilePicUrl,
    });

    return new SuccessResponse('Profile updated', updatedUser).send(res);
  }),
);

// Get user by email
router.get(
  '/email',
  validator(schema.email),
  asyncHandler(async (req: ProtectedRequest, res) => {
    const user = await UserService.findByEmail(req.body.email);
    if (!user) throw new BadRequestError('User not found');

    return new SuccessResponse('success', {
      name: user.name,
      email: user.email,
      profilePicUrl: user.profilePicUrl,
      role: user.role,
    }).send(res);
  }),
);

// Delete current user account
router.delete(
  '/',
  asyncHandler(async (req: ProtectedRequest, res) => {
    await UserService.deleteAccount(req.user._id);
    return new SuccessResponse('Account deleted successfully', null).send(res);
  }),
);

// Verify user email
router.post(
  '/verify-email',
  asyncHandler(async (req: ProtectedRequest, res) => {
    await UserService.verifyEmail(req.user._id);
    return new SuccessResponse('Email verified successfully', null).send(res);
  }),
);

// Get user by ID
router.get(
  '/:id',
  asyncHandler(async (req: ProtectedRequest, res) => {
    const user = await UserService.findById(new Types.ObjectId(req.params.id));
    if (!user) throw new BadRequestError('User not found');

    return new SuccessResponse('success', {
      name: user.name,
      email: user.email,
      profilePicUrl: user.profilePicUrl,
      role: user.role,
    }).send(res);
  }),
);

// Check if user exists
router.get(
  '/exists/:id',
  asyncHandler(async (req: ProtectedRequest, res) => {
    const exists = await UserService.exists(new Types.ObjectId(req.params.id));
    return new SuccessResponse('User existence checked', { exists }).send(res);
  }),
);

export default router;
