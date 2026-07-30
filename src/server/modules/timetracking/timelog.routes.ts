import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import {
  startTimerSchema,
  stopTimerSchema,
  manualTimeLogSchema,
  listTimeLogQuerySchema,
  timeLogIdParamSchema,
} from './timelog.validators.js';
import {
  startTimer,
  stopTimer,
  getRunningTimer,
  createManualLog,
  deleteTimeLog,
  listTimeLogs,
  getTimeSummary,
} from './timelog.controller.js';

export const timeLogRouter = Router();

timeLogRouter.use(authenticateAccessToken);

timeLogRouter.post('/timer/start', validate({ body: startTimerSchema }), asyncHandler(startTimer));
timeLogRouter.post('/timer/stop', validate({ body: stopTimerSchema }), asyncHandler(stopTimer));
timeLogRouter.get('/timer/running', asyncHandler(getRunningTimer));

timeLogRouter.get('/summary', validate({ query: listTimeLogQuerySchema }), asyncHandler(getTimeSummary));
timeLogRouter.post('/', validate({ body: manualTimeLogSchema }), asyncHandler(createManualLog));
timeLogRouter.get('/', validate({ query: listTimeLogQuerySchema }), asyncHandler(listTimeLogs));
timeLogRouter.delete('/:id', validate({ params: timeLogIdParamSchema }), asyncHandler(deleteTimeLog));
