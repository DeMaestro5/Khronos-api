import { Types } from 'mongoose';
import Notification, {
  NotificationModel,
  NotificationType,
  NotificationStatus,
  NotificationPriority,
} from '../model/Notification';
import NotificationSettings, {
  NotificationSettingsModel,
} from '../model/NotificationSettings';

async function create(notification: Notification): Promise<Notification> {
  const now = new Date();
  notification.createdAt = notification.updatedAt = now;
  const createdNotification = await NotificationModel.create(notification);
  return createdNotification.toObject();
}

async function findById(id: Types.ObjectId): Promise<Notification | null> {
  return NotificationModel.findOne({ _id: id }).lean().exec();
}

async function findByUserId(
  userId: Types.ObjectId,
  filters?: {
    type?: NotificationType;
    status?: NotificationStatus;
    priority?: NotificationPriority;
  },
  page: number = 1,
  limit: number = 20,
): Promise<Notification[]> {
  const query: any = { userId };

  if (filters) {
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
  }

  return NotificationModel.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()
    .exec();
}

async function countByUserId(
  userId: Types.ObjectId,
  filters?: {
    type?: NotificationType;
    status?: NotificationStatus;
    priority?: NotificationPriority;
  },
): Promise<number> {
  const query: any = { userId };

  if (filters) {
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
  }

  return NotificationModel.countDocuments(query).exec();
}

async function updateStatus(
  id: Types.ObjectId,
  status: NotificationStatus,
): Promise<Notification | null> {
  const updatedNotification = await NotificationModel.findByIdAndUpdate(
    id,
    { status, updatedAt: new Date() },
    { new: true },
  )
    .lean()
    .exec();

  return updatedNotification;
}

async function markAllAsRead(userId: Types.ObjectId): Promise<void> {
  await NotificationModel.updateMany(
    { userId, status: NotificationStatus.UNREAD },
    { status: NotificationStatus.READ, updatedAt: new Date() },
  ).exec();
}

async function deleteById(id: Types.ObjectId): Promise<boolean> {
  const result = await NotificationModel.deleteOne({ _id: id }).exec();
  return result.deletedCount > 0;
}

// Notification Settings methods
async function createSettings(
  settings: NotificationSettings,
): Promise<NotificationSettings> {
  const now = new Date();
  settings.createdAt = settings.updatedAt = now;
  const createdSettings = await NotificationSettingsModel.create(settings);
  return createdSettings.toObject();
}

async function findSettingsByUserId(
  userId: Types.ObjectId,
): Promise<NotificationSettings | null> {
  return NotificationSettingsModel.findOne({ userId }).lean().exec();
}

async function updateSettings(
  userId: Types.ObjectId,
  updates: Partial<NotificationSettings>,
): Promise<NotificationSettings | null> {
  const updatedSettings = await NotificationSettingsModel.findOneAndUpdate(
    { userId },
    { ...updates, updatedAt: new Date() },
    { new: true, upsert: true },
  )
    .lean()
    .exec();

  return updatedSettings;
}

export default {
  create,
  findById,
  findByUserId,
  countByUserId,
  updateStatus,
  markAllAsRead,
  deleteById,
  createSettings,
  findSettingsByUserId,
  updateSettings,
};
