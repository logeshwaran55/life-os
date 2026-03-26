import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import passport from "passport";
import { UserModel } from "../models/User.js";

const router = Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ensureDatabaseConnected = (res) => {
  // readyState: 1 = connected
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  res.status(503).json({ message: "Database is temporarily unavailable. Please try again shortly." });
  return false;
};

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is missing. Add it to backend/.env");
  }

  return secret;
};

const createToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
    },
    getJwtSecret(),
    { expiresIn: "7d" }
  );
};

const formatUser = (user) => ({
  id: user._id.toString(),
  email: user.email,
  name: user.name ?? "",
  phone: user.phone ?? "",
  avatar: user.avatar ?? "",
  createdAt: user.createdAt,
});

const getFrontendBaseUrl = () => {
  return process.env.FRONTEND_BASE_URL || "https://life-os-kohl-psi.vercel.app";
};

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${getFrontendBaseUrl()}/login?error=google_auth_failed` }),
  (req, res) => {
    const user = req.user;

    if (!user) {
      res.redirect(`${getFrontendBaseUrl()}/login?error=google_auth_failed`);
      return;
    }

    const token = createToken(user);
    const redirectUrl = `${getFrontendBaseUrl()}/oauth-success?token=${encodeURIComponent(token)}`;
    res.redirect(redirectUrl);
  }
);

router.post("/signup", async (req, res) => {
  try {
    if (!ensureDatabaseConnected(res)) {
      return;
    }

    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ message: "Password must be at least 8 characters" });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      res.status(400).json({ message: "Please provide a valid email address" });
      return;
    }
    const existingUser = await UserModel.findOne({ email: normalizedEmail }).lean();

    if (existingUser) {
      res.status(409).json({ message: "An account with this email already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await UserModel.create({
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = createToken(user);

    res.status(201).json({
      token,
      user: formatUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: "Signup failed", error: String(error) });
  }
});

router.post("/login", async (req, res) => {
  try {
    if (!ensureDatabaseConnected(res)) {
      return;
    }

    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      res.status(400).json({ message: "Please provide a valid email address" });
      return;
    }
    const user = await UserModel.findOne({ email: normalizedEmail }).select("+password");

    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const token = createToken(user);

    res.json({
      token,
      user: formatUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: String(error) });
  }
});

router.post("/forgot-password", async (req, res) => {
  if (!ensureDatabaseConnected(res)) {
    return;
  }

  const email = String(req.body?.email ?? "").trim().toLowerCase();
  if (!email || !EMAIL_REGEX.test(email)) {
    res.status(400).json({ message: "Please provide a valid email address" });
    return;
  }

  // Placeholder endpoint for future password reset email integration.
  res.status(202).json({ message: "Password reset flow is not enabled yet." });
});

export default router;
