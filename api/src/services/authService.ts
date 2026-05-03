import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../db/database';
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from './errors';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_dev_key_123';

export function registerUser(email: string, password: string) {
  if (!email || !password)
    throw new ValidationError('Email and password are required.');

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.endsWith('@oneonta.edu'))
    throw new ValidationError('Must use a valid @oneonta.edu email address.');

  if (password.length < 8)
    throw new ValidationError('Password must be at least 8 characters long.');

  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) throw new ConflictError('An account with this email already exists.');

  const passwordHash = bcrypt.hashSync(password, 10);
  const info = db.prepare(`
    INSERT INTO users (email, password_hash, role, status) VALUES (?, ?, 'student', 'active')
  `).run(normalizedEmail, passwordHash);

  console.log(`[MOCK EMAIL] Verification link sent to ${normalizedEmail}`);

  return { message: 'Registration successful. Please check your email to verify your account.', userId: info.lastInsertRowid };
}

export function loginUser(email: string, password: string) {
  if (!email || !password)
    throw new ValidationError('Email and password are required.');

  const normalizedEmail = email.trim().toLowerCase();
  const db = getDatabase();

  const user = db.prepare(`
    SELECT id, email, password_hash, role, status FROM users WHERE email = ?
  `).get(normalizedEmail) as any;

  if (!user) throw new NotFoundError('Invalid email or password.');
  if (user.status !== 'active')
    throw new ForbiddenError(`Access denied. Account is ${user.status}.`);

  const match = bcrypt.compareSync(password, user.password_hash);
  if (!match) throw new NotFoundError('Invalid email or password.');

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  return { token, user: { id: user.id, email: user.email, role: user.role } };
}

export function getUserProfile(userId: number) {
  const db = getDatabase();

  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId) as any;
  if (!user) throw new NotFoundError('User not found');

  const issues    = db.prepare('SELECT COUNT(*) AS count FROM issues WHERE reporter_id = ?').get(userId) as any;
  const lnf       = db.prepare('SELECT COUNT(*) AS count FROM lost_found_items WHERE reporter_id = ?').get(userId) as any;
  const resolved  = db.prepare("SELECT COUNT(*) AS count FROM issues WHERE reporter_id = ? AND status IN ('fixed', 'archived')").get(userId) as any;
  const resolvedLnf = db.prepare("SELECT COUNT(*) AS count FROM lost_found_items WHERE reporter_id = ? AND status IN ('claimed', 'resolved')").get(userId) as any;

  return {
    email: user.email,
    totalReports: issues.count + lnf.count,
    resolvedReports: resolved.count + resolvedLnf.count,
  };
}
