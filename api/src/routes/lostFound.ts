import { Router } from 'express';
import { authenticate, requireAuth } from '../middleware/auth';
import { validateCampusBounds } from '../middleware/validateCampusBounds';

export const lostFoundRouter = Router();

lostFoundRouter.use(authenticate);

// GET /api/lost-found - List lost and found items
lostFoundRouter.get('/', (_req, res) => {
  // TODO: Query with filters (type, category, status, date)
  res.status(501).json({ message: 'Not implemented: list lost/found items' });
});

// POST /api/lost-found - Create a lost or found item report
lostFoundRouter.post('/', requireAuth, validateCampusBounds, (_req, res) => {
  // TODO: Create item, run matching algorithm against opposite type
  res.status(501).json({ message: 'Not implemented: create lost/found item' });
});

// GET /api/lost-found/:id - Get item details
lostFoundRouter.get('/:id', (_req, res) => {
  // TODO: Return item with images, status, reporter info
  res.status(501).json({ message: 'Not implemented: get lost/found item details' });
});

// PATCH /api/lost-found/:id/claim - Claim a found item
lostFoundRouter.patch('/:id/claim', requireAuth, (_req, res) => {
  // TODO: Update status to claimed, notify original reporter
  res.status(501).json({ message: 'Not implemented: claim item' });
});

// PATCH /api/lost-found/:id/resolve - Mark item as resolved
lostFoundRouter.patch('/:id/resolve', requireAuth, (_req, res) => {
  // TODO: Archive the report, remove from active list
  res.status(501).json({ message: 'Not implemented: resolve item' });
});

// POST /api/lost-found/:id/respond - Respond to a lost report (found submission)
lostFoundRouter.post('/:id/respond', requireAuth, (_req, res) => {
  // TODO: Associate found submission with lost report thread
  res.status(501).json({ message: 'Not implemented: respond to lost report' });
});
