import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission, requireStaff } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { createArticleSchema, updateArticleSchema, listArticlesQuerySchema, idParamSchema } from './kb.validators.js';
import { createArticle, getArticle, updateArticle, deleteArticle, listArticles } from './kb.controller.js';

const manage = requirePermission(PERMISSIONS.KB_MANAGE);

export const kbRouter = Router();
kbRouter.use(authenticateAccessToken);
kbRouter.use(requireStaff); // internal knowledge base — never visible to a CLIENT portal login

// Reading the knowledge base is open to every authenticated employee; only writing needs KB_MANAGE.
kbRouter.post('/', manage, validate({ body: createArticleSchema }), asyncHandler(createArticle));
kbRouter.get('/', validate({ query: listArticlesQuerySchema }), asyncHandler(listArticles));
kbRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(getArticle));
kbRouter.patch('/:id', manage, validate({ params: idParamSchema, body: updateArticleSchema }), asyncHandler(updateArticle));
kbRouter.delete('/:id', manage, validate({ params: idParamSchema }), asyncHandler(deleteArticle));
