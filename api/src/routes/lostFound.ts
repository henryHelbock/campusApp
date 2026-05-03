import { Router, Request, Response } from 'express';
import { authenticate, requireAuth } from '../middleware/auth';
import { validateCampusBounds } from '../middleware/validateCampusBounds';
import { handleError } from '../utils/handleError';
import {
  getAllLostFoundItems,
  getLostFoundItemById,
  createLostFoundItem,
  claimLostFoundItem,
  resolveLostFoundItem,
} from '../services/lostFoundService';

export const lostFoundRouter = Router();

lostFoundRouter.use(authenticate);

// GET /api/lost-found
lostFoundRouter.get('/', (req: Request, res: Response) => {
  try {
    res.json(getAllLostFoundItems());
  } catch (error) {
    handleError(res, error);
  }
});

// POST /api/lost-found
lostFoundRouter.post('/', requireAuth, validateCampusBounds, (req: Request, res: Response) => {
  try {
    const item = createLostFoundItem(req.body, (req as any).user.id);
    res.status(201).json(item);
  } catch (error) {
    handleError(res, error);
  }
});

// GET /api/lost-found/:id
lostFoundRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    res.json(getLostFoundItemById(id));
  } catch (error) {
    handleError(res, error);
  }
});

// PATCH /api/lost-found/:id/claim
lostFoundRouter.patch('/:id/claim', requireAuth, (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    res.json(claimLostFoundItem(id, (req as any).user.id));
  } catch (error) {
    handleError(res, error);
  }
});

// PATCH /api/lost-found/:id/resolve
lostFoundRouter.patch('/:id/resolve', requireAuth, (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    res.json(resolveLostFoundItem(id));
  } catch (error) {
    handleError(res, error);
  }
});

// POST /api/lsot-found/:id/respond
lostFoundRouter.post('/:id/respond', requireAuth, (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented: respond tp lost report' });
});