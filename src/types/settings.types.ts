import { Types } from 'mongoose';

export interface UserSettings {
  userId: Types.ObjectId;

  //profile settings
  profile: {
    displayName?: string;
    bio?: string;
    location?: string;
    website?: string;
    timezone?: string;
    language?: string;
    dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
    timeFormat: '12h' | '24h';
  };

  //notification preferences

  notifications: {
    email: {
      enabled: boolean;
      marketing: boolean;
      productUpdate: boolean;
      weeklyDigest: boolean;
      contentReminders: boolean;
    };

    push: {
      enabled: boolean;
      contentPublished: boolean;
      trendsAlert: boolean;
      collaborativeInvites: boolean;
    };
    inApp: {
      enabled: boolean;
      mentions: boolean;
      comments: boolean;
      likes: boolean;
    };
  };

  //privacy settings
  privacy: {
    profileVisibility: 'public' | 'private' | 'followers';
    showEmail: boolean;
    showLocation: boolean;
    allowAnalytics: boolean;
    dataSharing: boolean;
  };

  //content preferences
  content: {
    defaultPlatforms: string[];
    defaultContentType: 'article' | 'post' | 'video';
    autoSave: boolean;
    autoScheduling: boolean;
    aiSuggestion: boolean;
    contentLanguage: string;
  };

  // UI preferences
  interface: {
    theme: 'light' | 'dark' | 'system';
    sidebarCollapsed: boolean;
    defaultView: 'grid' | 'list';
    itemsPerPage: number;
    enablesAnimation: boolean;
    compactMode: boolean;
  };

  //integration settings
  integrations: {
    connectedAccounts: {
      platform: string;
      accountId: string;
      accountName: string;
      isActive: boolean;
      permissions: string[];
      connectedAt: Date;
    }[];

    apikeys: {
      name: string;
      keyId: string;
      permissions: string[];
      createdAt: Date;
      lastUsed: Date;
      isActive: boolean;
    }[];
  };

  //timestamps
  createdAt: Date;
  updatedAt: Date;
}

//settingUpdate
export interface SettingsUpdate {
  profile?: Partial<UserSettings['profile']>;
  notifications?: Partial<UserSettings['notifications']>;
  privacy?: Partial<UserSettings['privacy']>;
  content?: Partial<UserSettings['content']>;
  interface?: Partial<UserSettings['interface']>;
  integrations?: Partial<UserSettings['integrations']>;
}

//setting filter for query
export interface SettingFilters {
  userId?: Types.ObjectId;
  createdAfter?: Date;
  updatedAfter?: Date;
}

export const DEFAULT_SETTINGS: Omit<
  UserSettings,
  '_id' | 'userId' | 'createdAt' | 'updatedAt'
> = {
  profile: {
    timezone: 'UTC',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
  },
  notifications: {
    email: {
      enabled: true,
      marketing: false,
      productUpdate: true,
      weeklyDigest: true,
      contentReminders: true,
    },
    push: {
      enabled: true,
      contentPublished: true,
      trendsAlert: false,
      collaborativeInvites: true,
    },
    inApp: {
      enabled: true,
      mentions: true,
      comments: true,
      likes: false,
    },
  },

  privacy: {
    profileVisibility: 'public',
    showEmail: false,
    showLocation: false,
    allowAnalytics: true,
    dataSharing: false,
  },

  content: {
    defaultPlatforms: ['tiktok'],
    defaultContentType: 'video',
    autoSave: true,
    autoScheduling: false,
    aiSuggestion: true,
    contentLanguage: 'en',
  },

  interface: {
    theme: 'light',
    sidebarCollapsed: false,
    defaultView: 'grid',
    itemsPerPage: 20,
    enablesAnimation: true,
    compactMode: false,
  },

  integrations: {
    connectedAccounts: [],
    apikeys: [],
  },
};
