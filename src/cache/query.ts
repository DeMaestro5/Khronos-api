import cache from '.';
import { DynamicKeyType, Key } from './keys';
import Logger from '../core/Logger';

export enum TYPES {
  LIST = 'list',
  STRING = 'string',
  HASH = 'hash',
  ZSET = 'zset',
  SET = 'set',
}

export async function keyExists(...keys: string[]): Promise<boolean> {
  try {
    return (await cache.exists(keys as any)) ? true : false;
  } catch (error) {
    Logger.error('Cache keyExists error:', error);
    return false;
  }
}

export async function setValue(
  key: Key | DynamicKeyType,
  value: string | number,
  expireAt: Date | null = null,
): Promise<any> {
  try {
    if (expireAt)
      return (cache as any).pSetEx(key as any, expireAt.getTime(), `${value}`);
    else return cache.set(key as any, `${value}`);
  } catch (error) {
    Logger.error(`Cache setValue error for key ${key}:`, error);
    throw error;
  }
}

export async function getValue(
  key: Key | DynamicKeyType,
): Promise<string | null> {
  try {
    return cache.get(key as any);
  } catch (error) {
    Logger.error(`Cache getValue error for key ${key}:`, error);
    return null;
  }
}

export async function delByKey(key: Key | DynamicKeyType): Promise<number> {
  try {
    return cache.del(key as any);
  } catch (error) {
    Logger.error(`Cache delByKey error for key ${key}:`, error);
    return 0;
  }
}

export async function setJson(
  key: Key | DynamicKeyType,
  value: Record<string, unknown>,
  expireAt: Date | null = null,
): Promise<any> {
  try {
    const json = JSON.stringify(value);
    return await setValue(key, json, expireAt);
  } catch (error) {
    Logger.error(`Cache setJson error for key ${key}:`, error);
    throw error;
  }
}

export async function getJson<T>(key: Key | DynamicKeyType): Promise<T | null> {
  try {
    const type = await (cache as any).type?.(key as any);
    if (type && type !== TYPES.STRING) return null;

    const json = await getValue(key);
    if (json) return JSON.parse(json) as T;

    return null;
  } catch (error) {
    Logger.error(`Cache getJson error for key ${key}:`, error);
    return null;
  }
}

export async function setList(
  key: Key | DynamicKeyType,
  list: any[],
  expireAt: Date | null = null,
): Promise<any> {
  try {
    const multi = (cache as any).multi?.() || {
      del: () => {},
      rPush: () => {},
      pExpireAt: () => {},
      exec: async () => [],
    };
    const values = list.map((item) => JSON.stringify(item));
    multi.del(key);
    multi.rPush(key, values);
    if (expireAt) multi.pExpireAt(key, expireAt.getTime());
    return await multi.exec();
  } catch (error) {
    Logger.error(`Cache setList error for key ${key}:`, error);
    throw error;
  }
}

export async function addToList(
  key: Key | DynamicKeyType,
  value: any,
): Promise<number | null> {
  try {
    const type = await (cache as any).type?.(key as any);
    if (type && type !== TYPES.LIST) return null;

    const item = JSON.stringify(value);
    return await (cache as any).rPushX?.(key as any, item);
  } catch (error) {
    Logger.error(`Cache addToList error for key ${key}:`, error);
    return null;
  }
}

export async function getListRange<T>(
  key: Key | DynamicKeyType,
  start = 0,
  end = -1,
): Promise<T[] | null> {
  try {
    const type = await (cache as any).type?.(key as any);
    if (type && type !== TYPES.LIST) return null;

    const list = await (cache as any).lRange?.(key as any, start, end);
    if (!list) return null;

    const data = list.map((entry: string) => JSON.parse(entry) as T);
    return data;
  } catch (error) {
    Logger.error(`Cache getListRange error for key ${key}:`, error);
    return null;
  }
}

export async function setOrderedSet(
  key: Key,
  items: Array<{ score: number; value: any }>,
  expireAt: Date | null = null,
): Promise<any> {
  try {
    const multi = (cache as any).multi?.() || {
      del: () => {},
      zAdd: () => {},
      pExpireAt: () => {},
      exec: async () => [],
    };
    for (const item of items) {
      item.value = JSON.stringify(item.value);
    }
    multi.del(key);
    multi.zAdd(key, items);
    if (expireAt) multi.pExpireAt(key, expireAt.getTime());
    return await multi.exec();
  } catch (error) {
    Logger.error(`Cache setOrderedSet error for key ${key}:`, error);
    throw error;
  }
}

export async function addToOrderedSet(
  key: Key,
  items: Array<{ score: number; value: any }>,
): Promise<number | null> {
  try {
    const type = await (cache as any).type?.(key as any);
    if (type && type !== TYPES.ZSET) return null;

    for (const item of items) {
      item.value = JSON.stringify(item.value);
    }
    return await (cache as any).zAdd?.(key as any, items);
  } catch (error) {
    Logger.error(`Cache addToOrderedSet error for key ${key}:`, error);
    return null;
  }
}

export async function removeFromOrderedSet(
  key: Key,
  ...items: any[]
): Promise<number | null> {
  try {
    const type = await (cache as any).type?.(key as any);
    if (type && type !== TYPES.ZSET) return null;

    items = items.map((item) => JSON.stringify(item));
    return await (cache as any).zRem?.(key as any, items);
  } catch (error) {
    Logger.error(`Cache removeFromOrderedSet error for key ${key}:`, error);
    return null;
  }
}

export async function getOrderedSetRange<T>(
  key: Key,
  start = 0,
  end = -1,
): Promise<{ score: number; value: T }[] | null> {
  try {
    const type = await (cache as any).type?.(key as any);
    if (type && type !== TYPES.ZSET) return null;

    const set = await (cache as any).zRangeWithScores?.(key as any, start, end);

    const data: { score: number; value: T }[] = (set || []).map(
      (entry: { score: number; value: string }) => ({
        score: entry.score,
        value: JSON.parse(entry.value),
      }),
    );
    return data;
  } catch (error) {
    Logger.error(`Cache getOrderedSetRange error for key ${key}:`, error);
    return null;
  }
}

export async function getOrderedSetMemberScore(
  key: Key,
  member: any,
): Promise<number | null> {
  try {
    const type = await (cache as any).type?.(key as any);
    if (type && type !== TYPES.ZSET) return null;

    return await (cache as any).zScore?.(key as any, JSON.stringify(member));
  } catch (error) {
    Logger.error(`Cache getOrderedSetMemberScore error for key ${key}:`, error);
    return null;
  }
}

export async function watch(key: Key | DynamicKeyType): Promise<any> {
  try {
    return await (cache as any).watch?.(key as any);
  } catch (error) {
    Logger.error(`Cache watch error for key ${key}:`, error);
    throw error;
  }
}

export async function unwatch(): Promise<any> {
  try {
    return await (cache as any).unwatch?.();
  } catch (error) {
    Logger.error('Cache unwatch error:', error);
    throw error;
  }
}

export async function expire(
  expireAt: Date,
  key: Key | DynamicKeyType,
): Promise<any> {
  try {
    return await (cache as any).pExpireAt?.(key as any, expireAt.getTime());
  } catch (error) {
    Logger.error(`Cache expire error for key ${key}:`, error);
    throw error;
  }
}

export async function expireMany(
  expireAt: Date,
  ...keys: string[]
): Promise<any> {
  try {
    let script = '';
    for (const key of keys) {
      script += `redis.call('pExpireAt', '${key}',${expireAt.getTime()})`;
    }
    return await (cache as any).eval?.(script);
  } catch (error) {
    Logger.error('Cache expireMany error:', error);
    throw error;
  }
}

// Additional utility functions for better cache management

export async function setWithTTL(
  key: Key | DynamicKeyType,
  value: string | number,
  ttlSeconds: number,
): Promise<any> {
  try {
    return await (cache as any).setEx?.(key as any, ttlSeconds, `${value}`);
  } catch (error) {
    Logger.error(`Cache setWithTTL error for key ${key}:`, error);
    throw error;
  }
}

export async function setJsonWithTTL<T>(
  key: Key | DynamicKeyType,
  value: T,
  ttlSeconds: number,
): Promise<any> {
  try {
    const json = JSON.stringify(value);
    return await (cache as any).setEx?.(key as any, ttlSeconds, json);
  } catch (error) {
    Logger.error(`Cache setJsonWithTTL error for key ${key}:`, error);
    throw error;
  }
}

export async function increment(
  key: Key | DynamicKeyType,
  by: number = 1,
): Promise<number> {
  try {
    return await (cache as any).incrBy?.(key as any, by);
  } catch (error) {
    Logger.error(`Cache increment error for key ${key}:`, error);
    throw error;
  }
}

export async function decrement(
  key: Key | DynamicKeyType,
  by: number = 1,
): Promise<number> {
  try {
    return await (cache as any).decrBy?.(key as any, by);
  } catch (error) {
    Logger.error(`Cache decrement error for key ${key}:`, error);
    throw error;
  }
}

export async function getTTL(key: Key | DynamicKeyType): Promise<number> {
  try {
    return await (cache as any).ttl?.(key as any);
  } catch (error) {
    Logger.error(`Cache getTTL error for key ${key}:`, error);
    return -1;
  }
}

export async function flushByPattern(pattern: string): Promise<void> {
  try {
    const keys = (await (cache as any).keys?.(pattern)) || [];
    if (Array.isArray(keys) && keys.length > 0) {
      await cache.del(keys as any);
    }
  } catch (error) {
    Logger.error(`Cache flushByPattern error for pattern ${pattern}:`, error);
    throw error;
  }
}
