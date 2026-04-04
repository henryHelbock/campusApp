import { Router } from "express";
import { authenticate, requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roleGuard";
import { getDatabase } from "../db/database";

export const adminRouter = Router();

// Temporarily disabled for local testing without Login screen
// adminRouter.use(authenticate, requireAuth, requireRole("admin"));

// GET /api/admin/issues - List all issues (active + archived)
adminRouter.get("/issues", (_req, res) => {
	// TODO: Return all issues with admin-level filters (reporter, status)
	res.status(501).json({ message: "Not implemented: admin list issues" });
});

// PATCH /api/admin/issues/:id/severity - Override issue severity
adminRouter.patch("/issues/:id/severity", (_req, res) => {
	// TODO: Update severity, log action in audit trail
	res.status(501).json({ message: "Not implemented: override severity" });
});

// DELETE /api/admin/issues/:id - Remove inappropriate issue
adminRouter.delete("/issues/:id", (_req, res) => {
	try {
		const db = getDatabase();
		const issueId = _req.params.id;
		const sql = "UPDATE issues SET status = 'archived' WHERE id = ?";

		db.prepare(sql).run(issueId);

		res.json({ message: `Issue ${issueId} has been archived.` });
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

//PATCH /api/admin/issues/:id/dismiss
adminRouter.patch("/issues/:id/dismiss", (_req, res) => {
	try {
		const db = getDatabase();
		const issueId = _req.params.id;

		// Reset report count to 0 to drop it out of the flagged queue
		const sql = "UPDATE issues SET report_count = 0 WHERE id = ?";

		const result = db.prepare(sql).run(issueId);

		// Optional safety check: If no rows were changed, the ID doesn't exist
		if (result.changes === 0) {
			return res.status(404).json({ error: "Issue not found." });
		}

		res.json({ message: `Issue ${issueId} dismissed and kept.` });
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// GET /api/admin/lost-found - List all lost/found threads
adminRouter.get("/lost-found", (_req, res) => {
	res.status(501).json({ message: "Not implemented: admin list lost/found" });
});

// DELETE /api/admin/lost-found/:id - Delete lost/found thread
adminRouter.delete("/lost-found/:id", (_req, res) => {
	res.status(501).json({ message: "Not implemented: admin delete lost/found" });
});

// GET /api/admin/users - List user accounts
adminRouter.get("/users", (_req, res) => {
	try {
		const db = getDatabase();
		const sql =
			"SELECT id, email, status, role FROM users WHERE role = 'student'";

		const rows = db.prepare(sql).all();
		res.json(rows);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// PATCH /api/admin/users/:id/suspend - Suspend user account
adminRouter.patch("/users/:id/suspend", (_req, res) => {
	try {
		const db = getDatabase();
		const userId = _req.params.id;
		const sql = "UPDATE users SET status = 'suspended' WHERE id = ?";

		db.prepare(sql).run(userId);
		res.json({ message: `User ${userId} suspended.` });
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// PATCH /api/admin/users/:id/ban - Ban user account AND delete their content
adminRouter.patch("/users/:id/ban", (_req, res) => {
	try {
		const db = getDatabase();
		const userId = _req.params.id;

		db.prepare("UPDATE users SET status = 'banned' WHERE id = ?").run(userId);

		db.prepare("DELETE FROM issues WHERE reporter_id = ?").run(userId);

		db.prepare("DELETE FROM lost_found_items WHERE reporter_id = ?").run(
			userId,
		);

		res.json({
			message: `User ${userId} banned and all their content was permanently deleted.`,
		});
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

adminRouter.patch("/users/:id/reactivate", (_req, res) => {
	try {
		const db = getDatabase();
		const userId = _req.params.id;
		db.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(userId);
		res.json({ message: `User ${userId} reactivated.` });
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// GET /api/admin/audit-log - View audit trail
adminRouter.get("/audit-log", (_req, res) => {
	// TODO: Return paginated audit log entries
	res.status(501).json({ message: "Not implemented: audit log" });
});

// GET /api/admin/moderation-queue - Flagged content queue
adminRouter.get("/moderation-queue", (_req, res) => {
	try {
		const db = getDatabase();
		const sql =
			"SELECT * FROM issues WHERE status = 'active' AND report_count > 1 ORDER BY report_count DESC";

		const rows = db.prepare(sql).all();
		res.json(rows);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// GET /api/admin/analytics - Summary statistics
adminRouter.get("/analytics", (_req, res) => {
	try {
		const db = getDatabase();
		const sql = `
      SELECT 
          (SELECT COUNT(*) FROM issues WHERE status = 'active') AS activeIssues,
          (SELECT COUNT(*) FROM issues WHERE status = 'active' AND report_count > 1) AS flaggedItems,
          (SELECT COUNT(*) FROM lost_found_items WHERE status = 'active') AS openLnF
    `;

		const row = db.prepare(sql).get();
		res.json(row);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

adminRouter.get("/users/:id/history", (_req, res) => {
	try {
		const db = getDatabase();
		const userId = _req.params.id;
		const sql = `
			SELECT id, 'issue' AS record_type, category AS title, severity, description, status, created_at
			FROM issues
			WHERE reporter_id = ?
			UNION ALL
			SELECT id, 'lost_found' AS record_type, title, NULL AS severity, description, status, created_at
			FROM lost_found_items
			WHERE reporter_id = ?
			ORDER BY created_at DESC
		`;
		const history = db.prepare(sql).all(userId, userId);
		res.json(history);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});
