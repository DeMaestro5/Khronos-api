import { Types } from 'mongoose';
import { SettingsModel } from '../model/settings';
import {
  UserSettings,
  SettingFilters,
  SettingsUpdate,
  DEFAULT_SETTINGS,
} from '../../types/settings.types';

async function create(userId: Types.ObjectId): Promise<UserSettings> {
  try {
    const newSettings = SettingsModel.createDefaultSettings(userId);
    const savedSettings = await newSettings.save();

    return mapDocumentToSettings(savedSettings);
  } catch (error: any) {
    if (error.code === 11000) {
      const existingSettings = await findByUserId(userId);

      if (existingSettings) {
        return existingSettings;
      }
    }
    throw error;
  }
}

async function findByUserId(
  userId: Types.ObjectId,
): Promise<UserSettings | null> {
  try {
    const settings = await SettingsModel.findOne({ userId }).lean().exec();

    return settings ? mapDocumentToSettings(settings) : null;
  } catch (error) {
    console.error('Error finding seettings by user ID:', error);
    throw error;
  }
}

async function findById(
  settingsId: Types.ObjectId,
): Promise<UserSettings | null> {
  try {
    const settings = await SettingsModel.findById(settingsId).lean().exec();

    return settings ? mapDocumentToSettings(settings) : null;
  } catch (error) {
    console.error('Error finding settings by ID:', error);
    throw error;
  }
}

async function updateByUserId(
  userId: Types.ObjectId,
  updates: SettingsUpdate,
): Promise<UserSettings | null> {
  try {
    const updateData: Record<string, any> = {};

    //handled nested updates properly
    if (updates.profile) {
      Object.entries(updates.profile).forEach(([key, value]) => {
        updateData[`profile.${key}`] = value;
      });
    }

    if (updates.notifications) {
      if (updates.notifications.email) {
        Object.entries(updates.notifications.email).forEach(([key, value]) => {
          updateData[`notifications.email.${key}`] = value;
        });

        if (updates.notifications.push) {
          Object.entries(updates.notifications.push).forEach(([key, value]) => {
            updateData[`notifications.push.${key}`] = value;
          });
        }

        if (updates.notifications.inApp) {
          Object.entries(updates.notifications.inApp).forEach(
            ([key, value]) => {
              updateData[`notifications.inApp.${key}`] = value;
            },
          );
        }
      }
    }

    if (updates.privacy) {
      Object.entries(updates.privacy).forEach(([key, value]) => {
        updateData[`privacy.${key}`] = value;
      });
    }

    if (updates.content) {
      Object.entries(updates.content).forEach(([key, value]) => {
        updateData[`content.${key}`] = value;
      });
    }

    if (updates.interface) {
      Object.entries(updates.interface).forEach(([key, value]) => {
        updateData[`interface.${key}`] = value;
      });
    }

    if (updates.integrations) {
      Object.entries(updates.integrations).forEach(([key, value]) => {
        updateData[`integrations.${key}`] = value;
      });
    }

    console.log(
      '🔍 REPOSITORY - Final MongoDB update object:',
      JSON.stringify(updateData, null, 2),
    );

    //perform the update
    const updateSettings = await SettingsModel.findOneAndUpdate(
      {
        userId,
      },
      {
        $set: updateData,
        $currentDate: { updatedAt: true },
      },
      {
        new: true,
        runValidators: true,
        lean: true,
      },
    ).exec();

    return updateSettings ? mapDocumentToSettings(updateSettings) : null;
  } catch (error) {
    console.error('Error Updating settings:', error);
    throw error;
  }
}

async function getOrCreate(userId: Types.ObjectId): Promise<UserSettings> {
  try {
    // first find an existing settings
    let settings = await findByUserId(userId);

    // if no setting exist, create default ones
    if (!settings) {
      settings = await create(userId);
    }

    return settings;
  } catch (error) {
    console.error('Error getting or creating settings', error);
    throw error;
  }
}

async function resetToDefault(
  userId: Types.ObjectId,
): Promise<UserSettings | null> {
  try {
    console.log(`nendnnnnnfnfn`);
    const settingsDoc = await SettingsModel.findOne({ userId }).exec();

    if (!settingsDoc) {
      return null;
    }

    // use the instance method we defined in the model

    const resetSettings = await settingsDoc.resetToDefaults();

    console.log(`7878774y`);
    return mapDocumentToSettings(resetSettings);
  } catch (error) {
    console.error('Error resetting settings to defaults', error);
    throw error;
  }
}

async function deleteByUserId(userId: Types.ObjectId): Promise<boolean> {
  try {
    const result = await SettingsModel.deleteOne({ userId }).exec();
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting settings', error);
    throw error;
  }
}

async function findWithFilters(
  filters: SettingFilters = {},
  page: number = 1,
  limit: number = 20,
): Promise<UserSettings[]> {
  try {
    const query: any = {};

    // Build query based on filter
    if (filters.userId) {
      query.userId = filters.userId;
    }

    if (filters.createdAfter) {
      query.createdAfter = { $gte: filters.createdAfter };
    }

    if (filters.updatedAfter) {
      query.updatedAfter = { $gte: filters.updatedAfter };
    }

    const settings = await SettingsModel.find(query)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();

    return settings.map(mapDocumentToSettings);
  } catch (error) {
    console.error('Error finding settings with filter', error);
    throw error;
  }
}

async function count(filter: SettingFilters = {}): Promise<number> {
  try {
    const query: any = {};

    if (filter.userId) {
      query.userId = filter.userId;
    }

    if (filter.createdAfter) {
      query.userId = filter.createdAfter;
    }

    if (filter.updatedAfter) {
      query.userId = filter.updatedAfter;
    }

    return await SettingsModel.countDocuments(query).exec();
  } catch (error) {
    console.error('Error counting settings', error);
    throw error;
  }
}

// helper function to convert mongoose document to our UserSettings type
function mapDocumentToSettings(doc: any): UserSettings {
  return {
    userId: doc.userId,
    profile: doc.profile || DEFAULT_SETTINGS.profile,
    notifications: doc.notifications || DEFAULT_SETTINGS.notifications,
    privacy: doc.privacy || DEFAULT_SETTINGS.privacy,
    content: doc.content || DEFAULT_SETTINGS.content,
    interface: doc.interface || DEFAULT_SETTINGS.interface,
    integrations: doc.integration || DEFAULT_SETTINGS.integrations,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export default {
  create,
  findById,
  updateByUserId,
  getOrCreate,
  resetToDefault,
  deleteByUserId,
  findWithFilters,
  findByUserId,
  count,
};
