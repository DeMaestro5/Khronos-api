import { Router } from 'express';
import validator from '../../helpers/validator';
import schema from './schema';
import asyncHandler from '../../helpers/asyncHandler';
import { ProtectedRequest } from '../../types/app-request';
import {
  deactivate,
  getTiktokConnectionByUser,
  upsertConnection,
} from '../../database/repository/PlatformConnectionRepo';
import { SuccessResponse } from '../../core/ApiResponse';
import { NotFoundError } from '../../core/ApiError';
import { PlatformConnectionModel } from '../../database/model/platformConnection';
import { encrypt } from '../../helpers/crypto';

const router = Router();

router.post(
  '/connect',
  validator(schema.tiktokConnectSchema),
  asyncHandler(async (req: ProtectedRequest, res) => {
    const { openId, accessToken, accountName } = req.body;
    const connection = await upsertConnection(req.user._id, 'tiktok', {
      accessToken,
      accountId: openId,
      accountName: accountName || 'TikTok Account',
      permissions: ['read', 'analytics'],
    });

    await PlatformConnectionModel.updateOne(
      { userId: req.user._id, platform: 'tiktok' },
      {
        $set: {
          'platformCredentials.tiktok.openId': openId,
          'platformCredentials.tiktok.accessTokenEnc': encrypt(accessToken),
        },
      },
      { upsert: false },
    );

    new SuccessResponse('TikTok connection created successfully', {
      platform: 'tiktok',
      accountId: openId,
      accountName: connection.accountName,
      isActive: connection.isActive,
      connectedAt: connection.connectAt,
    }).send(res);
  }),
);

router.get(
  '/status',
  asyncHandler(async (req: ProtectedRequest, res) => {
    const connection = await getTiktokConnectionByUser(req.user._id);

    if (!connection) {
      throw new NotFoundError('TikTok connection not found');
    }
    new SuccessResponse('TikTok connection status retrieved', {
      platform: 'tiktok',
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
    await deactivate(req.user._id, 'tiktok');

    new SuccessResponse('TikTok account disconnected successfully', {
      platform: 'tiktok',
      isConnected: false,
    }).send(res);
  }),
);

export default router;
