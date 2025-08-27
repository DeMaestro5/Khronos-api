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
