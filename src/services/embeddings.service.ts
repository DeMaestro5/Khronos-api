import { OpenAIEmbeddings } from '@langchain/openai';
import { GoogleGenAI } from '@google/genai';
import { config } from '../config';
import Logger from '../core/Logger';

export enum EmbeddingProvider {
  OPENAI = 'openai',
  GOOGLE = 'google',
}

export interface EmbeddingResult {
  embeddings: number[][];
  provider: EmbeddingProvider;
}

export class UnifiedEmbeddingService {
  private openaiEmbeddings: OpenAIEmbeddings | null = null;
  private googleAI: GoogleGenAI | null = null;
  private primaryProvider: EmbeddingProvider;
  private fallbackProvider: EmbeddingProvider;

  constructor(primaryProvider: EmbeddingProvider = EmbeddingProvider.GOOGLE) {
    this.primaryProvider = primaryProvider;
    this.fallbackProvider =
      primaryProvider === EmbeddingProvider.OPENAI
        ? EmbeddingProvider.GOOGLE
        : EmbeddingProvider.OPENAI;

    // Initialize services based on available API keys
    if (config.openai.apiKey) {
      this.openaiEmbeddings = new OpenAIEmbeddings();
    }
    if (config.gemini.apiKey) {
      this.googleAI = new GoogleGenAI({ apiKey: config.gemini.apiKey });
    }

    // Adjust providers based on what's actually available
    if (!config.gemini.apiKey && primaryProvider === EmbeddingProvider.GOOGLE) {
      Logger.warn(
        'Gemini API key not found, switching to OpenAI as primary for embeddings',
      );
      this.primaryProvider = EmbeddingProvider.OPENAI;
      this.fallbackProvider = EmbeddingProvider.GOOGLE;
    }
    if (!config.openai.apiKey && primaryProvider === EmbeddingProvider.OPENAI) {
      Logger.warn(
        'OpenAI API key not found, switching to Google as primary for embeddings',
      );
      this.primaryProvider = EmbeddingProvider.GOOGLE;
      this.fallbackProvider = EmbeddingProvider.OPENAI;
    }
  }

  private async generateOpenAIEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.openaiEmbeddings) {
      throw new Error('OpenAI embeddings service not available');
    }

    try {
      const embeddings = await this.openaiEmbeddings.embedDocuments(texts);
      return embeddings;
    } catch (error: any) {
      Logger.error('OpenAI embeddings failed:', error);
      throw error;
    }
  }

  private async generateGoogleEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.googleAI) {
      throw new Error('Google AI service not available');
    }

    try {
      const embeddings: number[][] = [];

      // Process each text individually (Google API might not support batch processing)
      for (const text of texts) {
        const response = await this.googleAI.models.embedContent({
          model: 'gemini-embedding-exp-03-07',
          contents: text,
        });

        if (response.embeddings && response.embeddings.length > 0) {
          // Extract the actual embedding values from the response
          const embedding = response.embeddings[0];
          if (embedding && embedding.values) {
            embeddings.push(embedding.values);
          } else {
            throw new Error('No embedding values returned from Google API');
          }
        } else {
          throw new Error('No embeddings returned from Google API');
        }
      }

      return embeddings;
    } catch (error: any) {
      Logger.error('Google embeddings failed:', error);
      throw error;
    }
  }

  async embedDocuments(texts: string[]): Promise<EmbeddingResult> {
    const primaryService =
      this.primaryProvider === EmbeddingProvider.OPENAI
        ? this.openaiEmbeddings
        : this.googleAI;
    const fallbackService =
      this.fallbackProvider === EmbeddingProvider.OPENAI
        ? this.openaiEmbeddings
        : this.googleAI;

    // Try primary provider first
    if (primaryService) {
      try {
        Logger.info(`Attempting embeddings with ${this.primaryProvider}`);
        let embeddings: number[][];

        if (this.primaryProvider === EmbeddingProvider.OPENAI) {
          embeddings = await this.generateOpenAIEmbeddings(texts);
        } else {
          embeddings = await this.generateGoogleEmbeddings(texts);
        }

        return {
          embeddings,
          provider: this.primaryProvider,
        };
      } catch (error: any) {
        Logger.warn(
          `${this.primaryProvider} embeddings failed:`,
          error.message,
        );

        // Check if it's a quota/rate limit error for OpenAI
        if (
          this.primaryProvider === EmbeddingProvider.OPENAI &&
          (error.message?.includes('quota') ||
            error.message?.includes('rate limit') ||
            error.message?.includes('429'))
        ) {
          Logger.info(
            `OpenAI embeddings quota exceeded, switching to ${this.fallbackProvider}`,
          );
        }
      }
    }

    // Try fallback provider
    if (fallbackService) {
      try {
        Logger.info(
          `Attempting embeddings with ${this.fallbackProvider} as fallback`,
        );
        let embeddings: number[][];

        if (this.fallbackProvider === EmbeddingProvider.OPENAI) {
          embeddings = await this.generateOpenAIEmbeddings(texts);
        } else {
          embeddings = await this.generateGoogleEmbeddings(texts);
        }

        return {
          embeddings,
          provider: this.fallbackProvider,
        };
      } catch (error: any) {
        Logger.error(`Both embedding providers failed:`, error.message);
        throw new Error(`All embedding providers failed: ${error.message}`);
      }
    }

    throw new Error('No available embedding providers');
  }

  async embedQuery(text: string): Promise<EmbeddingResult> {
    const result = await this.embedDocuments([text]);
    return {
      embeddings: [result.embeddings[0]],
      provider: result.provider,
    };
  }

  // Get current provider status
  getProviderStatus(): {
    primary: EmbeddingProvider;
    fallback: EmbeddingProvider;
    available: EmbeddingProvider[];
  } {
    const available: EmbeddingProvider[] = [];
    if (this.openaiEmbeddings) available.push(EmbeddingProvider.OPENAI);
    if (this.googleAI) available.push(EmbeddingProvider.GOOGLE);

    return {
      primary: this.primaryProvider,
      fallback: this.fallbackProvider,
      available,
    };
  }

  // Method to manually switch primary provider
  switchPrimaryProvider(provider: EmbeddingProvider): void {
    if (
      (provider === EmbeddingProvider.OPENAI && this.openaiEmbeddings) ||
      (provider === EmbeddingProvider.GOOGLE && this.googleAI)
    ) {
      this.primaryProvider = provider;
      this.fallbackProvider =
        provider === EmbeddingProvider.OPENAI
          ? EmbeddingProvider.GOOGLE
          : EmbeddingProvider.OPENAI;
      Logger.info(`Switched primary embedding provider to ${provider}`);
    } else {
      Logger.warn(`Cannot switch to ${provider}: service not available`);
    }
  }
}
