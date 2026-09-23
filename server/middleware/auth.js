import jwt from "jsonwebtoken";

// Shared by the login route (signing) and this middleware (verifying) so the
// two can never drift apart.
export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
