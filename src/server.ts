import Logger from './core/Logger';
import { port } from './config';
import app from './app';

import { createServer } from 'http';
import { ServiceManager } from './services/service-manager';

// Create HTTP server to support both Express and Socket.IO
const server = createServer(app);

// Initialize all services through the service manager
const serviceManager = ServiceManager.getInstance();
serviceManager.initializeServices(server);

// Start server
server
  .listen(port, () => {
    Logger.info(`Server running on port: ${port}`);
    Logger.info(
      `Connected clients: ${serviceManager
        .getWebSocketService()
        .getConnectedClients()}`,
    );
  })
  .on('error', (e) => Logger.error(e));

// Graceful shutdown
process.on('SIGTERM', () => {
  Logger.info('SIGTERM received, shutting down gracefully');
  serviceManager.shutdown();
  server.close(() => {
    Logger.info('Process terminated');
  });
});

process.on('SIGINT', () => {
  Logger.info('SIGINT received, shutting down gracefully');
  serviceManager.shutdown();
  server.close(() => {
    Logger.info('Process terminated');
  });
});

// Export server and service manager for use in other modules
export { server, serviceManager };
