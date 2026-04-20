import { Router, Request, Response } from 'express';
import { authenticate, requireAuth } from '../middleware/auth';
import { validateCampusBounds } from '../middleware/validateCampusBounds';
import { getDatabase } from '../db/database';

export const lostFoundRouter = Router();

lostFoundRouter.use(authenticate);

// GET /api/lost-found - List lost and found items
lostFoundRouter.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const items = db.prepare(`
      SELECT
        id,
        type,
        title,
        description,
        category,
        latitude,
        longitude,
        reporter_id AS reporterId,
        status,
        created_at AS createdAt
      FROM lost_found_items
      WHERE status = 'active'
      ORDER BY created_at DESC
    `).all();

    const imgStmt = db.prepare('SELECT url FROM item_images WHERE item_id = ?');
    const result = items.map((item: any) => ({
      ...item,
      imageUrls: imgStmt.all(item.id).map((row: any) => row.url),
    }));

    res.json(result);
  } catch (error) {
    console.error('Database error fetching lost/found items:', error);
    res.status(500).json({ message: 'Internal server error while fetching lost/found items' });
  }
});

// POST /api/lost-found - Create a lost or found item report
lostFoundRouter.post('/', requireAuth, validateCampusBounds, (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { type, title, description, category, latitude, longitude } = req.body;
    const user = (req as any).user;

    if (!type || !title || !description) {
      res.status(400).json({ error: 'type, title, and description are required' });
      return;
    }

    if (!['lost', 'found'].includes(type)) {
      res.status(400).json({ error: 'type must be either lost or found' });
      return;
    }

    const result = db.prepare(`
      INSERT INTO lost_found_items (type, title, description, category, latitude, longitude, reporter_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(type, title, description, category || 'Other', latitude ?? null, longitude ?? null, user.id);

    const created = db.prepare(`
      SELECT
        id, type, title, description, category,
        latitude, longitude,
        reporter_id AS reporterId,
        status,
        created_at AS createdAt
      FROM lost_found_items WHERE id = ?
    `).get(result.lastInsertRowid) as any;

    res.status(201).json({ ...created, imageUrls: [] });
  } catch (error) {
    console.error('Create lost/found error:', error);
    res.status(500).json({ error: 'Server error creating item' });
  }
});

// GET /api/lost-found/:id - Get item details
lostFoundRouter.get('/:id', (_req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented: get lost/found item details' });
});

// PATCH /api/lost-found/:id/claim - Claim a found item
lostFoundRouter.patch('/:id/claim', requireAuth, (_req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented: claim item' });
});

// PATCH /api/lost-found/:id/resolve - Mark item as resolved
lostFoundRouter.patch('/:id/resolve', requireAuth, (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const item = db.prepare('SELECT * FROM lost_found_items WHERE id = ?').get(id);
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    db.prepare(`
      UPDATE lost_found_items SET status = 'resolved' WHERE id = ?
    `).run(id);

    res.json({ message: 'Item marked as resolved' });
  } catch (error) {
    console.error('Resolve lost/found error:', error);
    res.status(500).json({ error: 'Server error resolving item' });
  }
});

// POST /api/lost-found/:id/respond - Respond to a lost report
lostFoundRouter.post('/:id/respond', requireAuth, (_req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented: respond to lost report' });
});