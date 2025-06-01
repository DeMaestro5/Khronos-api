import { Document } from '@langchain/core/documents';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { config } from '../config';
import Logger from '../core/Logger';
import { Content } from './content.service';
import { AnalyticsMetrics } from './analytics.service';
import { Types } from 'mongoose';

class RAGService {
  private readonly pinecone: Pinecone;
  private readonly embeddings: OpenAIEmbeddings;
  private readonly indexName: string;
  private readonly textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: config.pinecone.apiKey || '',
    });
    this.embeddings = new OpenAIEmbeddings();
    this.indexName = 'content-management-knowledge';
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Check if index exists, if not create it
      const indexList = await this.pinecone.listIndexes();

      if (!indexList.indexes?.some((index) => index.name === this.indexName)) {
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: 1536, // OpenAI embeddings dimension
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1',
            },
          },
        });
        Logger.info(`Created new Pinecone index: ${this.indexName}`);
      }
    } catch (error) {
      Logger.error('Failed to initialize Pinecone', error);
      throw error;
    }
  }

  /**
   * Initialize vector store with content data
   */
  async initializeWithContent(content: Content): Promise<void> {
    try {
      // Convert content data to documents for vectorization
      const documents: Document[] = [];

      // Process content description
      if (content.description) {
        const chunks = await this.textSplitter.splitText(content.description);
        chunks.forEach((chunk) => {
          documents.push(
            new Document({
              pageContent: chunk,
              metadata: {
                contentId: content._id.toString(),
                userId: content.userId,
                dataType: 'description',
                contentType: content.type,
                platform: content.platform,
              },
            }),
          );
        });
      }

      // Process content metadata
      if (content.metadata) {
        const metadataText = JSON.stringify(content.metadata);
        const chunks = await this.textSplitter.splitText(metadataText);
        chunks.forEach((chunk) => {
          documents.push(
            new Document({
              pageContent: chunk,
              metadata: {
                contentId: content._id.toString(),
                userId: content.userId,
                dataType: 'metadata',
                contentType: content.type,
                platform: content.platform,
              },
            }),
          );
        });
      }

      // Store documents in Pinecone
      if (documents.length > 0) {
        const index = this.pinecone.index(this.indexName);
        const vectorStore = await PineconeStore.fromExistingIndex(
          this.embeddings,
          {
            pineconeIndex: index,
            namespace: `content-${content._id.toString()}`,
            textKey: 'text',
          },
        );

        await vectorStore.addDocuments(documents);
        Logger.info(
          `Added ${documents.length} content documents to vector store for content ${content._id}`,
        );
      }
    } catch (error) {
      Logger.error(
        `Failed to initialize vector store with content for content ${content._id}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Add analytics data to the vector store
   */
  async addAnalytics(
    contentId: string,
    analytics: AnalyticsMetrics,
    metadata: Record<string, any>,
  ): Promise<void> {
    try {
      // Create document from analytics data
      const analyticsText = JSON.stringify(analytics);
      const chunks = await this.textSplitter.splitText(analyticsText);
      const documents = chunks.map(
        (chunk) =>
          new Document({
            pageContent: chunk,
            metadata: {
              ...metadata,
              contentId,
              dataType: 'analytics',
              timestamp: new Date().toISOString(),
            },
          }),
      );

      // Store in vector database
      const index = this.pinecone.index(this.indexName);
      const vectorStore = await PineconeStore.fromExistingIndex(
        this.embeddings,
        {
          pineconeIndex: index,
          namespace: `content-${contentId}`,
          textKey: 'text',
        },
      );

      await vectorStore.addDocuments(documents);
      Logger.info(
        `Added analytics with ${documents.length} chunks to vector store for content ${contentId}`,
      );
    } catch (error) {
      Logger.error(
        `Failed to add analytics to vector store for content ${contentId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Query the vector store to retrieve relevant content and insights
   */
  async query(
    query: string,
    limit: number = 5,
    filter?: Record<string, any>,
  ): Promise<Document[]> {
    try {
      const index = this.pinecone.index(this.indexName);
      const vectorStore = await PineconeStore.fromExistingIndex(
        this.embeddings,
        {
          pineconeIndex: index,
          textKey: 'text',
        },
      );

      // If filter is provided, ensure it uses proper Pinecone filter format
      if (filter) {
        // Convert simple key-value pairs to use $eq operator if needed
        for (const key in filter) {
          if (typeof filter[key] !== 'object') {
            filter[key] = { $eq: filter[key] };
          }
        }
      }

      // If filter is provided, use it
      const results = await vectorStore.similaritySearch(query, limit, filter);
      return results;
    } catch (error) {
      Logger.error(`Failed to query vector store`, error);
      throw error;
    }
  }

  /**
   * Find similar content based on description or metadata
   */
  async findSimilarContent(
    content: Content,
    limit: number = 5,
  ): Promise<Document[]> {
    try {
      const query = content.description || JSON.stringify(content.metadata);
      const filter = {
        contentType: content.type,
        platform: content.platform,
      };

      return await this.query(query, limit, filter);
    } catch (error) {
      Logger.error(
        `Failed to find similar content for content ${content._id}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get content recommendations based on performance
   */
  async getContentRecommendations(
    platform: string,
    contentType: string,
    limit: number = 5,
  ): Promise<Document[]> {
    try {
      const query = 'high performing content with good engagement';
      const filter = {
        dataType: 'analytics',
        platform,
        contentType,
      };

      return await this.query(query, limit, filter);
    } catch (error) {
      Logger.error(
        `Failed to get content recommendations for ${platform} ${contentType}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Analyze content performance patterns
   */
  async analyzeContentPatterns(
    platform: string,
    contentType: string,
  ): Promise<Document[]> {
    try {
      const query = 'content performance patterns and trends';
      const filter = {
        dataType: 'analytics',
        platform,
        contentType,
      };

      return await this.query(query, 10, filter);
    } catch (error) {
      Logger.error(
        `Failed to analyze content patterns for ${platform} ${contentType}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get version history for a specific content
   */
  async getContentVersions(contentId: Types.ObjectId): Promise<Document[]> {
    try {
      const index = this.pinecone.index(this.indexName);
      const vectorStore = await PineconeStore.fromExistingIndex(
        this.embeddings,
        {
          pineconeIndex: index,
          namespace: `content-${contentId.toString()}`,
          textKey: 'text',
        },
      );

      // Query for all versions of the content
      const results = await vectorStore.similaritySearch(
        'content version history',
        10,
        {
          contentId: contentId.toString(),
          dataType: { $in: ['description', 'metadata'] },
        },
      );

      // Sort by timestamp if available
      return results.sort((a, b) => {
        const timestampA = a.metadata.timestamp || 0;
        const timestampB = b.metadata.timestamp || 0;
        return timestampB - timestampA;
      });
    } catch (error) {
      Logger.error(
        `Failed to get content versions for content ${contentId}`,
        error,
      );
      throw error;
    }
  }
}

export default new RAGService();
