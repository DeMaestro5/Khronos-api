import { Router } from 'express';
import { ProtectedRequest } from '../../types/app-request';
import validator from '../../helpers/validator';
import schema from './schema';
import asyncHandler from '../../helpers/asyncHandler';
import {
  deactivate,
  getTwitterConnectionByUser,
  upsertConnection,
} from '../../database/repository/PlatformConnectionRepo';
import { SuccessResponse } from '../../core/ApiResponse';
import { NotFoundError } from '../../core/ApiError';

const router = Router();

router.post(
  '/connect',
  validator(schema.twitterConnectSchema),
  asyncHandler(async (req: ProtectedRequest, res) => {
    const { userId, accessToken, accessTokenSecret } = req.body;

    const connection = await upsertConnection(req.user._id, 'twitter', {
      accessToken,
      accountId: userId,
      accountName: 'Twitter Account',
      permissions: ['read', 'analytics'],
    });

    new SuccessResponse('Twitter connection created successfully', {
      platform: 'twitter',
      accountId: userId,
      accessTokenSecret,
      accountName: connection.accountName,
      isActive: connection.isActive,
      connectedAt: connection.connectAt,
    }).send(res);
  }),
);

router.get(
  '/status',
  asyncHandler(async (req: ProtectedRequest, res) => {
    const connection = await getTwitterConnectionByUser(req.user._id);

    if (!connection) {
      throw new NotFoundError('Twitter connection not found');
    }
    new SuccessResponse('Twitter connection status retrieved', {
      platform: 'twitter',
      isConnected: !!connection.isActive,
      accountId: connection.accountId,
      accountName: connection.accountName,
      connectedAt: connection.connectAt,
      lastSyncAt: connection.lastSyncAt,
      permissions: connection.permissions,
    }).send(res);
  }),
);

router.delete(
  '/disconnect',
  asyncHandler(async (req: ProtectedRequest, res) => {
    await deactivate(req.user._id, 'twitter');

    new SuccessResponse('Twitter account disconnected successfully', {
      platform: 'twitter',
      isConnected: false,
    }).send(res);
  }),
);

export default router;
