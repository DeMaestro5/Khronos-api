import { getJson, setJsonWithTTL, flushByPattern } from '../query';
import { DynamicKey, getUserCacheKey, getPlatformCacheKey } from '../keys';
import Logger from '../../core/Logger';

interface CachedAPIResponse<T> {
  data: T;
  cachedAt: Date;
  expiresAt: Date;
  apiProvider: string;
  requestHash?: string; // Hash of request parameters for cache busting
}

export class ExternalAPICache {
  // Cache TTL values (in seconds)
  private static readonly LLM_RESPONSE_TTL = 60 * 60; // 1 hour
  private static readonly SOCIAL_MEDIA_TTL = 5 * 60; // 5 minutes
  private static readonly EMBEDDINGS_TTL = 24 * 60 * 60; // 24 hours
  private static readonly TRENDS_TTL = 15 * 60; // 15 minutes
  private static readonly SEARCH_RESULTS_TTL = 30 * 60; // 30 minutes

  /**
   * **LLM Response Caching**
   *
   * Why 1 hour? LLM responses are expensive to generate (cost and time) and often
   * the same prompts are used repeatedly. 1 hour provides significant cost savings
   * while still allowing for content evolution.
   */
  static async getLLMResponse(
    prompt: string,
    provider: string,
    model?: string,
  ): Promise<any | null> {
    try {
      const promptHash = this.hashString(prompt);
      const key = getUserCacheKey(
        DynamicKey.CHAT_RESPONSE,
        `${provider}_${model || 'default'}_${promptHash}`,
      );
      const cached = await getJson<CachedAPIResponse<any>>(key);

      if (cached && new Date() < new Date(cached.expiresAt)) {
        Logger.info(
          `Cache HIT for LLM response - Provider: ${provider}, Model: ${model}`,
        );
        return cached.data;
      }

      Logger.info(
        `Cache MISS for LLM response - Provider: ${provider}, Model: ${model}`,
      );
      return null;
    } catch (error) {
      Logger.error('Error getting cached LLM response:', error);
      return null;
    }
  }

  static async setLLMResponse(
    prompt: string,
    provider: string,
    response: any,
    model?: string,
  ): Promise<void> {
    try {
      const promptHash = this.hashString(prompt);
      const key = getUserCacheKey(
        DynamicKey.CHAT_RESPONSE,
        `${provider}_${model || 'default'}_${promptHash}`,
      );
      const cachedData: CachedAPIResponse<any> = {
        data: response,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + this.LLM_RESPONSE_TTL * 1000),
        apiProvider: provider,
        requestHash: promptHash,
      };

      await setJsonWithTTL(key, cachedData, this.LLM_RESPONSE_TTL);
      Logger.info(
        `Cached LLM response for provider: ${provider}, model: ${model}`,
      );
    } catch (error) {
      Logger.error('Error caching LLM response:', error);
    }
  }

  /**
   * **Social Media API Caching**
   *
   * Why 5 minutes? Social media metrics change frequently but making API calls
   * on every request would quickly hit rate limits. 5 minutes provides real-time
   * feel while respecting API limits.
   */
  static async getSocialMediaMetrics(
    contentId: string,
    platform: string,
    accountId?: string,
  ): Promise<any | null> {
    try {
      const key = getUserCacheKey(
        DynamicKey.API_RESPONSE,
        `social_${platform}_${contentId}_${accountId || 'default'}`,
      );
      const cached = await getJson<CachedAPIResponse<any>>(key);

      if (cached && new Date() < new Date(cached.expiresAt)) {
        Logger.info(
          `Cache HIT for social media metrics - Platform: ${platform}, Content: ${contentId}`,
        );
        return cached.data;
      }

      Logger.info(
        `Cache MISS for social media metrics - Platform: ${platform}, Content: ${contentId}`,
      );
      return null;
    } catch (error) {
      Logger.error('Error getting cached social media metrics:', error);
      return null;
    }
  }

  static async setSocialMediaMetrics(
    contentId: string,
    platform: string,
    metrics: any,
    accountId?: string,
  ): Promise<void> {
    try {
      const key = getUserCacheKey(
        DynamicKey.API_RESPONSE,
        `social_${platform}_${contentId}_${accountId || 'default'}`,
      );
      const cachedData: CachedAPIResponse<any> = {
        data: metrics,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + this.SOCIAL_MEDIA_TTL * 1000),
        apiProvider: platform,
      };

      await setJsonWithTTL(key, cachedData, this.SOCIAL_MEDIA_TTL);
      Logger.info(
        `Cached social media metrics for platform: ${platform}, content: ${contentId}`,
      );
    } catch (error) {
      Logger.error('Error caching social media metrics:', error);
    }
  }

  /**
   * **Embeddings Caching**
   *
   * Why 24 hours? Embeddings are computationally expensive and the vector
   * representation of text doesn't change unless the text changes. 24 hours
   * provides excellent performance with minimal staleness risk.
   */
  static async getEmbeddings(
    text: string,
    provider: string,
    model?: string,
  ): Promise<number[] | null> {
    try {
      const textHash = this.hashString(text);
      const key = getUserCacheKey(
        DynamicKey.EMBEDDINGS,
        `${provider}_${model || 'default'}_${textHash}`,
      );
      const cached = await getJson<CachedAPIResponse<number[]>>(key);

      if (cached && new Date() < new Date(cached.expiresAt)) {
        Logger.info(
          `Cache HIT for embeddings - Provider: ${provider}, Model: ${model}`,
        );
        return cached.data;
      }

      Logger.info(
        `Cache MISS for embeddings - Provider: ${provider}, Model: ${model}`,
      );
      return null;
    } catch (error) {
      Logger.error('Error getting cached embeddings:', error);
      return null;
    }
  }

  static async setEmbeddings(
    text: string,
    provider: string,
    embeddings: number[],
    model?: string,
  ): Promise<void> {
    try {
      const textHash = this.hashString(text);
      const key = getUserCacheKey(
        DynamicKey.EMBEDDINGS,
        `${provider}_${model || 'default'}_${textHash}`,
      );
      const cachedData: CachedAPIResponse<number[]> = {
        data: embeddings,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + this.EMBEDDINGS_TTL * 1000),
        apiProvider: provider,
        requestHash: textHash,
      };

      await setJsonWithTTL(key, cachedData, this.EMBEDDINGS_TTL);
      Logger.info(
        `Cached embeddings for provider: ${provider}, model: ${model}, text length: ${text.length}`,
      );
    } catch (error) {
      Logger.error('Error caching embeddings:', error);
    }
  }

  /**
   * **External Trends API Caching**
   *
   * Why 15 minutes? External trends (Google Trends, BuzzSumo, etc.) are rate
   * limited and expensive. 15 minutes provides fresh trend data while minimizing
   * API costs and respecting rate limits.
   */
  static async getExternalTrends(
    platform: string,
    region?: string,
    category?: string,
  ): Promise<any | null> {
    try {
      const key = getPlatformCacheKey(
        DynamicKey.API_RESPONSE,
        `trends_${platform}_${region || 'global'}_${category || 'all'}`,
      );
      const cached = await getJson<CachedAPIResponse<any>>(key);

      if (cached && new Date() < new Date(cached.expiresAt)) {
        Logger.info(
          `Cache HIT for external trends - Platform: ${platform}, Region: ${region}`,
        );
        return cached.data;
      }

      Logger.info(
        `Cache MISS for external trends - Platform: ${platform}, Region: ${region}`,
      );
      return null;
    } catch (error) {
      Logger.error('Error getting cached external trends:', error);
      return null;
    }
  }

  static async setExternalTrends(
    platform: string,
    trends: any,
    region?: string,
    category?: string,
  ): Promise<void> {
    try {
      const key = getPlatformCacheKey(
        DynamicKey.API_RESPONSE,
        `trends_${platform}_${region || 'global'}_${category || 'all'}`,
      );
      const cachedData: CachedAPIResponse<any> = {
        data: trends,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + this.TRENDS_TTL * 1000),
        apiProvider: platform,
      };

      await setJsonWithTTL(key, cachedData, this.TRENDS_TTL);
      Logger.info(
        `Cached external trends for platform: ${platform}, region: ${region}`,
      );
    } catch (error) {
      Logger.error('Error caching external trends:', error);
    }
  }

  /**
   * **Search Results Caching**
   *
   * Why 30 minutes? Search results from external services (like content research)
   * provide value for a reasonable time but need freshness for accuracy.
   */
  static async getSearchResults(
    query: string,
    provider: string,
    filters?: Record<string, any>,
  ): Promise<any | null> {
    try {
      const queryHash = this.hashString(query + JSON.stringify(filters || {}));
      const key = getUserCacheKey(
        DynamicKey.API_RESPONSE,
        `search_${provider}_${queryHash}`,
      );
      const cached = await getJson<CachedAPIResponse<any>>(key);

      if (cached && new Date() < new Date(cached.expiresAt)) {
        Logger.info(
          `Cache HIT for search results - Provider: ${provider}, Query: ${query.substring(
            0,
            50,
          )}...`,
        );
        return cached.data;
      }

      Logger.info(
        `Cache MISS for search results - Provider: ${provider}, Query: ${query.substring(
          0,
          50,
        )}...`,
      );
      return null;
    } catch (error) {
      Logger.error('Error getting cached search results:', error);
      return null;
    }
  }

  static async setSearchResults(
    query: string,
    provider: string,
    results: any,
    filters?: Record<string, any>,
  ): Promise<void> {
    try {
      const queryHash = this.hashString(query + JSON.stringify(filters || {}));
      const key = getUserCacheKey(
        DynamicKey.API_RESPONSE,
        `search_${provider}_${queryHash}`,
      );
      const cachedData: CachedAPIResponse<any> = {
        data: results,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + this.SEARCH_RESULTS_TTL * 1000),
        apiProvider: provider,
        requestHash: queryHash,
      };

      await setJsonWithTTL(key, cachedData, this.SEARCH_RESULTS_TTL);
      Logger.info(
        `Cached search results for provider: ${provider}, query: ${query.substring(
          0,
          50,
        )}...`,
      );
    } catch (error) {
      Logger.error('Error caching search results:', error);
    }
  }

  /**
   * **Cache Invalidation Methods**
   */
  static async invalidateLLMCache(provider?: string): Promise<void> {
    try {
      const pattern = provider
        ? `CHAT_RESPONSE_${provider}*`
        : 'CHAT_RESPONSE_*';
      await flushByPattern(pattern);
      Logger.info(
        `Invalidated LLM cache${provider ? ` for provider: ${provider}` : ''}`,
      );
    } catch (error) {
      Logger.error('Error invalidating LLM cache:', error);
    }
  }

  static async invalidateSocialMediaCache(platform?: string): Promise<void> {
    try {
      const pattern = platform
        ? `API_RESPONSE_social_${platform}*`
        : 'API_RESPONSE_social_*';
      await flushByPattern(pattern);
      Logger.info(
        `Invalidated social media cache${
          platform ? ` for platform: ${platform}` : ''
        }`,
      );
    } catch (error) {
      Logger.error('Error invalidating social media cache:', error);
    }
  }

  static async invalidateEmbeddingsCache(provider?: string): Promise<void> {
    try {
      const pattern = provider ? `EMBEDDINGS_${provider}*` : 'EMBEDDINGS_*';
      await flushByPattern(pattern);
      Logger.info(
        `Invalidated embeddings cache${
          provider ? ` for provider: ${provider}` : ''
        }`,
      );
    } catch (error) {
      Logger.error('Error invalidating embeddings cache:', error);
    }
  }

  /**
   * **Utility Methods**
   */
  private static hashString(str: string): string {
    // Simple hash function for creating consistent cache keys
    let hash = 0;
    if (str.length === 0) return hash.toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * **Cache Statistics**
   */
  static async getAPICallsSaved(): Promise<{
    llm: number;
    socialMedia: number;
    embeddings: number;
    trends: number;
    search: number;
  }> {
    try {
      // This is a simplified implementation
      // In production, you'd track cache hits vs misses
      return {
        llm: 0,
        socialMedia: 0,
        embeddings: 0,
        trends: 0,
        search: 0,
      };
    } catch (error) {
      Logger.error('Error getting API calls saved stats:', error);
      return { llm: 0, socialMedia: 0, embeddings: 0, trends: 0, search: 0 };
    }
  }

  /**
   * **Cost Savings Estimation**
   *
   * Estimate how much money caching has saved in API costs
   */
  static async estimateCostSavings(): Promise<{
    totalSaved: number;
    currency: string;
    breakdown: {
      llm: number;
      socialMedia: number;
      embeddings: number;
      trends: number;
    };
  }> {
    try {
      // Approximate API costs (in USD)
      const costs = {
        llmCallCost: 0.002, // $0.002 per call
        socialMediaCallCost: 0.001, // $0.001 per call
        embeddingCallCost: 0.0004, // $0.0004 per embedding
        trendsCallCost: 0.01, // $0.01 per trends call
      };

      const savedCalls = await this.getAPICallsSaved();

      const breakdown = {
        llm: savedCalls.llm * costs.llmCallCost,
        socialMedia: savedCalls.socialMedia * costs.socialMediaCallCost,
        embeddings: savedCalls.embeddings * costs.embeddingCallCost,
        trends: savedCalls.trends * costs.trendsCallCost,
      };

      const totalSaved = Object.values(breakdown).reduce(
        (sum, cost) => sum + cost,
        0,
      );

      return {
        totalSaved,
        currency: 'USD',
        breakdown,
      };
    } catch (error) {
      Logger.error('Error estimating cost savings:', error);
      return {
        totalSaved: 0,
        currency: 'USD',
        breakdown: { llm: 0, socialMedia: 0, embeddings: 0, trends: 0 },
      };
    }
  }
}
