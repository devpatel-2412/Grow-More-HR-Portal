import { createApp } from './app.js';
import { env } from './shared/config/env.js';
import { logger } from './shared/logger.js';
import { prisma } from './db/prisma.js';
import { startScheduledJobs } from './jobs/scheduler.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`Business OS API listening on http://localhost:${env.PORT}`);
  startScheduledJobs();
});

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
