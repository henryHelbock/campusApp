import { Router } from 'express';

export const authRouter = Router();

// POST /api/auth/register - Register with SUNY Oneonta email
authRouter.post('/register', (_req, res) => {
  // TODO: Validate @oneonta.edu email, hash password, create user, send verification
  res.status(501).json({ message: 'Not implemented: register' });
});

// POST /api/auth/login - Login
authRouter.post('/login', (_req, res) => {
  // TODO: Verify credentials, return JWT token
  res.status(501).json({ message: 'Not implemented: login' });
});

// POST /api/auth/refresh - Refresh token
authRouter.post('/refresh', (_req, res) => {
  // TODO: Validate refresh token, issue new access token
  res.status(501).json({ message: 'Not implemented: refresh token' });
});
