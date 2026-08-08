import { createApp } from './app.js';
import { env } from './shared/config/env.js';
import { logger } from './shared/logger.js';
import { prisma } from './db/prisma.js';
import { startScheduledJobs } from './jobs/scheduler.js';
import { bootstrapSuperAdmin } from './jobs/bootstrap-super-admin.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`Grow More API listening on port ${env.PORT}`);
  void bootstrapSuperAdmin().finally(() => startScheduledJobs());
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
