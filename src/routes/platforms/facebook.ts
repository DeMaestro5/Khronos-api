import { Router } from 'express';
import schema from './schema';
import validator from '../../helpers/validator';
import asyncHandler from '../../helpers/asyncHandler';
import { ProtectedRequest } from '../../types/app-request';
import {
  deactivate,
  getFacebookConnectionByUser,
  upsertConnection,
} from '../../database/repository/PlatformConnectionRepo';
import { SuccessResponse } from '../../core/ApiResponse';
import { NotFoundError } from '../../core/ApiError';

const router = Router();

router.post(
  '/connect',
  validator(schema.facebookConnectSchema),
  asyncHandler(async (req: ProtectedRequest, res) => {
    const { pageId, pageAccessToken, accountName } = req.body;

    const connection = await upsertConnection(req.user._id, 'facebook', {
      accessToken: pageAccessToken,
      accountId: pageId,
      accountName: accountName || 'Facebook Page',
      permissions: ['read', 'analytics'],
    });

    new SuccessResponse('Facebook connection created successfully', {
      platform: 'facebook',
      accountId: connection.accountId,
      accountName: connection.accountName,
      isActive: connection.isActive,
      connectedAt: connection.connectAt,
    }).send(res);
  }),
);

router.get(
  '/status',
  asyncHandler(async (req: ProtectedRequest, res) => {
    const connection = await getFacebookConnectionByUser(req.user._id);

    if (!connection) {
      throw new NotFoundError('Facebook connection not found');
    }

    new SuccessResponse('Facebook connection status retrieved', {
      platform: 'facebook',
      isConnected: !!connection?.isActive,
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
    await deactivate(req.user._id, 'facebook');

    new SuccessResponse('Facebook connection disconnected successfully', {
      platform: 'facebook',
      isConnected: false,
    }).send(res);
  }),
);

export default router;
