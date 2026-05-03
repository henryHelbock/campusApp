import { getDatabase } from '../db/database';
import { ISSUE_CATEGORIES, SEVERITY_LEVELS } from '@campusapp/shared';
import { ValidationError, NotFoundError, ConflictError } from './errors';

export const ISSUE_PROJECTION = `
    id, category, severity, description,
    latitude, longitude,
    report_count AS reportCount,
    reporter_id AS reportedId,
    status,
    created_at AS createdAt,
    updated_at AS updatedAt
`;

const ISSUE_STATUSES = ['active', 'fixed', 'archived'] as const;
const ISO_8601_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/;
const severityScore: Record<string, number> = { Mild: 1, Medium: 2, Large: 3, Severe: 4 };
const scoreToSeverity: Record<number, string> = { 1: 'Mild', 2: 'Medium', 3: 'Large', 4: 'Severe' };

export interface IssueFilters {
    category?: string;
    severity?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
}

export function getIssues(filters: IssueFilters) {
  const { category, severity, status, startDate, endDate } = filters;

  if (category && !(ISSUE_CATEGORIES as readonly string[]).includes(category))
    throw new ValidationError('Invalid category');
  if (severity && !(SEVERITY_LEVELS as readonly string[]).includes(severity))
    throw new ValidationError('Invalid severity');
  if (status && !(ISSUE_STATUSES as readonly string[]).includes(status as any))
    throw new ValidationError('Invalid status');
  for (const [name, val] of [['startDate', startDate], ['endDate', endDate]] as const) {
    if (val && (!ISO_8601_RE.test(val) || isNaN(new Date(val).getTime())))
      throw new ValidationError(`Invalid ${name}: expected ISO-8601`);
  }

  const clauses: string[] = [];
  const params: unknown[] = [];
  if (category) { clauses.push('category = ?'); params.push(category); }
  if (severity) { clauses.push('severity = ?'); params.push(severity); }
  if (status) { clauses.push('status = ?'); params.push(status); }
  else { clauses.push("status IN ('active', 'fixed')"); }
  if (startDate) { clauses.push('created_at >= ?'); params.push(startDate); }
  if (endDate) { clauses.push('created_at <= ?'); params.push(endDate); }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return getDatabase()
    .prepare(`SELECT ${ISSUE_PROJECTION} FROM issues ${where} ORDER BY created_at DESC, id DESC`)
    .all(...params);
}

export function getIssueById(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Invalid id');
  const issue = getDatabase()
    .prepare(`SELECT ${ISSUE_PROJECTION} FROM issues WHERE id = ?`)
    .get(id);
  if (!issue) throw new NotFoundError('Issue not found');
  return issue;
}

export function createIssue(
  data: { category: string; severity: string; description: string; latitude: number; longitude: number },
  userId: number
) {
  const db = getDatabase();
  const { category, severity, description, latitude, longitude } = data;

  const existing = db.prepare(`
    SELECT id, severity, report_count FROM issues
    WHERE category = ? AND status = 'active'
    AND ABS(latitude - ?) < 0.0002 AND ABS(longitude - ?) < 0.0002
  `).get(category, latitude, longitude) as any;

  if (existing) {
    const newScore = Math.min(
            Math.ceil(((severityScore[existing.severity] ?? 1) + (severityScore[severity] ?? 1)) / 2) + 1, 4
    );
    db.prepare(`
      UPDATE issues SET report_count = report_count + 1, severity = ?, updated_at = datetime('now') WHERE id = ?
    `).run(scoreToSeverity[newScore], existing.id);
    return { issue: db.prepare(`SELECT ${ISSUE_PROJECTION} FROM issues WHERE id = ?`).get(existing.id), isNew: false };
  }

  const result = db.prepare(`
    INSERT INTO issues (category, severity, description, latitude, longitude, reporter_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(category, severity, description, latitude, longitude, userId);
  return { issue: db.prepare(`SELECT ${ISSUE_PROJECTION} FROM issues WHERE id = ?`).get(result.lastInsertRowid), isNew: true };
}

export function resolveIssue(id: string) {
  const db = getDatabase();
  const issue = db.prepare('SELECT * FROM issues WHERE id = ?').get(id) as any;
  if (!issue) throw new NotFoundError('Issue not found');
  if (issue.status === 'fixed') throw new ConflictError('Issue is already marked as fixed');
  db.prepare(`UPDATE issues SET status = 'fixed', updated_at = datetime('now') WHERE id = ?`).run(id);
  return db.prepare(`SELECT ${ISSUE_PROJECTION} FROM issues WHERE id = ?`).get(id);
}