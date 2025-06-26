import { Schema, Document, model, Model, Types } from 'mongoose';
import { DEFAULT_SETTINGS, UserSettings } from '../../types/settings.types';

//extends userSettings  interface to use Mongoose Documents Methods
interface UserSettingsDocument extends UserSettings, Document {}
interface UserSettingsModel extends Model<UserSettingsDocument> {
  createDefaultSettings(userId: Types.ObjectId): UserSettingsDocument;
}
interface UserSettingsDocument extends UserSettings, Document {
  resetToDefaults(): Promise<UserSettingsDocument>;
}

//Define Mongoose Schema
const userSettingsSchema = new Schema<UserSettingsDocument>(
  {
    //reference to the user - this creates a relationship between settings and user
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // profile settings - nested object
    profile: {
      displayName: { type: String, trim: true },
      bio: { type: String, maxLength: 500 },
      location: { type: String, trim: true },
      websites: {
        type: String,
        validate: {
          validator: function (v: string) {
            if (!v) return true; // allow empty values
            return /^https?:\/\/.+/.test(v);
          },
          message: 'Website must be a valid URL',
        },
      },

      timezone: {
        type: String,
        required: true,
        default: DEFAULT_SETTINGS.profile.timezone,
      },
      language: {
        type: String,
        required: true,
        default: DEFAULT_SETTINGS.profile.language,
        enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko'], // Supported languages
      },
      dateFormat: {
        type: String,
        required: true,
        enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'], // Only allow these formats
        default: DEFAULT_SETTINGS.profile.dateFormat,
      },
      timeFormat: {
        type: String,
        required: true,
        enum: ['12h', '24h'],
        default: DEFAULT_SETTINGS.profile.timeFormat,
      },
    },

    //Notification Preferences- grouped by delivery methods
    notifications: {
      email: {
        enabled: {
          type: Boolean,
          default: DEFAULT_SETTINGS.notifications.email.enabled,
        },
        marketing: {
          type: Boolean,
          default: DEFAULT_SETTINGS.notifications.email.marketing,
        },
        productUpdates: {
          type: String,
          default: DEFAULT_SETTINGS.notifications.email.productUpdate,
        },
        weeklyDigest: {
          type: String,
          default: DEFAULT_SETTINGS.notifications.email.weeklyDigest,
        },
        contentReminders: {
          type: String,
          default: DEFAULT_SETTINGS.notifications.email.contentReminders,
        },
      },
      push: {
        enabled: {
          type: Boolean,
          default: DEFAULT_SETTINGS.notifications.push.enabled,
        },
        contentPublished: {
          type: Boolean,
          default: DEFAULT_SETTINGS.notifications.push.contentPublished,
        },
        trendsAlert: {
          type: Boolean,
          default: DEFAULT_SETTINGS.notifications.push.trendsAlert,
        },
        collaborativeInvites: {
          type: Boolean,
          default: DEFAULT_SETTINGS.notifications.push.collaborativeInvites,
        },
      },

      inApp: {
        enabled: {
          type: String,
          default: DEFAULT_SETTINGS.notifications.inApp.enabled,
        },
        mentions: {
          type: Boolean,
          default: DEFAULT_SETTINGS.notifications.inApp.mentions,
        },
        comments: {
          type: Boolean,
          default: DEFAULT_SETTINGS.notifications.inApp.comments,
        },
        likes: {
          type: Boolean,
          default: DEFAULT_SETTINGS.notifications.inApp.likes,
        },
      },
    },

    // privacy controls

    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'private', 'followers'],
        default: DEFAULT_SETTINGS.privacy.profileVisibility,
      },
      showEmail: { type: Boolean, default: DEFAULT_SETTINGS.privacy.showEmail },
      showLocation: {
        type: Boolean,
        default: DEFAULT_SETTINGS.privacy.showLocation,
      },
      allowAnalytics: {
        type: Boolean,
        default: DEFAULT_SETTINGS.privacy.allowAnalytics,
      },
      dataSharing: {
        type: Boolean,
        default: DEFAULT_SETTINGS.privacy.dataSharing,
      },
    },

    content: {
      defaultPlatforms: [
        {
          type: String,
          enum: [
            'twitter',
            'linkedin',
            'facebook',
            'instagram',
            'tiktok',
            'youtube',
          ],
        },
      ],
      defaultContentType: {
        type: String,
        enum: ['article', 'video', 'post'],
        default: DEFAULT_SETTINGS.content.defaultContentType,
      },
      autoSave: { type: Boolean, default: DEFAULT_SETTINGS.content.autoSave },
      autoScheduling: {
        type: Boolean,
        default: DEFAULT_SETTINGS.content.autoScheduling,
      },
      aiSuggestions: {
        type: Boolean,
        default: DEFAULT_SETTINGS.content.aiSuggestion,
      },
      contentLanguage: {
        type: String,
        enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko'],
        default: DEFAULT_SETTINGS.content.contentLanguage,
      },
    },

    //UI/UX preferences
    interface: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: DEFAULT_SETTINGS.interface.theme,
      },
      sidebarCollapsed: {
        type: Boolean,
        default: DEFAULT_SETTINGS.interface.sidebarCollapsed,
      },
      defaultView: {
        type: String,
        enum: ['list', 'grid'],
        default: DEFAULT_SETTINGS.interface.defaultView,
      },
      itemsPerPage: {
        type: Number,
        min: 5,
        max: 100,
        default: DEFAULT_SETTINGS.interface.itemsPerPage,
      },
      enableAnimation: {
        type: Boolean,
        default: DEFAULT_SETTINGS.interface.enablesAnimation,
      },
      compactMode: {
        type: Boolean,
        default: DEFAULT_SETTINGS.interface.compactMode,
      },
    },

    //integration
    integrations: {
      connectedAccounts: [
        {
          platform: { type: String, required: true },
          accountId: { type: String, required: true },
          accountName: { type: String, required: true },
          isActive: { type: Boolean, required: true },
          permission: [{ type: String }],
          connectedAt: { type: Date, default: Date.now },
        },
      ],
      apiKeys: [
        {
          name: { type: String, required: true },
          KeyId: { type: String, require: true },
          permissions: [{ type: String }],
          createdAt: { type: Date, default: Date.now },
          lastUsed: { type: Date },
          isActive: { type: Boolean, default: true },
        },
      ],
    },
  },
  {
    //schema options
    timestamps: true,
    versionKey: false,
  },
);

// indexes for better query performance
userSettingsSchema.index({ userId: 1 });
userSettingsSchema.index({ updateAt: -1 });
userSettingsSchema.index({ 'profile.language': 1 });

//pre-save middleware - runs before saving to database

userSettingsSchema.pre('save', function (next) {
  if (this.content.defaultPlatforms.length === 0) {
    this.content.defaultPlatforms === DEFAULT_SETTINGS.content.defaultPlatforms;
  }
  next();
});

// static method to create default settings for new users

userSettingsSchema.statics.createDefaultSettings = function (userId: string) {
  return new this({
    userId,
    ...DEFAULT_SETTINGS,
  });
};

//Instance method to reset settings to default

userSettingsSchema.methods.resetToDefaults = function () {
  //keep user id and timestamp, reset everything else
  const { userId, createdAt } = this;
  Object.assign(this, {
    userId,
    createdAt,
    ...DEFAULT_SETTINGS,
  });
  return this.save();
};

//Create and export model

export const SettingsModel = model<UserSettingsDocument, UserSettingsModel>(
  'UserSettings',
  userSettingsSchema,
);

export type { UserSettingsDocument };
