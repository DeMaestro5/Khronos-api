import { Embeddings } from '@langchain/core/embeddings';
import {
  UnifiedEmbeddingService,
  EmbeddingProvider,
} from './embeddings.service';

export class UnifiedLangChainEmbeddings extends Embeddings {
  private unifiedService: UnifiedEmbeddingService;

  constructor(primaryProvider: EmbeddingProvider = EmbeddingProvider.GOOGLE) {
    super({});
    this.unifiedService = new UnifiedEmbeddingService(primaryProvider);
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const result = await this.unifiedService.embedDocuments(texts);
    return result.embeddings;
  }

  async embedQuery(text: string): Promise<number[]> {
    const result = await this.unifiedService.embedQuery(text);
    return result.embeddings[0];
  }

  getProviderStatus() {
    return this.unifiedService.getProviderStatus();
  }

  switchPrimaryProvider(provider: EmbeddingProvider): void {
    this.unifiedService.switchPrimaryProvider(provider);
  }
}
