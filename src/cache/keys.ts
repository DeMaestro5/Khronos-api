export enum Key {
  // Analytics & Metrics
  ANALYTICS_OVERVIEW = 'ANALYTICS_OVERVIEW',
  TRENDING_TOPICS = 'TRENDING_TOPICS',
  INDUSTRY_INSIGHTS = 'INDUSTRY_INSIGHTS',
  REAL_TIME_METRICS = 'REAL_TIME_METRICS',

  // User Data
  USER_CONTENT_LIST = 'USER_CONTENT_LIST',
  USER_SETTINGS = 'USER_SETTINGS',
  USER_CHAT_SESSIONS = 'USER_CHAT_SESSIONS',
  USER_CALENDAR_EVENTS = 'USER_CALENDAR_EVENTS',

  // External API Responses
  SOCIAL_MEDIA_METRICS = 'SOCIAL_MEDIA_METRICS',
  LLM_RESPONSES = 'LLM_RESPONSES',
  ML_PREDICTIONS = 'ML_PREDICTIONS',
  EXTERNAL_TRENDS = 'EXTERNAL_TRENDS',
}

export enum DynamicKey {
  // User-specific cache keys
  USER_ANALYTICS = 'USER_ANALYTICS',
  USER_CONTENT = 'USER_CONTENT',
  USER_SESSIONS = 'USER_SESSIONS',
  USER_CALENDAR = 'USER_CALENDAR',
  USER_NOTIFICATIONS = 'USER_NOTIFICATIONS',
  USER_SETTINGS = 'USER_SETTINGS',

  // Content-specific cache keys
  CONTENT_METRICS = 'CONTENT_METRICS',
  CONTENT_PREDICTIONS = 'CONTENT_PREDICTIONS',
  CONTENT_ANALYTICS = 'CONTENT_ANALYTICS',
  CONTENT_INSIGHTS = 'CONTENT_INSIGHTS',

  // Platform-specific cache keys
  PLATFORM_TRENDS = 'PLATFORM_TRENDS',
  PLATFORM_METRICS = 'PLATFORM_METRICS',

  // API Response cache keys
  API_RESPONSE = 'API_RESPONSE',
  EMBEDDINGS = 'EMBEDDINGS',
  CHAT_RESPONSE = 'CHAT_RESPONSE',
}

export type DynamicKeyType = `${DynamicKey}_${string}`;

export function getDynamicKey(key: DynamicKey, suffix: string): DynamicKeyType {
  const dynamic: DynamicKeyType = `${key}_${suffix}`;
  return dynamic;
}

// Helper functions for creating specific cache keys
export function getUserCacheKey(
  key: DynamicKey,
  userId: string,
): DynamicKeyType {
  return getDynamicKey(key, userId);
}

export function getContentCacheKey(
  key: DynamicKey,
  contentId: string,
): DynamicKeyType {
  return getDynamicKey(key, contentId);
}

export function getPlatformCacheKey(
  key: DynamicKey,
  platform: string,
): DynamicKeyType {
  return getDynamicKey(key, platform);
}

export function getTimestampedKey(
  key: DynamicKey,
  identifier: string,
  timestamp?: Date,
): DynamicKeyType {
  const time = timestamp ? timestamp.getTime() : Date.now();
  return getDynamicKey(key, `${identifier}_${time}`);
}
