import { LinkupService, LinkupQueryParams } from './linkup.service';

const linkupService = new LinkupService();

export async function getLinkupData(params: LinkupQueryParams) {
  try {
    const results = await linkupService.search(params);
    const insights = await linkupService.getContentInsights(params.query);

    return {
      results,
      insights,
    };
  } catch (error) {
    console.error('Error fetching Linkup data:', error);
    throw error;
  }
}

export async function validateContentWithLinkup(content: string) {
  try {
    return await linkupService.validateContent(content);
  } catch (error) {
    console.error('Error validating content with Linkup:', error);
    throw error;
  }
}
