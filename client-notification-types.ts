export enum NotificationType {
  SCHEDULE = 'schedule',
  PERFORMANCE = 'performance',
  TREND = 'trend',
  SYSTEM = 'system',
  // New types added to backend
  SECURITY = 'security',
  REMINDER = 'reminder',
  MESSAGE = 'message',
  MARKETING = 'marketing',
  PRODUCT_UPDATE = 'product_update',
  REPORT = 'report',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
}

export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  // Backend uses 'data' field, not 'metadata'
  data?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSettings {
  _id: string;
  userId: string;
  email: boolean;
  push: boolean;
  inApp: boolean;
  scheduleNotifications: boolean;
  performanceAlerts: boolean;
  trendUpdates: boolean;
  systemUpdates: boolean;
  // New toggle fields added to backend
  securityAlerts?: boolean;
  productUpdates?: boolean;
  messages?: boolean;
  reminders?: boolean;
  marketing?: boolean;
  reports?: boolean;
  // Updated quietHours to include enabled flag
  quietHours?: {
    enabled?: boolean;
    start: string;
    end: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface NotificationFilters {
  type?: NotificationType;
  status?: NotificationStatus;
  priority?: NotificationPriority;
}

export interface NotificationResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Helper type for updating notification settings
export interface NotificationSettingsUpdate {
  email?: boolean;
  push?: boolean;
  inApp?: boolean;
  scheduleNotifications?: boolean;
  performanceAlerts?: boolean;
  trendUpdates?: boolean;
  systemUpdates?: boolean;
  securityAlerts?: boolean;
  productUpdates?: boolean;
  messages?: boolean;
  reminders?: boolean;
  marketing?: boolean;
  reports?: boolean;
  quietHours?: {
    enabled?: boolean;
    start?: string;
    end?: string;
  };
}
