import { Router, Response } from 'express';
import asyncHandler from '../../helpers/asyncHandler';
import { ProtectedRequest } from '../../types/app-request';
import { SuccessResponse, BadRequestResponse } from '../../core/ApiResponse';
import { NotificationService } from '../../services/notification.service';
import {
  NotificationType,
  NotificationPriority,
  NotificationStatus,
} from '../../database/model/Notification';
import authentication from '../../auth/authentication';
import { Types } from 'mongoose';

const router = Router();
const notificationService = new NotificationService();

router.use(authentication);

// Get all notifications for the authenticated user
router.get(
  '/',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const userId = req.user._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Parse filters from query parameters
    const filters: {
      type?: NotificationType;
      status?: NotificationStatus;
      priority?: NotificationPriority;
    } = {};

    if (
      req.query.type &&
      Object.values(NotificationType).includes(
        req.query.type as NotificationType,
      )
    ) {
      filters.type = req.query.type as NotificationType;
    }

    if (
      req.query.status &&
      Object.values(NotificationStatus).includes(
        req.query.status as NotificationStatus,
      )
    ) {
      filters.status = req.query.status as NotificationStatus;
    }

    if (
      req.query.priority &&
      Object.values(NotificationPriority).includes(
        req.query.priority as NotificationPriority,
      )
    ) {
      filters.priority = req.query.priority as NotificationPriority;
    }

    const result = await notificationService.getUserNotifications(
      userId,
      Object.keys(filters).length > 0 ? filters : undefined,
      page,
      limit,
    );

    new SuccessResponse('Notifications retrieved successfully', result).send(
      res,
    );
  }),
);

// Mark a specific notification as read
router.put(
  '/:id/read',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const notificationId = req.params.id;

    if (!Types.ObjectId.isValid(notificationId)) {
      throw new BadRequestResponse('Invalid notification ID');
    }

    const notification = await notificationService.updateNotificationStatus(
      new Types.ObjectId(notificationId),
      NotificationStatus.READ,
    );

    new SuccessResponse('Notification marked as read', notification).send(res);
  }),
);

// Mark all notifications as read for the authenticated user
router.put(
  '/read-all',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const userId = req.user._id;

    await notificationService.markAllAsRead(userId);

    new SuccessResponse('All notifications marked as read', {}).send(res);
  }),
);

// Get notification settings for the authenticated user
router.get(
  '/settings',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const userId = req.user._id;

    let settings = await notificationService.getNotificationSettings(userId);

    // If no settings exist, create default settings
    if (!settings) {
      const defaultSettings = {
        _id: new Types.ObjectId(),
        userId,
        email: true,
        push: true,
        inApp: true,
        scheduleNotifications: true,
        performanceAlerts: true,
        trendUpdates: true,
        systemUpdates: true,
        quietHours: {
          start: '22:00',
          end: '08:00',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      settings = await notificationService.updateNotificationSettings(
        userId,
        defaultSettings,
      );
    }

    new SuccessResponse(
      'Notification settings retrieved successfully',
      settings,
    ).send(res);
  }),
);

// Update notification settings for the authenticated user
router.put(
  '/settings',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const userId = req.user._id;
    const updates = req.body;

    // Validate the updates object
    const allowedFields = [
      'email',
      'push',
      'inApp',
      'scheduleNotifications',
      'performanceAlerts',
      'trendUpdates',
      'systemUpdates',
      'quietHours',
    ];

    const filteredUpdates: any = {};
    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      throw new BadRequestResponse('No valid fields provided for update');
    }

    // Validate quietHours format if provided
    if (filteredUpdates.quietHours) {
      const { start, end } = filteredUpdates.quietHours;
      if (
        typeof start !== 'string' ||
        typeof end !== 'string' ||
        !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(start) ||
        !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(end)
      ) {
        throw new BadRequestResponse(
          'Invalid quietHours format. Use HH:MM format (e.g., "22:00")',
        );
      }
    }

    const updatedSettings =
      await notificationService.updateNotificationSettings(
        userId,
        filteredUpdates,
      );

    new SuccessResponse(
      'Notification settings updated successfully',
      updatedSettings,
    ).send(res);
  }),
);

export default router;
