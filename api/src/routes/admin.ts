import { Router } from "express";
import { authenticate, requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roleGuard";
import { getDatabase } from "../db/database";

export const adminRouter = Router();

// Protect all admin routes
adminRouter.use(authenticate, requireAuth, requireRole("admin"));

// Helper function to log actions
const logAudit = (db: any, adminId: number, action: string, contentId: number | string) => {
    db.prepare(`
        INSERT INTO audit_logs (admin_user_id, action, affected_content_id) 
        VALUES (?, ?, ?)
    `).run(adminId, action, contentId);
};

// GET /api/admin/issues - List all issues (active + archived)
adminRouter.get("/issues", (_req, res) => {
    try {
        const db = getDatabase();
        const sql = "SELECT * FROM issues ORDER BY created_at DESC";
        const rows = db.prepare(sql).all();
        res.json(rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/lost-found/all - List all lost/found threads (active + resolved)
adminRouter.get("/lost-found/all", (_req, res) => {
    try {
        const db = getDatabase();
        const sql = "SELECT * FROM lost_found_items ORDER BY created_at DESC";
        const rows = db.prepare(sql).all();
        res.json(rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/admin/issues/:id/severity - Override issue severity
adminRouter.patch("/issues/:id/severity", (_req, res) => {
    res.status(501).json({ message: "Not implemented: override severity" });
});

// DELETE /api/admin/issues/:id - Remove inappropriate issue
adminRouter.delete("/issues/:id", (req, res) => {
    try {
        const db = getDatabase();
        const issueId = req.params.id;
        const adminId = (req as any).user.id;

        db.prepare("UPDATE issues SET status = 'archived' WHERE id = ?").run(issueId);
        logAudit(db, adminId, 'REMOVED_ISSUE', issueId);

        res.json({ message: `Issue ${issueId} has been archived.` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/admin/issues/:id/dismiss - Dismiss flagged issue
adminRouter.patch("/issues/:id/dismiss", (req, res) => {
    try {
        const db = getDatabase();
        const issueId = req.params.id;
        const adminId = (req as any).user.id;

        const result = db.prepare("UPDATE issues SET report_count = 0 WHERE id = ?").run(issueId);

        if (result.changes === 0) {
            return res.status(404).json({ error: "Issue not found." });
        }

        logAudit(db, adminId, 'DISMISSED_ISSUE_FLAG', issueId);
        res.json({ message: `Issue ${issueId} dismissed and kept.` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/lost-found - List all active lost/found threads
adminRouter.get("/lost-found", (_req, res) => {
    try {
        const db = getDatabase();
        const sql = "SELECT * FROM lost_found_items WHERE status = 'active' ORDER BY created_at DESC";
        const rows = db.prepare(sql).all();
        res.json(rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/admin/lost-found/:id - Remove/Resolve lost/found thread
adminRouter.delete("/lost-found/:id", (req, res) => {
    try {
        const db = getDatabase();
        const itemId = req.params.id;
        const adminId = (req as any).user.id;

        db.prepare("UPDATE lost_found_items SET status = 'resolved' WHERE id = ?").run(itemId);
        logAudit(db, adminId, 'RESOLVED_LNF', itemId);

        res.json({ message: `Item ${itemId} has been resolved/removed.` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/users - List user accounts
adminRouter.get("/users", (_req, res) => {
    try {
        const db = getDatabase();
        const sql = "SELECT id, email, status, role FROM users WHERE role = 'student'";
        const rows = db.prepare(sql).all();
        res.json(rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/admin/users/:id/suspend - Suspend user account
adminRouter.patch("/users/:id/suspend", (req, res) => {
    try {
        const db = getDatabase();
        const userId = req.params.id;
        const adminId = (req as any).user.id;

        db.prepare("UPDATE users SET status = 'suspended' WHERE id = ?").run(userId);
        logAudit(db, adminId, 'SUSPENDED_USER', userId);

        res.json({ message: `User ${userId} suspended.` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/admin/users/:id/ban - Ban user account AND delete their content
adminRouter.patch("/users/:id/ban", (req, res) => {
    try {
        const db = getDatabase();
        const userId = req.params.id;
        const adminId = (req as any).user.id;

        db.prepare("UPDATE users SET status = 'banned' WHERE id = ?").run(userId);
        db.prepare("DELETE FROM issues WHERE reporter_id = ?").run(userId);
        db.prepare("DELETE FROM lost_found_items WHERE reporter_id = ?").run(userId);
        
        logAudit(db, adminId, 'BANNED_USER_AND_WIPED_CONTENT', userId);

        res.json({ message: `User ${userId} banned and all their content was permanently deleted.` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/admin/users/:id/reactivate - Reactivate user account
adminRouter.patch("/users/:id/reactivate", (req, res) => {
    try {
        const db = getDatabase();
        const userId = req.params.id;
        const adminId = (req as any).user.id;

        db.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(userId);
        logAudit(db, adminId, 'REACTIVATED_USER', userId);

        res.json({ message: `User ${userId} reactivated.` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/audit-log - View audit trail
adminRouter.get("/audit-log", (_req, res) => {
    try {
        const db = getDatabase();
        const sql = `
            SELECT a.id, a.action, a.affected_content_id, a.timestamp, u.email as admin_email
            FROM audit_logs a
            LEFT JOIN users u ON a.admin_user_id = u.id
            ORDER BY a.timestamp DESC 
            LIMIT 50
        `;
        const rows = db.prepare(sql).all();
        res.json(rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/moderation-queue - Flagged content queue
adminRouter.get("/moderation-queue", (_req, res) => {
    try {
        const db = getDatabase();
        const sql = "SELECT * FROM issues WHERE status = 'active' AND report_count > 1 ORDER BY report_count DESC";
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

// GET /api/admin/users/:id/history - View user history
adminRouter.get("/users/:id/history", (req, res) => {
    try {
        const db = getDatabase();
        const userId = req.params.id;
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