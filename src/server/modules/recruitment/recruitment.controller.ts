import type { Request, Response } from 'express';
import { recruitmentService } from './recruitment.service.js';
import { sendCreated, sendOk, sendPaginated, sendNoContent } from '../../shared/utils/response.util.js';
import type { z } from 'zod';
import type {
  createJobPostingSchema,
  updateJobPostingSchema,
  listJobPostingsQuerySchema,
  createCandidateSchema,
  updateCandidateSchema,
  changeCandidateStageSchema,
  listCandidatesQuerySchema,
  scheduleInterviewSchema,
  updateInterviewSchema,
  listInterviewsQuerySchema,
} from './recruitment.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function createJobPosting(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createJobPostingSchema>;
  sendCreated(res, await recruitmentService.createPosting(req.user!.tenantId, body, requestMeta(req)));
}

export async function getJobPosting(req: Request, res: Response): Promise<void> {
  sendOk(res, await recruitmentService.getPosting(req.user!.tenantId, req.params.id));
}

export async function updateJobPosting(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateJobPostingSchema>;
  sendOk(res, await recruitmentService.updatePosting(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}

export async function deleteJobPosting(req: Request, res: Response): Promise<void> {
  await recruitmentService.deletePosting(req.user!.tenantId, req.params.id, requestMeta(req));
  sendNoContent(res);
}

export async function listJobPostings(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listJobPostingsQuerySchema>;
  const { rows, meta } = await recruitmentService.listPostings(req.user!.tenantId, query);
  sendPaginated(res, rows, meta);
}

export async function createCandidate(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createCandidateSchema>;
  sendCreated(res, await recruitmentService.createCandidate(req.user!.tenantId, body, requestMeta(req)));
}

export async function getCandidate(req: Request, res: Response): Promise<void> {
  sendOk(res, await recruitmentService.getCandidate(req.user!.tenantId, req.params.id));
}

export async function updateCandidate(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateCandidateSchema>;
  sendOk(res, await recruitmentService.updateCandidate(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}

export async function changeCandidateStage(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof changeCandidateStageSchema>;
  sendOk(
    res,
    await recruitmentService.changeStage(req.user!.tenantId, req.params.id, body.status, body.rejectionReason, requestMeta(req)),
  );
}

export async function deleteCandidate(req: Request, res: Response): Promise<void> {
  await recruitmentService.deleteCandidate(req.user!.tenantId, req.params.id, requestMeta(req));
  sendNoContent(res);
}

export async function listCandidates(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listCandidatesQuerySchema>;
  const { rows, meta } = await recruitmentService.listCandidates(req.user!.tenantId, query);
  sendPaginated(res, rows, meta);
}

export async function scheduleInterview(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof scheduleInterviewSchema>;
  sendCreated(res, await recruitmentService.scheduleInterview(req.user!.tenantId, body, requestMeta(req)));
}

export async function updateInterview(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateInterviewSchema>;
  sendOk(res, await recruitmentService.updateInterview(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}

export async function cancelInterview(req: Request, res: Response): Promise<void> {
  await recruitmentService.cancelInterview(req.user!.tenantId, req.params.id, requestMeta(req));
  sendNoContent(res);
}

export async function listInterviews(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listInterviewsQuerySchema>;
  const { rows, meta } = await recruitmentService.listInterviews(req.user!.tenantId, query);
  sendPaginated(res, rows, meta);
}
