import { Router } from 'express';
import asyncHandler from '../../helpers/asyncHandler';
import validator from '../../helpers/validator';
import schema from './schema';
import { ProtectedRequest } from '../../types/app-request';
import {
  deactivate,
  getInstagramConnectionByUser,
  upsertConnection,
} from '../../database/repository/PlatformConnectionRepo';
import { BadRequestResponse, SuccessResponse } from '../../core/ApiResponse';
import { encrypt } from '../../helpers/crypto';
import { PlatformConnectionModel } from '../../database/model/platformConnection';

const router = Router();

router.post(
  '/connect',
  validator(schema.instagramConnectSchema),
  asyncHandler(async (req: ProtectedRequest, res) => {
    const { igBusinessAccountId, igUserAccessToken, accountName } = req.body;

    const connection = await upsertConnection(req.user._id, 'instagram', {
      accessToken: igUserAccessToken,
      accountId: igBusinessAccountId,
      accountName: accountName || 'Instagram Business Account',
      permissions: ['read', 'analytics'],
    });

    // After upsertConnection(...) in the connect handler:
    await PlatformConnectionModel.updateOne(
      { userId: req.user._id, platform: 'instagram' },
      {
        $set: {
          'platformCredentials.instagram.igBusinessAccountId':
            igBusinessAccountId,
          'platformCredentials.instagram.igUserAccessTokenEnc':
            encrypt(igUserAccessToken),
        },
      },
      { upsert: false },
    );

    new SuccessResponse('Instagram connection successful', {
      platform: 'instagram',
      accountId: igBusinessAccountId,
      accountName: connection.accountName,
      isActive: connection.isActive,
      connectedAt: connection.connectAt,
    }).send(res);
  }),
);

router.get(
  '/status',
  asyncHandler(async (req: ProtectedRequest, res) => {
    const connection = await getInstagramConnectionByUser(req.user._id);
    if (!connection) {
      return new BadRequestResponse('Instagram connection not found').send(res);
    }

    new SuccessResponse('Instagram connection status', {
      platform: 'instagram',
      accountId: connection.accountId,
      accountName: connection.accountName,
      isConnected: connection.isActive,
      lastSyncAt: connection.lastSyncAt,
      permissions: connection.permissions,
      connectedAt: connection.connectAt,
    }).send(res);
  }),
);

router.delete(
  '/disconnect',
  asyncHandler(async (req: ProtectedRequest, res) => {
    await deactivate(req.user._id, 'instagram');

    new SuccessResponse('Instagram account disconnected successfully', {
      platform: 'instagram',
      isConnected: false,
    }).send(res);
  }),
);

export default router;
