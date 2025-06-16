import Logger from '../core/Logger';
import { RealTimeWebSocketService } from './real-time-websocket.service';
import { SchedulerService } from './scheduler.service';
import { Server } from 'http';

export class ServiceManager {
  private static instance: ServiceManager;
  private webSocketService: RealTimeWebSocketService | null = null;
  private schedulerService: SchedulerService | null = null;

  private constructor() {}

  public static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  public initializeServices(server: Server): void {
    // Initialize WebSocket service
    this.webSocketService = new RealTimeWebSocketService(server);
    Logger.info('WebSocket service initialized for real-time analytics');

    // Initialize scheduler service
    this.schedulerService = new SchedulerService();
    this.schedulerService.startScheduler();
    Logger.info('Scheduler service initialized for event notifications');
  }

  public getWebSocketService(): RealTimeWebSocketService {
    if (!this.webSocketService) {
      throw new Error('WebSocket service not initialized');
    }
    return this.webSocketService;
  }

  public getSchedulerService(): SchedulerService {
    if (!this.schedulerService) {
      throw new Error('Scheduler service not initialized');
    }
    return this.schedulerService;
  }

  public shutdown(): void {
    if (this.schedulerService) {
      this.schedulerService.stopScheduler();
      Logger.info('Scheduler service stopped');
    }
  }
}
