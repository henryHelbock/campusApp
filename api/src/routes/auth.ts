import { Router } from "express";
import { authenticate, requireAuth } from "../middleware/auth";
import { handleError } from "../utils/handleError";
import { registerUser, loginUser, getUserProfile } from "../services/authService";

export const authRouter = Router();

// POST /api/auth/register
authRouter.post("/register", async (req, res) => {
  try {
    const result = registerUser(req.body.email, req.body.password);
    res.status(201).json(result);
  } catch (error) {
    handleError(res, error);
  }
});

// POST /api/auth/login
authRouter.post("/login", async (req, res) => {
  try {
    const result = loginUser(req.body.email, req.body.password);
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
});

// POST /api/auth/refresh
authRouter.post("/refresh", (_req, res) => {
  res.status(501).json({ message: "Not implemented: refresh token" });
});

// GET /api/auth/me
authRouter.get("/me", authenticate, requireAuth, (req, res) => {
  try {
    res.json(getUserProfile((req as any).user.id));
  } catch (error) {
    handleError(res, error);
  }
});
