import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import Admin from "../models/Admin.js";
import { JWT_SECRET } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

const BCRYPT_ROUNDS = 10;
const TOKEN_LIFETIME = "8h";

const isNonEmptyString = (value) => typeof value === "string" && value.length > 0;

/* First-run bootstrap: with no admin accounts yet, create one from the
   ADMIN_USERNAME / ADMIN_PASSWORD environment variables. */
async function ensureInitialAdmin() {
  if ((await Admin.countDocuments({})) > 0) return;

  await Admin.create({
    username: process.env.ADMIN_USERNAME || "admin",
    password: await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", BCRYPT_ROUNDS),
  });
}

// POST /api/admin/login -> { token, username }
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { username, password } = req.body ?? {};

    // Strings only: an object such as { "$ne": null } would otherwise reach
    // the MongoDB query as an operator (NoSQL injection).
    if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
      return res
        .status(400)
        .json({ error: "username and password are required" });
    }

    await ensureInitialAdmin();

    const admin = await Admin.findOne({ username });
    const passwordMatches = admin && (await bcrypt.compare(password, admin.password));

    // One message for both cases, so the response never reveals whether
    // the username exists.
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      JWT_SECRET,
      { expiresIn: TOKEN_LIFETIME },
    );

    res.json({ token, username: admin.username });
  }),
);

export default router;
