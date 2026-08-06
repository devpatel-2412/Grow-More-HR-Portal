import { z } from 'zod';

export const forceLogoutUserParamSchema = z.object({
  userId: z.string().uuid(),
});
