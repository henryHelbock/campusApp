import { Router } from 'express';
import { authenticate, requireAuth } from '../middleware/auth';
import { validateCampusBounds } from '../middleware/validateCampusBounds';
import { getDatabase } from '../db/database';

export const lostFoundRouter = Router();

lostFoundRouter.use(authenticate);

// GET /api/lost-found - List lost and found items
lostFoundRouter.get('/', (_req, res) => {
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

    // Attach image URLs for each item
    const imgStmt = db.prepare('SELECT image_url FROM item_images WHERE item_id = ?');
    const result = items.map((item: any) => ({
      ...item,
      imageUrls: imgStmt.all(item.id).map((row: any) => row.image_url),
    }));

    res.json(result);
  } catch (error) {
    console.error('Database error fetching lost/found items:', error);
    res.status(500).json({ message: 'Internal server error while fetching lost/found items' });
  }
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
