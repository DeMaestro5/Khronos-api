import { Router, Response } from 'express';
import asyncHandler from '../../helpers/asyncHandler';
import { ProtectedRequest } from '../../types/app-request';
import { SuccessResponse } from '../../core/ApiResponse';
import { UnifiedLLMService, LLMProvider } from '../../services/llm.service';
import { UnifiedLangChainEmbeddings } from '../../services/unified-langchain-embeddings';
import { EmbeddingProvider } from '../../services/embeddings.service';
import authentication from '../../auth/authentication';

const router = Router();
const llmService = new UnifiedLLMService(LLMProvider.GEMINI);
const embeddingService = new UnifiedLangChainEmbeddings(
  EmbeddingProvider.GOOGLE,
);

router.use(authentication);

// Get current LLM provider status
router.get(
  '/status',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const llmStatus = llmService.getProviderStatus();
    const embeddingStatus = embeddingService.getProviderStatus();

    new SuccessResponse(
      'LLM and embedding provider status retrieved successfully',
      {
        llm: llmStatus,
        embeddings: embeddingStatus,
      },
    ).send(res);
  }),
);

// Switch primary LLM provider
router.post(
  '/switch/:provider',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const provider = req.params.provider as LLMProvider;

    if (!Object.values(LLMProvider).includes(provider)) {
      throw new Error(
        `Invalid provider: ${provider}. Valid providers are: ${Object.values(
          LLMProvider,
        ).join(', ')}`,
      );
    }

    llmService.switchPrimaryProvider(provider);
    const status = llmService.getProviderStatus();

    new SuccessResponse(
      `Switched to ${provider} provider successfully`,
      status,
    ).send(res);
  }),
);

// Switch primary embedding provider
router.post(
  '/embeddings/switch/:provider',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const provider = req.params.provider as EmbeddingProvider;

    if (!Object.values(EmbeddingProvider).includes(provider)) {
      throw new Error(
        `Invalid embedding provider: ${provider}. Valid providers are: ${Object.values(
          EmbeddingProvider,
        ).join(', ')}`,
      );
    }

    embeddingService.switchPrimaryProvider(provider);
    const status = embeddingService.getProviderStatus();

    new SuccessResponse(
      `Switched to ${provider} embedding provider successfully`,
      status,
    ).send(res);
  }),
);

// Test LLM providers
router.post(
  '/test',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { content = 'Hello world', platform = 'general' } = req.body;

    try {
      const result = await llmService.optimizeContent(content, platform);
      const llmStatus = llmService.getProviderStatus();

      new SuccessResponse('LLM test completed successfully', {
        originalContent: content,
        optimizedContent: result,
        providerStatus: llmStatus,
      }).send(res);
    } catch (error: any) {
      throw new Error(`LLM test failed: ${error.message}`);
    }
  }),
);

// Test embedding providers
router.post(
  '/embeddings/test',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { text = 'Test embedding' } = req.body;

    try {
      const embedding = await embeddingService.embedQuery(text);
      const status = embeddingService.getProviderStatus();

      new SuccessResponse('Embedding test completed successfully', {
        text,
        embeddingDimension: embedding.length,
        embeddingPreview: embedding.slice(0, 5), // Show first 5 values
        providerStatus: status,
      }).send(res);
    } catch (error: any) {
      throw new Error(`Embedding test failed: ${error.message}`);
    }
  }),
);

export default router;
