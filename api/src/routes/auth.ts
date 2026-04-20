import { Router } from "express";
import bcrypt from "bcrypt";
import { getDatabase } from "../db/database";
import jwt from "jsonwebtoken";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

// POST /api/auth/register - Register with SUNY Oneonta email
authRouter.post("/register", async (req, res) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res
				.status(400)
				.json({ message: "Email and password are required." });
		}

		const normalizedEmail = email.trim().toLowerCase();
		if (!normalizedEmail.endsWith("@oneonta.edu")) {
			return res
				.status(400)
				.json({ message: "Must use a valid @oneonta.edu email address." });
		}

		if (password.length < 8) {
			return res
				.status(400)
				.json({ message: "Password must be at least 8 characters long." });
		}

		const db = getDatabase();

		const existingUser = db
			.prepare("SELECT id FROM users WHERE email = ?")
			.get(normalizedEmail);
		if (existingUser) {
			return res
				.status(409)
				.json({ message: "An account with this email already exists." });
		}

		const saltRounds = 10;
		const passwordHash = await bcrypt.hash(password, saltRounds);

		const insertStmt = db.prepare(`
      INSERT INTO users (email, password_hash, role, status) 
      VALUES (?, ?, 'student', 'active')
    `);
		const info = insertStmt.run(normalizedEmail, passwordHash);

		// TODO: Plug in Nodemailer, SendGrid, or AWS SES here later for production
		console.log(`[MOCK EMAIL] Verification link sent to ${normalizedEmail}`);

		return res.status(201).json({
			message:
				"Registration successful. Please check your email to verify your account.",
			userId: info.lastInsertRowid,
		});
	} catch (error) {
		console.error("Registration error:", error);
		return res
			.status(500)
			.json({ message: "Internal server error during registration." });
	}
});

// POST /api/auth/login - Login
authRouter.post("/login", async (req, res) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res
				.status(400)
				.json({ message: "Email and password are required." });
		}

		const normalizedEmail = email.trim().toLowerCase();
		const db = getDatabase();

		const user = db
			.prepare(
				`
        SELECT id, email, password_hash, role, status 
        FROM users 
        WHERE email = ?
    `,
			)
			.get(normalizedEmail) as any;

		if (!user) {
			return res.status(401).json({ message: "Invalid email or password." });
		}

		if (user.status !== "active") {
			return res
				.status(403)
				.json({ message: `Access denied. Account is ${user.status}.` });
		}

		const match = await bcrypt.compare(password, user.password_hash);
		if (!match) {
			return res.status(401).json({ message: "Invalid email or password." });
		}

		// IMPORTANT: In production, never hardcode this secret! Put it in your .env file.
		const JWT_SECRET = process.env.JWT_SECRET || "super_secret_dev_key_123";

		const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
			expiresIn: "24h",
		});

		return res.json({
			token,
			user: {
				id: user.id,
				email: user.email,
				role: user.role,
			},
		});
	} catch (error) {
		console.error("Login error:", error);
		return res
			.status(500)
			.json({ message: "Internal server error during login." });
	}
});

// POST /api/auth/refresh - Refresh token
authRouter.post("/refresh", (_req, res) => {
	// TODO: Validate refresh token, issue new access token
	res.status(501).json({ message: "Not implemented: refresh token" });
});
