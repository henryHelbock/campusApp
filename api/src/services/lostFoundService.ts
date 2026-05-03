import { getDatabase } from '../db/database';
import { NotFoundError, ConflictError, ForbiddenError } from './errors';

const LOST_FOUND_PROJECTION = `
    id, type, title, description, category,
    latitude, longitude,
    reporter_id AS reporterId,
    status,
    created_at AS createdAt
`;

function getImageUrls(itemId: number | bigint): string[] {
    return getDatabase()
        .prepare('SELECT url FROM item_images WHERE item_id = ?')
        .all(itemId)
        .map((row: any) => row.url);
}

export function getAllLostFoundItems() {
    const db = getDatabase();
    const items = db.prepare(`
        SELECT ${LOST_FOUND_PROJECTION} FROM lost_found_items
        WHERE status = 'active' ORDER BY created_at DESC
    `).all();
    return items.map((item: any) => ({ ...item, imageUrls: getImageUrls(item.id) }));
}

export function getLostFoundItemById(id: string) {
    const item = getDatabase()
        .prepare(`SELECT ${LOST_FOUND_PROJECTION} FROM lost_found_items WHERE id = ?`)
        .get(id) as any;
    if (!item) throw new NotFoundError('Item not found');
    return { ...item, imageUrls: getImageUrls(item.id) };
}

export function createLostFoundItem(
    data: { type: string; title: string; description: string; category?: string; latitude?: number; longitude?: number },
    userId: number
) {
    const db = getDatabase();
    const { type, title, description, category, latitude, longitude } = data;

    if (!type || !title || !description) throw new Error('type, title, and description are required');
    if (!['lost', 'found'].includes(type)) throw new Error('type must be either lost or found');

    const result = db.prepare(`
        INSERT INTO lost_found_items (type, title, description, category, latitude, longitude, reporter_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(type, title, description, category || 'Other', latitude ?? null, longitude ?? null, userId);

    const created = db.prepare(`
        SELECT ${LOST_FOUND_PROJECTION} FROM lost_found_items WHERE id = ?
    `).get(result.lastInsertRowid) as any;

    return { ...created, imageUrls: [] };
}

export function claimLostFoundItem(id: string, userId: number) {
    const db = getDatabase();
    const item = db.prepare('SELECT * FROM lost_found_items WHERE id = ?').get(id) as any;
    if (!item) throw new NotFoundError('Item not found');
    if (item.status !== 'active') throw new ConflictError(`Item is already ${item.status}`);
    if (item.reporter_id === userId) throw new ForbiddenError('You cannot claim your own item');
    db.prepare("UPDATE lost_found_items SET status = 'claimed' WHERE id = ?").run(id);
    return { message: 'Item claimed successfully' };
}

export function resolveLostFoundItem(id: string) {
    const db = getDatabase();
    const item = db.prepare('SELECT * FROM lost_found_items WHERE id = ?').get(id);
    if (!item) throw new NotFoundError('Item not found');
    db.prepare("UPDATE lost_found_items SET status = 'resolved' WHERE id = ?").run(id);
    return { message: 'Item marked as resolved' };
}