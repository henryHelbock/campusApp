import { Request, Response, NextFunction } from 'express';

/**
 * Placeholder JWT authentication middleware.
 * TODO: Implement real JWT verification with SUNY Oneonta SSO.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    // TODO: Verify JWT token and extract user info
    (req as any).user = {
      id: 1,
      email: 'placeholder@oneonta.edu',
      role: 'student',
    };
    (req as any).token = token;
  }

  next();
}

/**
 * Requires that the request has a valid authenticated user.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!(req as any).user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}
