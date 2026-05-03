import { getDatabase } from '../db/database';
import { NotFoundError, ValidationError } from './errors';

const VALID_SEVERITIES = ['Mild', 'Medium', 'Large', 'Severe'];

function logAudit(adminId: number, action: string, contentId: number | string) {
  getDatabase()
    .prepare('INSERT INTO audit_logs (admin_user_id, action, affected_content_id) VALUES (?, ?, ?)')
    .run(adminId, action, contentId);
}

export function getAllIssues() {
  return getDatabase().prepare('SELECT * FROM issues ORDER BY created_at DESC').all();
}

export function getModerationQueue() {
  return getDatabase()
    .prepare("SELECT * FROM issues WHERE status = 'active' AND report_count > 1 ORDER BY report_count DESC")
    .all();
}

/*export function archiveIssue(issueId: string, adminId: number) {
  getDatabase().prepare("UPDATE issues SET status = 'archived' WHERE id = ?").run(issueId);
  logAudit(adminId, 'REMOVED_ISSUE', issueId);
  return { message: `Issue ${issueId} has been archived.` };
}*/
export function archiveIssue(issueId: string, adminId: number) {
  const result = getDatabase().prepare("UPDATE issues SET status = 'archived' WHERE id = ?").run(issueId);
  if (result.changes === 0) throw new NotFoundError('Issue not found.');
  logAudit(adminId, 'REMOVED_ISSUE', issueId);
  return { message: `Issue ${issueId} has been archived` };
}

export function dismissIssue(issueId: string, adminId: number) {
  const result = getDatabase()
    .prepare('UPDATE issues SET report_count = 0 WHERE id = ?')
    .run(issueId);
  if (result.changes === 0) throw new NotFoundError('Issue not found.');
  logAudit(adminId, 'DISMISSED_ISSUE_FLAG', issueId);
  return { message: `Issue ${issueId} dismissed and kept.` };
}

export function overrideIssueSeverity(issueId: string, severity: string, adminId: number) {
  if (!VALID_SEVERITIES.includes(severity))
    throw new ValidationError(`severity must be one of: ${VALID_SEVERITIES.join(', ')}`);
  const result = getDatabase()
    .prepare('UPDATE issues SET severity = ? WHERE id = ?')
    .run(severity, issueId);
  if (result.changes === 0) throw new NotFoundError('Issue not found.');
  logAudit(adminId, 'OVERRODE_SEVERITY', issueId);
  return { message: `Issue ${issueId} severity set to ${severity}` };
}

export function getAllLostFoundItems() {
  return getDatabase()
    .prepare('SELECT * FROM lost_found_items ORDER BY created_at DESC')
    .all();
}

export function getActiveLostFoundItems() {
  return getDatabase()
    .prepare("SELECT * FROM lost_found_items WHERE status = 'active' ORDER BY created_at DESC")
    .all();
}

/*export function resolveLostFoundItem(itemId: string, adminId: number) {
  getDatabase().prepare("UPDATE lost_found_items SET status = 'resolved' WHERE id = ?").run(itemId);
  logAudit(adminId, 'RESOLVED_LNF', itemId);
  return { message: `Item ${itemId} has been resolved/removed.` };
}*/
export function resolveLostFoundItem(itemId: string, adminId: number) {
  const result = getDatabase().prepare("UPDATE lost_found_items SET status = 'resolved' WHERE id = ?").run(itemId);
  if (result.changes === 0) throw new NotFoundError('Item not found');
  logAudit(adminId, 'RESOLVED_LNF', itemId);
  return { message: `Item ${itemId} has been resolved/removed` };
}

export function getStudentUsers() {
  return getDatabase()
    .prepare("SELECT id, email, status, role FROM users WHERE role = 'student'")
    .all();
}

/*export function suspendUser(userId: string, adminId: number) {
  getDatabase().prepare("UPDATE users SET status = 'suspended' WHERE id = ?").run(userId);
  logAudit(adminId, 'SUSPENDED_USER', userId);
  return { message: `User ${userId} suspended.` };
}*/
export function suspendUser(userId: string, adminId: number) {
  const result = getDatabase().prepare("UPDATE users SET status = 'suspended' WHERE id = ?").run(userId);
  if (result.changes === 0) throw new NotFoundError('User not found');
  logAudit(adminId, 'SUSPENDED_USER', userId);
  return { message: `User ${userId} suspended` };
}

export function banUser(userId: string, adminId: number) {
  const db = getDatabase();
  db.prepare("UPDATE users SET status = 'banned' WHERE id = ?").run(userId);
  db.prepare('DELETE FROM issues WHERE reporter_id = ?').run(userId);
  db.prepare('DELETE FROM lost_found_items WHERE reporter_id = ?').run(userId);
  logAudit(adminId, 'BANNED_USER_AND_WIPED_CONTENT', userId);
  return { message: `User ${userId} banned and all their content was permanently deleted.` };
}

/*export function reactivateUser(userId: string, adminId: number) {
  getDatabase().prepare("UPDATE users SET status = 'active' WHERE id = ?").run(userId);
  logAudit(adminId, 'REACTIVATED_USER', userId);
  return { message: `User ${userId} reactivated.` };
}*/
export function reactivateUser(userId: string, adminId: number) {
  const result = getDatabase().prepare("UPDATE users SET status = 'active' WHERE id = ?").run(userId);
  if (result.changes === 0) throw new NotFoundError('User not found');
  logAudit(adminId, 'REACTIVATED_USER', userId);
  return { message: `User ${userId} reactiveated` };
}

export function getAuditLogs() {
  return getDatabase().prepare(`
    SELECT a.id, a.action, a.affected_content_id, a.timestamp, u.email AS admin_email
    FROM audit_logs a
    LEFT JOIN users u ON a.admin_user_id = u.id
    ORDER BY a.timestamp DESC
    LIMIT 50
  `).all();
}

export function getAnalytics() {
  return getDatabase().prepare(`
    SELECT
      (SELECT COUNT(*) FROM issues WHERE status = 'active') AS activeIssues,
      (SELECT COUNT(*) FROM issues WHERE status = 'active' AND report_count > 1) AS flaggedItems,
      (SELECT COUNT(*) FROM lost_found_items WHERE status = 'active') AS openLnF
  `).get();
}

export function getUserHistory(userId: string) {
  return getDatabase().prepare(`
    SELECT id, 'issue' AS record_type, category AS title, severity, description, status, created_at
    FROM issues WHERE reporter_id = ?
    UNION ALL
    SELECT id, 'lost_found' AS record_type, title, NULL AS severity, description, status, created_at
    FROM lost_found_items WHERE reporter_id = ?
    ORDER BY created_at DESC
  `).all(userId, userId);
}
