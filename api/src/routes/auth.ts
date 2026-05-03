import { Router } from "express";
import { authenticate, requireAuth } from "../middleware/auth";
import { handleError } from "../utils/handleError";
import { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  updateUserEmail, 
  updateUserPassword 
} from "../services/authService";

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

// PATCH /api/auth/me
authRouter.patch("/me", authenticate, requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { email, currentPassword, newPassword } = req.body;
    if (email) {
      res.json(updateUserEmail(userId, email));
    } else if (currentPassword && newPassword) {
      res.json(updateUserPassword(userId, currentPassword, newPassword));
    } else {
      res.status(400).json({ error: 'Provide either email or currentPassword + newPassword' });
    }
  } catch (error) {
    handleError(res, error);
  }
})