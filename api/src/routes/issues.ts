import { Router, Request, Response } from "express";
import { authenticate, requireAuth } from "../middleware/auth";
import { validateCampusBounds } from "../middleware/validateCampusBounds";
import { handleError } from "../utils/handleError"
import { getIssues, getIssueById, createIssue, resolveIssue } from "../services/issueService";

export const issuesRouter = Router();

issuesRouter.use(authenticate);

// GET /api/issues
issuesRouter.get("/", (req: Request, res: Response) => {
  try {
    const q = req.query;
    for (const key of ['category', 'severity', 'status', 'startDate', 'endDate']) {
      if (Array.isArray(q[key])) {
        res.status(400).json({ error: `Invalid ${key}: expected a single value` });
        return;
      }
    }
    const filters = {
      category: typeof q.category === 'string' && q.category !== '' ? q.category : undefined,
      severity: typeof q.severity === 'string' && q.severity !== '' ? q.severity : undefined,
      status: typeof q.status === 'string' && q.status !== '' ? q.status : undefined,
      startDate: typeof q.startDate === 'string' && q.startDate !== '' ? q.startDate : undefined,
      endDate: typeof q.endDate === 'string' && q.endDate !== '' ? q.endDate : undefined,
    };
    res.json(getIssues(filters));
  } catch (error) {
    handleError(res, error);
  }
});

// POST /api/issues
issuesRouter.post("/", requireAuth, validateCampusBounds, (req: Request, res: Response) => {
  try {
    const { category, severity, description, latitude, longitude } = req.body;
    if (!category || !severity || !description || latitude == null || longitude == null) {
      res.status(400).json({ error: 'category, severity, description, latitude, and longitude are required' });
      return;
    }
    const { issue, isNew } = createIssue({ category, severity, description, latitude, longitude }, (req as any).user.id);
    res.status(isNew ? 201 : 200).json(issue);
  } catch (error) {
    handleError(res, error);
  }
});

// GET /api/issues/:id
issuesRouter.get("/:id", (req: Request, res: Response) => {
  try {
    res.json(getIssueById(Number(req.params.id)));
  } catch(error) {
    handleError(res, error);
  }
});

// PATCH /api/issues/:id/resolve
issuesRouter.patch("/:id/resolve", requireAuth, (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    res.json(resolveIssue(id));
  } catch (error) {
    handleError(res, error);
  }
});