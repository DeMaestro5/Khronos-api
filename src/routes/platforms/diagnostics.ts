import express from 'express';
import { requireUser } from '../../middleware/requireUser';
import { Types } from 'mongoose';
import { BadRequestResponse, SuccessResponse } from '../../core/ApiResponse';
import { PlatformConnectionModel } from '../../database/model/platformConnection';
import asyncHandler from '../../helpers/asyncHandler';
import { getPlatformCredentials } from '../../database/repository/PlatformConnectionRepo';
import crypto from 'crypto';

const router = express.Router();

router.get(
  '/youtube/status-raw',
  requireUser,
  asyncHandler(async (req: any, res) => {
    const userId = req.appUser?.id;
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new BadRequestResponse('Invalid user id').send(res);
    }

    const doc = await PlatformConnectionModel.findOne({
      userId: new Types.ObjectId(userId),
      platform: 'youtube',
    }).lean();

    const sanitized = doc
      ? {
          exists: true,
          isActive: !!doc.isActive,
          hasTopLevelToken: !!doc.accessTokenEncrypted,
          hasRefreshToken: !!doc.refreshTokenEncrypted,
          hasPlatformToken: !!doc.platformCredentials?.youtube?.accessTokenEnc,
          accountId: doc.accountId || null,
          accountName: doc.accountName || null,
          platformChannelId:
            doc.platformCredentials?.youtube?.channelId || null,
          connectedAt: doc.connectAt,
          lastSyncAt: doc.lastSyncAt,
        }
      : { exists: false };

    return new SuccessResponse('Youtube raw status', sanitized).send(res);
  }),
);

router.get(
  '/youtube/status-debug',
  requireUser,
  asyncHandler(async (req: any, res) => {
    const userId = req.appUser?.id;
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new BadRequestResponse('Invalid user id').send(res);
    }
    let creds: any = null;
    let decryptionError = false;

    try {
      creds = await getPlatformCredentials(
        new Types.ObjectId(userId),
        'youtube',
      );
    } catch {
      decryptionError = true;
    }

    const connected = !!(
      creds &&
      (creds.accessTokenEnc || creds.refreshTokenEnc)
    );
    return new SuccessResponse('Youtube debug status', {
      foundDoc: !!creds,
      decryptionError,
      connectedDerived: connected,
      hasDecryptedAccess: !!creds?.accessTokenEnc,
      hasDecryptedRefresh: !!creds?.refreshTokenEnc,
      channelId: creds?.channelId || null,
      accountId: creds?.accountId || null,
    }).send(res);
  }),
);

router.get(
  '/env-check',
  requireUser,
  asyncHandler(async (_req, res) => {
    const ek = process.env.ENCRYPTION_KEY_BASE64 || '';
    const ekBuf = ek ? Buffer.from(ek, 'base64') : undefined;
    const ekValid = !!ekBuf && ekBuf.length === 32;
    const ekHash = ekValid
      ? crypto.createHash('sha256').update(ekBuf!).digest('hex').slice(0, 8)
      : null;

    return new SuccessResponse('Env diagnostics', {
      encryptionKey: {
        present: !!ek,
        validLength: ekValid,
        keyHasPrefix: ekHash,
      },
      jwt: {
        issuer: process.env.TOKEN_ISSUER ? 'set' : 'missing',
        audience: process.env.TOKEN_AUDIENCE ? 'set' : 'missing',
        hasPublicKey: !!process.env.RSA_PUBLIC_KEY,
        hasPrivateKey: !!process.env.RSA_PRIVATE_KEY,
      },
      googleOAUTH: {
        clientIdSet: !!process.env.GOOGLE_CLIENT_ID,
        callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'unset',
      },
      stateSecretSet: !!process.env.STATE_SECRET,
      mongodbUriSet: !!process.env.MONGODB_URI,
      frontendUrl: process.env.FRONTEND_URL || 'unset',
      apiUrl: process.env.API_URL || 'unset',
      nodeEnv: process.env.NODE_ENV || 'unset',
    }).send(res);
  }),
);
export default router;
