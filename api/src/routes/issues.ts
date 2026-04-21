import { Router, Request, Response } from "express";
import { authenticate, requireAuth } from "../middleware/auth";
import { validateCampusBounds } from "../middleware/validateCampusBounds";
import { getDatabase } from "../db/database";
import { ISSUE_CATEGORIES, SEVERITY_LEVELS } from "@campusapp/shared";

export const issuesRouter = Router();

issuesRouter.use(authenticate);

const ISSUE_STATUSES = ['active', 'fixed', 'archived'] as const;
const ISO_8601_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/;

const ISSUE_PROJECTION = `
  id,
  category,
  severity,
  description,
  latitude,
  longitude,
  report_count AS reportCount,
  reporter_id AS reporterId,
  status,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

// GET /api/issues - List issues with optional filters
issuesRouter.get("/", (req: Request, res: Response) => {
  try {
    const q = req.query;

    // Scalar-only enforcement: reject array-shaped query params like ?category=A&category=B
    for (const key of ['category', 'severity', 'status', 'startDate', 'endDate']) {
      if (Array.isArray(q[key])) {
        res.status(400).json({ error: `Invalid ${key}: expected a single value` });
        return;
      }
    }

    const category = typeof q.category === 'string' && q.category !== '' ? q.category : undefined;
    const severity = typeof q.severity === 'string' && q.severity !== '' ? q.severity : undefined;
    const status = typeof q.status === 'string' && q.status !== '' ? q.status : undefined;
    const startDate = typeof q.startDate === 'string' && q.startDate !== '' ? q.startDate : undefined;
    const endDate = typeof q.endDate === 'string' && q.endDate !== '' ? q.endDate : undefined;

    if (category !== undefined && !(ISSUE_CATEGORIES as readonly string[]).includes(category)) {
      res.status(400).json({ error: 'Invalid category' });
      return;
    }
    if (severity !== undefined && !(SEVERITY_LEVELS as readonly string[]).includes(severity)) {
      res.status(400).json({ error: 'Invalid severity' });
      return;
    }
    if (status !== undefined && !(ISSUE_STATUSES as readonly string[]).includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }
    for (const [name, val] of [['startDate', startDate], ['endDate', endDate]] as const) {
      if (val !== undefined) {
        if (!ISO_8601_RE.test(val) || isNaN(new Date(val).getTime())) {
          res.status(400).json({ error: `Invalid ${name}: expected ISO-8601` });
          return;
        }
      }
    }

    const clauses: string[] = [];
    const params: unknown[] = [];
    if (category !== undefined) { clauses.push('category = ?'); params.push(category); }
    if (severity !== undefined) { clauses.push('severity = ?'); params.push(severity); }
    if (status !== undefined) {
      clauses.push('status = ?');
      params.push(status);
    } else {
      // Default: hide archived from list responses
      clauses.push("status IN ('active', 'fixed')");
    }
    if (startDate !== undefined) { clauses.push('created_at >= ?'); params.push(startDate); }
    if (endDate !== undefined) { clauses.push('created_at <= ?'); params.push(endDate); }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const sql = `SELECT ${ISSUE_PROJECTION} FROM issues ${where} ORDER BY created_at DESC, id DESC`;
    const issues = getDatabase().prepare(sql).all(...params);

    res.json(issues);
  } catch (error) {
    console.error("Database error fetching issues:", error);
    res.status(500).json({ message: "Internal server error while fetching issues" });
  }
});

// POST /api/issues - Create a new issue report
issuesRouter.post("/", requireAuth, validateCampusBounds, (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { category, severity, description, latitude, longitude } = req.body;
    const user = (req as any).user;

    if (!category || !severity || !description || latitude == null || longitude == null) {
      res.status(400).json({ error: 'category, severity, description, latitude and longitude are required' });
      return;
    }

    const severityScore: Record<string, number> = { Mild: 1, Medium: 2, Large: 3, Severe: 4 };
    const scoreToSeverity: Record<number, string> = { 1: 'Mild', 2: 'Medium', 3: 'Large', 4: 'Severe' };

    const existing = db.prepare(`
      SELECT id, severity, report_count
      FROM issues
      WHERE category = ?
      AND status = 'active'
      AND ABS(latitude - ?) < 0.0002
      AND ABS(longitude - ?) < 0.0002
    `).get(category, latitude, longitude) as any;

    if (existing) {
      const currentScore = severityScore[existing.severity] ?? 1;
      const incomingScore = severityScore[severity] ?? 1;
      const newScore = Math.min(Math.ceil((currentScore + incomingScore) / 2) + 1, 4);
      const newSeverity = scoreToSeverity[newScore];

      db.prepare(`
        UPDATE issues SET
          report_count = report_count + 1,
          severity = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(newSeverity, existing.id);

      const updated = db.prepare(`
        SELECT
          id, category, severity, description,
          latitude, longitude,
          report_count AS reportCount,
          reporter_id AS reporterId,
          status,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM issues WHERE id = ?
      `).get(existing.id);

      res.status(200).json(updated);
    } else {
      const result = db.prepare(`
        INSERT INTO issues (category, severity, description, latitude, longitude, reporter_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(category, severity, description, latitude, longitude, user.id);

      const created = db.prepare(`
        SELECT
          id, category, severity, description,
          latitude, longitude,
          report_count AS reportCount,
          reporter_id AS reporterId,
          status,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM issues WHERE id = ?
      `).get(result.lastInsertRowid);

      res.status(201).json(created);
    }
  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({ error: 'Server error creating issue' });
  }
});

// GET /api/issues/:id - Get issue details
issuesRouter.get("/:id", (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }

    const issue = getDatabase().prepare(
      `SELECT ${ISSUE_PROJECTION} FROM issues WHERE id = ?`
    ).get(id);

    if (!issue) {
      res.status(404).json({ error: 'Issue not found' });
      return;
    }

    res.json(issue);
  } catch (error) {
    console.error('Get issue error:', error);
    res.status(500).json({ error: 'Server error fetching issue' });
  }
});

// PATCH /api/issues/:id/resolve - Mark issue as fixed
issuesRouter.patch("/:id/resolve", requireAuth, (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const issue = db.prepare('SELECT * FROM issues WHERE id = ?').get(id) as any;
    if (!issue) {
      res.status(404).json({ error: 'Issue not found' });
      return;
    }

    if (issue.status === 'fixed') {
      res.status(400).json({ error: 'Issue is already marked as fixed' });
      return;
    }

    db.prepare(`
      UPDATE issues SET status = 'fixed', updated_at = datetime('now') WHERE id = ?
    `).run(id);

    const updated = db.prepare(`
      SELECT
        id, category, severity, description,
        latitude, longitude,
        report_count AS reportCount,
        reporter_id AS reporterId,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM issues WHERE id = ?
    `).get(id);

    res.json(updated);
  } catch (error) {
    console.error('Resolve issue error:', error);
    res.status(500).json({ error: 'Server error resolving issue' });
  }
});
