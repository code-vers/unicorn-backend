import app from './app';
import config from './app/config';
import { logger } from './app/utils/logger';
import prisma, { pool } from './app/utils/prisma';

const server = app.listen(config.port);

server.on('listening', () => {
  logger.info(`Server is running on port ${config.port}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  logger.error(`Failed to start server on port ${config.port}:`, error);
  process.exit(1);
});

const shutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received. Shutting down gracefully.`);
  server.close(async () => {
    await prisma.$disconnect();
    await pool.end();
    logger.info('Database connection closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
  void shutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  void shutdown('uncaughtException');
});
