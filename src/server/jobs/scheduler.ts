import cron from 'node-cron';
import { runDocumentExpiryCheck } from './document-expiry.job.js';
import { runBirthdayDigest } from './birthday-digest.job.js';
import { logger } from '../shared/logger.js';

function guarded(name: string, task: () => Promise<unknown>) {
  return async () => {
    try {
      await task();
    } catch (err) {
      logger.error({ err, job: name }, 'Scheduled job failed');
    }
  };
}

/**
 * Runs in-process alongside the API server — this app is a single long-lived Node process
 * (no separate worker deployment), so node-cron's setInterval-based scheduling is sufficient
 * without a job queue. Called once from server.ts; never imported by the test suite, which
 * always drives the app through createApp() directly and never executes this file.
 */
export function startScheduledJobs(): void {
  // 8:00 AM server time, once a day, for both jobs — well after typical login hours in any
  // single timezone, so a fresh day's reminders are waiting before anyone signs in.
  cron.schedule('0 8 * * *', guarded('document-expiry', () => runDocumentExpiryCheck()));
  cron.schedule('0 8 * * *', guarded('birthday-digest', () => runBirthdayDigest()));
  logger.info('Scheduled jobs registered (document-expiry, birthday-digest)');
}
