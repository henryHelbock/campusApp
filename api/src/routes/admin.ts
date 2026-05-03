import { Router, Request, Response } from "express";
import { authenticate, requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roleGuard";
import { handleError } from "../utils/handleError";
import {
  getAllIssues,
  getModerationQueue,
  archiveIssue,
  dismissIssue,
  overrideIssueSeverity,
  getAllLostFoundItems,
  getActiveLostFoundItems,
  resolveLostFoundItem,
  getStudentUsers,
  suspendUser,
  banUser,
  reactivateUser,
  getAuditLogs,
  getAnalytics,
  getUserHistory,
} from "../services/adminService";

export const adminRouter = Router();

adminRouter.use(authenticate, requireAuth, requireRole("admin"));

const adminId = (req: Request) => (req as any).user.id;

// GET /api/admin/issues
adminRouter.get("/issues", (_req, res) => {
  try { res.json(getAllIssues()); }
  catch (error) { handleError(res, error); }
});

// GET /api/admin/moderation-queue
adminRouter.get("/moderation-queue", (_req, res) => {
  try { res.json(getModerationQueue()); }
  catch (error) { handleError(res, error); }
});

// DELETE /api/admin/issues/:id
adminRouter.delete("/issues/:id", (req, res) => {
  try { res.json(archiveIssue(req.params.id, adminId(req))); }
  catch (error) { handleError(res, error); }
});

// PATCH /api/admin/issues/:id/dismiss
adminRouter.patch("/issues/:id/dismiss", (req, res) => {
  try { res.json(dismissIssue(req.params.id, adminId(req))); }
  catch (error) { handleError(res, error); }
});

// PATCH /api/admin/issues/:id/severity
adminRouter.patch("/issues/:id/severity", (req, res) => {
  try { res.json(overrideIssueSeverity(req.params.id, req.body.severity, adminId(req))); }
  catch (error) { handleError(res, error); }
});

// GET /api/admin/lost-found/all
adminRouter.get("/lost-found/all", (_req, res) => {
  try { res.json(getAllLostFoundItems()); }
  catch (error) { handleError(res, error); }
});

// GET /api/admin/lost-found
adminRouter.get("/lost-found", (_req, res) => {
  try { res.json(getActiveLostFoundItems()); }
  catch (error) { handleError(res, error); }
});

// DELETE /api/admin/lost-found/:id
adminRouter.delete("/lost-found/:id", (req, res) => {
  try { res.json(resolveLostFoundItem(req.params.id, adminId(req))); }
  catch (error) { handleError(res, error); }
});

// GET /api/admin/users
adminRouter.get("/users", (_req, res) => {
  try { res.json(getStudentUsers()); }
  catch (error) { handleError(res, error); }
});

// PATCH /api/admin/users/:id/suspend
adminRouter.patch("/users/:id/suspend", (req, res) => {
  try { res.json(suspendUser(req.params.id, adminId(req))); }
  catch (error) { handleError(res, error); }
});

// PATCH /api/admin/users/:id/ban
adminRouter.patch("/users/:id/ban", (req, res) => {
  try { res.json(banUser(req.params.id, adminId(req))); }
  catch (error) { handleError(res, error); }
});

// PATCH /api/admin/users/:id/reactivate
adminRouter.patch("/users/:id/reactivate", (req, res) => {
  try { res.json(reactivateUser(req.params.id, adminId(req))); }
  catch (error) { handleError(res, error); }
});

// GET /api/admin/audit-log
adminRouter.get("/audit-log", (_req, res) => {
  try { res.json(getAuditLogs()); }
  catch (error) { handleError(res, error); }
});

// GET /api/admin/analytics
adminRouter.get("/analytics", (_req, res) => {
  try { res.json(getAnalytics()); }
  catch (error) { handleError(res, error); }
});

// GET /api/admin/users/:id/history
adminRouter.get("/users/:id/history", (req, res) => {
  try { res.json(getUserHistory(req.params.id)); }
  catch (error) { handleError(res, error); }
});
