import { Router } from 'express';
import { authenticate, requireAuth } from '../middleware/auth';
import { validateCampusBounds } from '../middleware/validateCampusBounds';

export const issuesRouter = Router();

issuesRouter.use(authenticate);

// GET /api/issues - List issues with optional filters
issuesRouter.get('/', (_req, res) => {
  // TODO: Query database with filters (category, severity, status, date range)
  res.status(501).json({ message: 'Not implemented: list issues' });
});

// POST /api/issues - Create a new issue report
issuesRouter.post('/', requireAuth, validateCampusBounds, (_req, res) => {
  // TODO: Create issue, run aggregation logic (merge within 20m radius)
  res.status(501).json({ message: 'Not implemented: create issue' });
});

// GET /api/issues/:id - Get issue details
issuesRouter.get('/:id', (_req, res) => {
  // TODO: Return issue with report count, severity, category, last update
  res.status(501).json({ message: 'Not implemented: get issue details' });
});

// PATCH /api/issues/:id/resolve - Mark issue as fixed
issuesRouter.patch('/:id/resolve', requireAuth, (_req, res) => {
  // TODO: Update issue status, trigger archive
  res.status(501).json({ message: 'Not implemented: resolve issue' });
});

// GET /api/issues/heatmap - Get heatmap data
issuesRouter.get('/heatmap/data', (_req, res) => {
  // TODO: Return aggregated heatmap grid cells with intensity values
  res.status(501).json({ message: 'Not implemented: heatmap data' });
});
