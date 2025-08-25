import { Types } from 'mongoose';
import {
  RealTimeMetrics,
  SocialMediaAPIService,
} from './social-media-apis.service';
import PlatformConnectionRepo from '../database/repository/PlatformConnectionRepo';

export class UserSocialService {
  private api: SocialMediaAPIService;

  constructor() {
    this.api = new SocialMediaAPIService();
  }

  async getYoutubeMetricsForUser(
    userId: Types.ObjectId,
    videoId: string,
  ): Promise<RealTimeMetrics> {
    const conn = await PlatformConnectionRepo.getConnection(userId, 'youtube');
    if (!conn?.isActive) {
      return this.api.getYouTubeRealTimeMetrics(videoId);
    }

    return this.api.getYouTubeRealTimeMetrics(videoId);
  }
}
