import { prisma } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Daily job to check and update expired warranties.
 * In production, this would be scheduled via a cron job or Bull queue.
 */
export async function checkExpiredWarranties(): Promise<void> {
  const now = new Date();

  const result = await prisma.warranty.updateMany({
    where: {
      status: 'ACTIVE',
      endDate: { lt: now },
    },
    data: {
      status: 'EXPIRED',
    },
  });

  if (result.count > 0) {
    logger.info(`Expired ${result.count} warranties`);
  }
}
