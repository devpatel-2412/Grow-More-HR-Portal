import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { idParamSchema } from './template.validators.js';
import { verifyGeneratedDocument } from './template.controller.js';

/**
 * Deliberately public — no authenticateAccessToken here. This is what the QR code on a printed
 * letter points at, and the person scanning it (an employer verifying an experience letter, a
 * bank verifying a salary certificate) has no account in this system.
 */
export const verifyRouter = Router();
verifyRouter.get('/documents/:id', validate({ params: idParamSchema }), asyncHandler(verifyGeneratedDocument));
