import { Router, Response } from 'express';
import asyncHandler from '../../helpers/asyncHandler';
import { ProtectedRequest } from '../../types/app-request';
import { SuccessResponse } from '../../core/ApiResponse';
import {
  upsertConnection,
  getLinkedinConnectionByUser,
  deactivate,
} from '../../database/repository/PlatformConnectionRepo';
import validator from '../../helpers/validator';
import schema from './schema';
import { PlatformConnectionModel } from '../../database/model/platformConnection';
import { encrypt } from '../../helpers/crypto';

const router = Router();

// Connect LinkedIn Account
router.post(
  '/connect',
  validator(schema.linkedinConnectSchema),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { memberUrn, accessToken, accountName } = req.body;

    const connection = await upsertConnection(req.user._id, 'linkedin', {
      accessToken: accessToken,
      accountId: memberUrn,
      accountName: accountName || 'LinkedIn Account',
      permissions: ['read', 'analytics'],
    });

    // After upsertConnection(...) in the connect handler:
    await PlatformConnectionModel.updateOne(
      { userId: req.user._id, platform: 'linkedin' },
      {
        $set: {
          'platformCredentials.linkedin.memberUrn': memberUrn,
          'platformCredentials.linkedin.accessTokenEnc': encrypt(accessToken),
        },
      },
      { upsert: false },
    );

    new SuccessResponse('LinkedIn account connected successfully', {
      platform: 'linkedin',
      accountId: memberUrn,
      accountName: connection.accountName,
      isActive: connection.isActive,
      connectAt: connection.connectAt,
    }).send(res);
  }),
);

// Get LinkedIn connection status
router.get(
  '/status',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const connection = await getLinkedinConnectionByUser(req.user._id);

    new SuccessResponse('LinkedIn connection status retrieved', {
      platform: 'linkedin',
      isConnected: !!connection?.isActive,
      accountId: connection?.accountId,
      accountName: connection?.accountName,
      connectAt: connection?.connectAt,
      lastSyncAt: connection?.lastSyncAt,
      permissions: connection?.permissions,
    }).send(res);
  }),
);

// Disconnect LinkedIn
router.delete(
  '/disconnect',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    await deactivate(req.user._id, 'linkedin');

    new SuccessResponse('LinkedIn account disconnected successfully', {
      platform: 'linkedin',
      isConnected: false,
    }).send(res);
  }),
);

export default router;
