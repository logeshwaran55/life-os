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
    const rawCookieHeader = req.headers.cookie ?? "";

    const cookieToken = rawCookieHeader
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith("token="))
      ?.slice("token=".length);

    const bearerToken = authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    const token = bearerToken || cookieToken;

    if (!token) {
      res.status(401).json({ success: false, message: "Missing authentication token" });
      return;
    }

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
