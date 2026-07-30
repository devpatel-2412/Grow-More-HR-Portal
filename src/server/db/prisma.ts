import { PrismaClient } from '@prisma/client';
import { isProduction } from '../shared/config/env.js';

export const prisma = new PrismaClient({
  log: isProduction ? ['error', 'warn'] : ['error', 'warn'],
});
