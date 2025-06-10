import Logger from './core/Logger';
import { port } from './config';
import app from './app';
import { createServer } from 'http';
import { RealTimeWebSocketService } from './services/real-time-websocket.service';

// Create HTTP server to support both Express and Socket.IO
const server = createServer(app);

// Initialize WebSocket service for real-time analytics
const webSocketService = new RealTimeWebSocketService(server);

// Start server
server
  .listen(port, () => {
    Logger.info(`Server running on port: ${port}`);
    Logger.info(`WebSocket service initialized for real-time analytics`);
    Logger.info(`Connected clients: ${webSocketService.getConnectedClients()}`);
  })
  .on('error', (e) => Logger.error(e));

// Graceful shutdown
process.on('SIGTERM', () => {
  Logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    Logger.info('Process terminated');
  });
});

process.on('SIGINT', () => {
  Logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    Logger.info('Process terminated');
  });
});

// Export server and WebSocket service for use in other modules
export { server, webSocketService };
