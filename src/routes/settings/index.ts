import { Router, Response } from 'express';
import asyncHandler from '../../helpers/asyncHandler';
import { ProtectedRequest } from '../../types/app-request';
import { SuccessResponse, BadRequestResponse } from '../../core/ApiResponse';
import { SettingsService } from '../../services/settings.service';
import authentication from '../../auth/authentication';
import validator from '../../helpers/validator';
import schema from './schema';
import { Types } from 'mongoose';

const router = Router();

const settingsService = new SettingsService();

router.use(authentication);

router.get(
  '/',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const userId = req.user._id;
    const settings = await settingsService.getUserSettings(userId);
    new SuccessResponse('Settings retrieved successfully', {
      settings,
      metadata: {
        lastUpdated: settings.updatedAt,
        version: '1.0',
        hasCustomizations:
          settings.createdAt.getTime() !== settings.updatedAt.getTime(),
      },
    }).send(res);
  }),
);

router.put(
  '/',
  validator(schema.updateSettings),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const userId = req.user._id;
    const updates = req.body;

    console.log(`Updating settings for user: ${userId}`, {
      sections: Object.keys(updates),
      timestamps: new Date().toISOString(),
    });

    const updatedSettings = await settingsService.updateUserSettings(
      userId,
      updates,
    );

    new SuccessResponse('Setting Updated Successfully', {
      settings: updatedSettings,
      updatedSection: Object.keys(updates),
      updateAt: updatedSettings.updatedAt,
    }).send(res);
  }),
);

router.put(
  '/profile',
  validator(schema.updateProfile),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const userId = req.user._id;
    const profileUpdates = req.body;

    console.log(`Updating profile settings for user: ${userId}`);

    const updatedSettings = await settingsService.updateSettingsSection(
      userId,
      'profile',
      profileUpdates,
    );

    new SuccessResponse('Profile Updated Successfully', {
      profile: updatedSettings.profile,
      updatedAt: updatedSettings.updatedAt,
    }).send(res);
  }),
);

router.put(
  '/notifications',
  validator(schema.updateNotifications),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const userId = req.user._id;
    const notificationUpdates = req.body;

    console.log(`Updating notification of user: ${userId}`);

    const updatedSettings = await settingsService.updateNotificationPreference(
      userId,
      notificationUpdates,
    );

    new SuccessResponse('Notification Updated successfully', {
      notification: updatedSettings.notifications,
      updatedAt: updatedSettings.updatedAt,
    }).send(res);
  }),
);

router.put(
  '/privacy',
  validator(schema.updatePrivacy),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const userId = req.user._id;
    const privacyUpdates = req.body;

    console.log(`Updating privacy settings for user: ${userId}`);

    const updatedSettings = await settingsService.updateSettingsSection(
      userId,
      'privacy',
      privacyUpdates,
    );

    new SuccessResponse('Privacy updated successfully', {
      privacy: updatedSettings.privacy,
      updateAt: updatedSettings.updatedAt,
    }).send(res);
  }),
);

router.put(
  '/content',
  validator(schema.updateContent),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const userId = req.user._id;
    const contentUpdates = req.body;

    console.log(`Updating content of user: ${userId}`);

    const updatedSettings = await settingsService.updateSettingsSection(
      userId,
      'content',
      contentUpdates,
    );

    new SuccessResponse('Content updated successfully', {
      content: updatedSettings.content,
      updatedAt: updatedSettings.updatedAt,
    }).send(res);
  }),
);

router.put(
  '/interface',
  validator(schema.updateInterface),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const userId = req.user._id;
    const interfaceUpdate = req.body;

    console.log(`Updating interface for user: ${userId}`);

    const updatedSettings = await settingsService.updateSettingsSection(
      userId,
      'interface',
      interfaceUpdate,
    );

    new SuccessResponse('Interface updated successfully', {
      content: updatedSettings.interface,
      updatedAt: updatedSettings.updatedAt,
    }).send(res);
  }),
);
// post requests( reset all settings to default values)

router.post(
  '/reset',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const userId = req.user._id;

    console.log(`Resetting settings to default for user: ${userId}`);

    const resetSettings = await settingsService.resetUserSettings(userId);

    new SuccessResponse('Setting reset to default successfully', {
      settings: resetSettings,
      resetAt: new Date().toISOString(),
      message: 'All settings have been restored to their default values',
    }).send(res);
  }),
);

router.get(
  '/export',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const userId = req.user._id;

    console.log(`Exporting settings of user: ${userId}`);

    const exportData = await settingsService.exportUserSettings(userId);

    // set headers for file download

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename='settings-export-${userId}.json`,
    );

    new SuccessResponse('Settings exported successfully', exportData).send(res);
  }),
);

router.get(
  '/defaults',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { DEFAULT_SETTINGS } = await import('../../types/settings.types');

    new SuccessResponse('Default settings retrieved successfully', {
      default: DEFAULT_SETTINGS,
      description:
        'These settings are default settings applied to new user accounts',
    }).send(res);
  }),
);

router.get(
  '/admin/users',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    if (req.user.role !== 'ADMIN') {
      throw new BadRequestResponse('Only Admins can access this route');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // build filters from query parameter
    const filter: any = {};
    if (req.query.userId) {
      filter.userId = new Types.ObjectId(req.query.userId as string);
    }

    if (req.query.createdAt) {
      filter.createdAt = new Date(req.query.createdAt as string);
    }

    if (req.query.updatedAt) {
      filter.updatedAt = new Date(req.query.updatedAt as string);
    }

    const result = await settingsService.getMultipleUserSettings(
      filter,
      page,
      limit,
    );

    new SuccessResponse('User settings retrieved successfully', {
      settings: result.settings,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    }).send(res);
  }),
);

router.get(
  '/admin/statistics',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    if (req.user.role !== 'ADMIN') {
      throw new BadRequestResponse('Only admins can access this route');
    }
    // This would typically aggregate data from the database
    // For now, return placeholder statistics
    const stats = {
      totalUsers: 0, // Would query the database
      usersWithCustomSettings: 0,
      mostPopularTheme: 'light',
      mostPopularLanguage: 'en',
      averageNotificationSettings: {
        emailEnabled: 85,
        pushEnabled: 70,
        inAppEnabled: 95,
      },
      privacySettings: {
        publicProfiles: 60,
        privateProfiles: 25,
        followersOnlyProfiles: 15,
      },
    };

    new SuccessResponse('Settings statistics retrieved successfully', {
      stats,
    }).send(res);
  }),
);

export default router;
