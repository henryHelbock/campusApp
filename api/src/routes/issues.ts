import { Router, Request, Response } from "express";
import { authenticate, requireAuth } from "../middleware/auth";
import { validateCampusBounds } from "../middleware/validateCampusBounds";
import { getDatabase } from "../db/database";

export const issuesRouter = Router();

issuesRouter.use(authenticate);

// GET /api/issues - List issues with optional filters
issuesRouter.get("/", (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const issues = db.prepare(`
      SELECT
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
      FROM issues
    `).all();

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
issuesRouter.get("/:id", (_req: Request, res: Response) => {
  res.status(501).json({ message: "Not implemented: get issue details" });
});

// PATCH /api/issues/:id/resolve - Mark issue as fixed
issuesRouter.patch("/:id/resolve", requireAuth, (_req: Request, res: Response) => {
  res.status(501).json({ message: "Not implemented: resolve issue" });
});

// GET /api/issues/heatmap/data - Get heatmap data
issuesRouter.get("/heatmap/data", (_req: Request, res: Response) => {
  res.status(501).json({ message: "Not implemented: heatmap data" });
});