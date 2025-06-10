import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Types } from 'mongoose';
import {
  SocialMediaAPIService,
  RealTimeMetrics,
} from './social-media-apis.service';
import ContentRepo from '../database/repository/ContentRepo';

interface ConnectedClient {
  userId: Types.ObjectId;
  socketId: string;
  subscribedContent: string[];
  subscribedPlatforms: string[];
  lastActivity: Date;
}

// interface RealTimeUpdate {
//   type: 'metrics' | 'trending' | 'alert' | 'notification';
//   platform: string;
//   contentId?: string;
//   data: any;
//   timestamp: Date;
// }

interface AlertConfig {
  userId: Types.ObjectId;
  triggers: {
    viralThreshold: number;
    engagementSpike: number;
    reachMilestone: number;
    negativesentiment: number;
  };
  notifications: {
    email: boolean;
    push: boolean;
    websocket: boolean;
  };
}

export class RealTimeWebSocketService {
  private io: SocketIOServer;
  private connectedClients: Map<string, ConnectedClient> = new Map();
  private socialMediaService: SocialMediaAPIService;
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private alertConfigs: Map<string, AlertConfig> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.socialMediaService = new SocialMediaAPIService();
    this.setupSocketEvents();
    this.startGlobalDataStreaming();
  }

  private setupSocketEvents(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Authentication
      socket.on(
        'authenticate',
        async (data: { userId: string; token: string }) => {
          try {
            // Verify JWT token here
            const userId = new Types.ObjectId(data.userId);

            const client: ConnectedClient = {
              userId,
              socketId: socket.id,
              subscribedContent: [],
              subscribedPlatforms: [],
              lastActivity: new Date(),
            };

            this.connectedClients.set(socket.id, client);
            socket.emit('authenticated', { success: true });

            // Send initial data
            await this.sendInitialData(socket, userId);
          } catch (error) {
            socket.emit('authentication_error', { error: 'Invalid token' });
            socket.disconnect();
          }
        },
      );

      // Subscribe to content real-time updates
      socket.on('subscribe_content', async (data: { contentIds: string[] }) => {
        const client = this.connectedClients.get(socket.id);
        if (!client) return;

        client.subscribedContent = data.contentIds;
        this.connectedClients.set(socket.id, client);

        // Start real-time monitoring for subscribed content
        await this.startContentMonitoring(socket, data.contentIds);
      });

      // Subscribe to platform trends
      socket.on('subscribe_platforms', (data: { platforms: string[] }) => {
        const client = this.connectedClients.get(socket.id);
        if (!client) return;

        client.subscribedPlatforms = data.platforms;
        this.connectedClients.set(socket.id, client);
      });

      // Configure alerts
      socket.on('configure_alerts', (config: AlertConfig) => {
        const client = this.connectedClients.get(socket.id);
        if (!client) return;

        config.userId = client.userId;
        this.alertConfigs.set(client.userId.toString(), config);
      });

      // Request live metrics
      socket.on(
        'request_live_metrics',
        async (data: { contentId: string; platform: string }) => {
          try {
            const metrics = await this.getLiveMetrics(
              data.contentId,
              data.platform,
            );
            socket.emit('live_metrics', {
              contentId: data.contentId,
              platform: data.platform,
              metrics,
              timestamp: new Date(),
            });
          } catch (error) {
            socket.emit('metrics_error', {
              error: 'Failed to fetch live metrics',
            });
          }
        },
      );

      // Handle heartbeat
      socket.on('heartbeat', () => {
        const client = this.connectedClients.get(socket.id);
        if (client) {
          client.lastActivity = new Date();
          this.connectedClients.set(socket.id, client);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.handleClientDisconnect(socket.id);
      });
    });
  }

  private async sendInitialData(
    socket: any,
    userId: Types.ObjectId,
  ): Promise<void> {
    try {
      // Get user's content
      const contents = await ContentRepo.findByUserId(userId);

      // Send overview of user's content performance
      const overview = {
        totalContent: contents.length,
        platforms: [...new Set(contents.flatMap((c) => c.platform))],
        recentContent: contents.slice(0, 5).map((c) => ({
          id: c._id.toString(),
          title: c.title,
          platforms: c.platform,
          createdAt: c.createdAt,
        })),
      };

      socket.emit('initial_data', overview);

      // Start real-time updates for recent content
      const recentContentIds = contents
        .slice(0, 5)
        .map((c) => c._id.toString());
      await this.startContentMonitoring(socket, recentContentIds);
    } catch (error) {
      console.error('Error sending initial data:', error);
    }
  }

  private async startContentMonitoring(
    socket: any,
    contentIds: string[],
  ): Promise<void> {
    const client = this.connectedClients.get(socket.id);
    if (!client) return;

    // Clear existing intervals for this client
    this.clearClientIntervals(socket.id);

    // Start monitoring each content piece
    for (const contentId of contentIds) {
      const intervalId = setInterval(async () => {
        try {
          await this.monitorContentMetrics(socket, contentId);
        } catch (error) {
          console.error(`Error monitoring content ${contentId}:`, error);
        }
      }, 30000); // Update every 30 seconds

      this.updateIntervals.set(`${socket.id}_${contentId}`, intervalId);
    }
  }

  private async monitorContentMetrics(
    socket: any,
    contentId: string,
  ): Promise<void> {
    try {
      const content = await ContentRepo.findById(new Types.ObjectId(contentId));
      if (!content) return;

      const allMetrics: RealTimeMetrics[] = [];

      // Get real-time metrics for each platform
      for (const platform of content.platform) {
        try {
          const metrics = await this.getLiveMetrics(contentId, platform);
          allMetrics.push(metrics);

          // Check for alerts
          await this.checkAlerts(socket, metrics);
        } catch (error) {
          console.error(
            `Error fetching ${platform} metrics for ${contentId}:`,
            error,
          );
        }
      }

      // Send aggregated metrics update
      socket.emit('content_metrics_update', {
        contentId,
        metrics: allMetrics,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error in content monitoring:', error);
    }
  }

  private async getLiveMetrics(
    contentId: string,
    platform: string,
  ): Promise<RealTimeMetrics> {
    switch (platform) {
      case 'instagram':
        return await this.socialMediaService.getInstagramRealTimeMetrics(
          contentId,
        );
      case 'youtube':
        return await this.socialMediaService.getYouTubeRealTimeMetrics(
          contentId,
        );
      case 'tiktok':
        return await this.socialMediaService.getTikTokRealTimeMetrics(
          contentId,
        );
      case 'linkedin':
        return await this.socialMediaService.getLinkedInRealTimeMetrics(
          contentId,
        );
      case 'twitter':
        return await this.socialMediaService.getTwitterRealTimeMetrics(
          contentId,
        );
      case 'facebook':
        return await this.socialMediaService.getFacebookRealTimeMetrics(
          contentId,
        );
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private async checkAlerts(
    socket: any,
    metrics: RealTimeMetrics,
  ): Promise<void> {
    const client = this.connectedClients.get(socket.id);
    if (!client) return;

    const alertConfig = this.alertConfigs.get(client.userId.toString());
    if (!alertConfig) return;

    const alerts: any[] = [];

    // Check viral threshold
    if (
      metrics.trending.isViral &&
      metrics.trending.trendingScore > alertConfig.triggers.viralThreshold
    ) {
      alerts.push({
        type: 'viral',
        message: `Your ${metrics.platform} content is going viral!`,
        urgency: 'high',
        metrics: {
          views: metrics.metrics.views,
          engagement: metrics.metrics.engagement,
          trendingScore: metrics.trending.trendingScore,
        },
      });
    }

    // Check engagement spike
    if (metrics.metrics.engagement > alertConfig.triggers.engagementSpike) {
      alerts.push({
        type: 'engagement_spike',
        message: `High engagement detected on ${metrics.platform}`,
        urgency: 'medium',
        metrics: {
          engagement: metrics.metrics.engagement,
          engagementRate:
            (metrics.metrics.engagement / Math.max(metrics.metrics.reach, 1)) *
            100,
        },
      });
    }

    // Check reach milestone
    if (metrics.metrics.reach >= alertConfig.triggers.reachMilestone) {
      alerts.push({
        type: 'reach_milestone',
        message: `Reach milestone achieved on ${metrics.platform}`,
        urgency: 'medium',
        metrics: {
          reach: metrics.metrics.reach,
          impressions: metrics.metrics.impressions,
        },
      });
    }

    // Send alerts
    if (alerts.length > 0) {
      socket.emit('alerts', {
        contentId: metrics.contentId,
        platform: metrics.platform,
        alerts,
        timestamp: new Date(),
      });
    }
  }

  private startGlobalDataStreaming(): void {
    // Stream trending data every 5 minutes
    setInterval(
      async () => {
        await this.broadcastTrendingData();
      },
      5 * 60 * 1000,
    );

    // Stream industry insights every 15 minutes
    setInterval(
      async () => {
        await this.broadcastIndustryInsights();
      },
      15 * 60 * 1000,
    );

    // Clean up inactive connections every hour
    setInterval(
      () => {
        this.cleanupInactiveConnections();
      },
      60 * 60 * 1000,
    );
  }

  private async broadcastTrendingData(): Promise<void> {
    const platforms = [
      'instagram',
      'youtube',
      'tiktok',
      'linkedin',
      'twitter',
      'facebook',
    ];

    for (const platform of platforms) {
      try {
        const trendingData =
          await this.socialMediaService.getPlatformTrends(platform);

        // Broadcast to clients subscribed to this platform
        this.connectedClients.forEach((client, socketId) => {
          if (client.subscribedPlatforms.includes(platform)) {
            this.io.to(socketId).emit('trending_update', {
              platform,
              data: trendingData,
              timestamp: new Date(),
            });
          }
        });
      } catch (error) {
        console.error(`Error fetching trending data for ${platform}:`, error);
      }
    }
  }

  private async broadcastIndustryInsights(): Promise<void> {
    // This would involve aggregating data across users and platforms
    const insights = {
      globalEngagementTrends: {
        average: 2.5,
        growth: '+12%',
        topFormats: ['video', 'carousel', 'stories'],
      },
      platformPerformance: {
        instagram: { avgEngagement: 1.22, growth: '+5%' },
        youtube: { avgEngagement: 4.5, growth: '+8%' },
        tiktok: { avgEngagement: 5.3, growth: '+15%' },
        linkedin: { avgEngagement: 2.1, growth: '+3%' },
        twitter: { avgEngagement: 1.8, growth: '+2%' },
        facebook: { avgEngagement: 0.9, growth: '-1%' },
      },
      emergingTrends: [
        'AI-generated content',
        'Short-form video dominance',
        'Community-driven engagement',
      ],
    };

    this.io.emit('industry_insights', {
      insights,
      timestamp: new Date(),
    });
  }

  private cleanupInactiveConnections(): void {
    const cutoffTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

    this.connectedClients.forEach((client, socketId) => {
      if (client.lastActivity < cutoffTime) {
        this.handleClientDisconnect(socketId);
        this.io.sockets.sockets.get(socketId)?.disconnect();
      }
    });
  }

  private handleClientDisconnect(socketId: string): void {
    this.clearClientIntervals(socketId);
    this.connectedClients.delete(socketId);
  }

  private clearClientIntervals(socketId: string): void {
    this.updateIntervals.forEach((interval, key) => {
      if (key.startsWith(socketId)) {
        clearInterval(interval);
        this.updateIntervals.delete(key);
      }
    });
  }

  // Public methods for external use
  public async broadcastToUser(
    userId: Types.ObjectId,
    event: string,
    data: any,
  ): Promise<void> {
    this.connectedClients.forEach((client, socketId) => {
      if (client.userId.toString() === userId.toString()) {
        this.io.to(socketId).emit(event, data);
      }
    });
  }

  public async broadcastAlert(
    userId: Types.ObjectId,
    alert: any,
  ): Promise<void> {
    await this.broadcastToUser(userId, 'alert', {
      ...alert,
      timestamp: new Date(),
    });
  }

  public getConnectedClients(): number {
    return this.connectedClients.size;
  }

  public isUserConnected(userId: Types.ObjectId): boolean {
    for (const client of this.connectedClients.values()) {
      if (client.userId.toString() === userId.toString()) {
        return true;
      }
    }
    return false;
  }
}
