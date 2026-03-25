import jwt from "jsonwebtoken";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is missing. Add it to backend/.env");
  }

  return secret;
};

export const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ success: false, message: "Missing or invalid Authorization header" });
      return;
    }

    const token = authHeader.slice("Bearer ".length);
    const payload = jwt.verify(token, getJwtSecret());

    if (!payload?.userId || typeof payload.userId !== "string") {
      res.status(401).json({ success: false, message: "Invalid token payload" });
      return;
    }

    req.user = {
      id: payload.userId,
      email: typeof payload.email === "string" ? payload.email : "",
    };

    next();
  } catch (_error) {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};
