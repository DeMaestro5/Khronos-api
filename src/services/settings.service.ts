import { Types } from 'mongoose';
import SettingsRepo from '../database/repository/SettingsRepo';
import {
  UserSettings,
  SettingFilters,
  SettingsUpdate,
} from '../types/settings.types';

type ProfileKey = keyof UserSettings['profile'];

export class SettingsService {
  async getUserSettings(userId: Types.ObjectId): Promise<UserSettings> {
    try {
      const settings = await SettingsRepo.getOrCreate(userId);
      console.log(`Settings accessed for user: ${userId}`);
      return settings;
    } catch (error) {
      console.error('Setting service error - getSettingService', error);
      throw error;
    }
  }

  async updateUserSettings(
    userId: Types.ObjectId,
    update: SettingsUpdate,
  ): Promise<UserSettings> {
    try {
      const validatedUpdates = this.validateSettingsUpdate(update);
      const processedUpdate = this.applyBusinessRules(validatedUpdates);

      const updatedSettings = await SettingsRepo.updateByUserId(
        userId,
        processedUpdate,
      );

      if (!updatedSettings) {
        throw new Error('Settings not found for user');
      }

      //log the update for audit trial
      console.log(`Settings updated for user: ${userId}`, {
        updatedFields: Object.keys(processedUpdate),
        timestamp: new Date().toISOString(),
      });

      // Handle side effects (like sending notifications about important changes)
      await this.handleSettingsUpdateSideEffects(
        userId,
        processedUpdate,
        updatedSettings,
      );

      return updatedSettings;
    } catch (error) {
      console.error(`Setting service error - updateUserSettings`, error);
      throw error;
    }
  }

  async updateSettingsSection(
    userId: Types.ObjectId,
    section: keyof SettingsUpdate,
    sectionUpdate: any,
  ): Promise<UserSettings> {
    try {
      // Create update object with only the specific section
      const updates: SettingsUpdate = {
        [section]: sectionUpdate,
      };

      return await this.updateUserSettings(userId, updates);
    } catch (error) {
      console.error(
        `Settings Service error - updateSettingsSection (${section})`,
        error,
      );
      throw error;
    }
  }

  async resetUserSettings(userId: Types.ObjectId): Promise<UserSettings> {
    try {
      const resetSettings = await SettingsRepo.resetToDefault(userId);
      if (!resetSettings) {
        throw new Error('Settings not found for user');
      }
      console.log(`Settings reset to default for user: ${userId}`);

      await this.notifyUserAboutSettingsReset(userId);

      return resetSettings;
    } catch (error) {
      console.error('Settings service error - resetUserSettings', error);
      throw error;
    }
  }

  private async handleSettingsUpdateSideEffects(
    userId: Types.ObjectId,
    updates: SettingsUpdate,
    newSettings: UserSettings,
  ): Promise<void> {
    try {
      //if email notifications are disabled
      if (updates.notifications?.email?.enabled === false) {
        await this.sendEmailNotificationDisabledConfirmation(userId);
      }

      //if privacy settings changed to private, audit the change
      if (updates.privacy?.profileVisibility === 'private') {
        await this.auditPrivacyChange(userId, 'profile_made_private');
      }

      //if theme changed, you might want to preload theme-specific assets
      if (updates.interface?.theme) {
        await this.preloadThemeAssets(updates.interface.theme);
      }

      //update any cache data that depends on these settings
      await this.invalidateUserCache(userId);
      console.log(newSettings);
    } catch (error) {
      console.error('Error handling settings update side effects', error);
      throw error;
    }
  }

  private applyBusinessRules(updates: SettingsUpdate): SettingsUpdate {
    const processedUpdates = { ...updates };

    //Business rule: if user sets profile to private, disable email marketing
    if (updates.privacy?.profileVisibility === 'private') {
      if (!processedUpdates.notifications) {
        processedUpdates.notifications = {};
      }
      if (!processedUpdates.notifications.email) {
        processedUpdates.notifications.email = { marketing: false } as any;
      }
    }

    //Business rule: if User disables Ai suggestion, also disable auto scheduling
    if (updates.content?.aiSuggestion === false) {
      if (!processedUpdates.content) {
        processedUpdates.content = {};
      }
      processedUpdates.content.autoScheduling = false;
    }

    //Business rule: ensure at least one default platform is selected

    if (updates.content?.defaultPlatforms) {
      if (updates.content.defaultPlatforms.length === 0) {
        processedUpdates.content!.defaultPlatforms = ['linkedIn'];
      }
    }
    return processedUpdates;
  }

  async exportUserSettings(userId: Types.ObjectId): Promise<object> {
    try {
      const settings = await SettingsRepo.findByUserId(userId);

      if (!settings) {
        throw new Error('Settings not found for user');
      }

      // remove sensitive data and format for export

      const exportData = {
        profile: settings.profile,
        notifications: settings.notifications,
        privacy: settings.privacy,
        content: settings.content,
        interface: settings.interface,
        exportedAt: new Date().toISOString(),
        exportVersion: '1.0',
      };

      console.log(`Settings exported for user: ${userId}`);

      return exportData;
    } catch (error) {
      console.error('Settins Service error - exportUserSettings:', error);
      throw error;
    }
  }

  async updateTheme(
    userId: Types.ObjectId,
    theme: 'light' | 'dark' | 'system',
  ): Promise<UserSettings> {
    try {
      const updatedTheme = await this.updateSettingsSection(
        userId,
        'interface',
        { theme },
      );
      return updatedTheme;
    } catch (error) {
      console.error('Settings service error - updateTheme:', error);
      throw error;
    }
  }

  async updateNotificationPreference(
    userId: Types.ObjectId,
    notificationUpdates: SettingsUpdate['notifications'],
  ): Promise<UserSettings> {
    try {
      // Validate that we're not completely disabling all notifications (business rule)
      if (notificationUpdates) {
        const hasAnyEnabled =
          notificationUpdates.email?.enabled ||
          notificationUpdates.push?.enabled ||
          notificationUpdates.inApp?.enabled;

        if (!hasAnyEnabled) {
          console.warn(
            `User ${userId} attempting to disable all notifications`,
          );
          // You might want to prevent this or require additional confirmation
        }
      }
      console.log('hjdhjbfskfjkfjkjkbh');

      return await this.updateSettingsSection(
        userId,
        'notifications',
        notificationUpdates,
      );
    } catch (error) {
      console.error(
        'Settings service error - updateNotificationPreferences:',
        error,
      );
      throw error;
    }
  }

  async getMultipleUserSettings(
    filter: SettingFilters = {},
    page: number = 1,
    limit: number = 20,
  ): Promise<{ settings: UserSettings[]; total: number }> {
    try {
      const [settings, total] = await Promise.all([
        SettingsRepo.findWithFilters(filter, page, limit),
        SettingsRepo.count(filter),
      ]);
      return { settings, total };
    } catch (error) {
      console.error('Settings service error - getMultipleUserSettings', error);
      throw error;
    }
  }

  private validateSettingsUpdate(updates: SettingsUpdate): SettingsUpdate {
    const validatedUpdates: SettingsUpdate = {};

    console.log(
      '🔍 Validation - Input updates:',
      JSON.stringify(updates, null, 2),
    );

    //validate profile update
    if (updates.profile) {
      console.log('🔍 Validation - Processing profile updates');
      validatedUpdates.profile = {};

      if (updates.profile.displayName !== undefined) {
        if (
          typeof updates.profile.displayName === 'string' &&
          updates.profile.displayName.length <= 20
        ) {
          validatedUpdates.profile.displayName =
            updates.profile.displayName.trim();
        } else {
          throw new Error(
            'Display name must be a string with maximum 20 characters',
          );
        }
      }

      if (updates.profile.bio !== undefined) {
        if (
          typeof updates.profile.bio === 'string' &&
          updates.profile.bio.length <= 500
        ) {
          validatedUpdates.profile.bio = updates.profile.bio.trim();
        } else {
          throw new Error('Bio must be a string with maximum 500 characters');
        }
      }

      if (updates.profile.website !== undefined) {
        if (
          updates.profile.website === '' ||
          /^https?:\/\/.+/.test(updates.profile.website)
        ) {
          validatedUpdates.profile.website = updates.profile.website;
        } else {
          throw new Error(
            'Website must be a valid URL starting with http:// or https://',
          );
        }
      }
      //validate other profile fields...
      const profileFields: ProfileKey[] = [
        'timezone',
        'language',
        'dateFormat',
        'timeFormat',
        'location',
      ];

      profileFields.forEach((field) => {
        const value = updates.profile?.[field];
        if (value !== undefined) {
          (validatedUpdates.profile as Record<ProfileKey, any>)[field] = value;
        }
        console.log(
          '🔍 Validation - Profile validated:',
          JSON.stringify(validatedUpdates.profile, null, 2),
        );
      });
    }

    // validate other sections(notifications, privacy, content, interface)

    const sectionFields: (keyof SettingsUpdate)[] = [
      'notifications',
      'privacy',
      'content',
      'interface',
      'integrations',
    ];

    sectionFields.forEach((section) => {
      const value = updates[section];
      if (value !== undefined) {
        validatedUpdates[section] = value;
      }
    });
    console.log(
      '🔍 Validation - Privacy validated:',
      JSON.stringify(validatedUpdates.privacy, null, 2),
    );
    return validatedUpdates;
  }

  // Placeholder methods for side effects (implement based on your needs)
  private async notifyUserAboutSettingsReset(
    userId: Types.ObjectId,
  ): Promise<void> {
    console.log(`TODO: Send settings reset notification to user ${userId}`);
  }

  private async sendEmailNotificationDisabledConfirmation(
    userId: Types.ObjectId,
  ): Promise<void> {
    console.log(
      `TODO: Send email confirmation to user ${userId} about disabled notifications`,
    );
  }

  private async auditPrivacyChange(
    userId: Types.ObjectId,
    action: string,
  ): Promise<void> {
    console.log(`TODO: Audit privacy change for user ${userId}: ${action}`);
  }

  private async preloadThemeAssets(theme: string): Promise<void> {
    console.log(`TODO: Preload assets for theme: ${theme}`);
  }

  private async invalidateUserCache(userId: Types.ObjectId): Promise<void> {
    console.log(`TODO: Invalidate cache for user ${userId}`);
  }
}
