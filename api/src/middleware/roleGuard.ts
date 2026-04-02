import { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@campusapp/shared';

/**
 * Middleware that restricts access to users with the specified role.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
