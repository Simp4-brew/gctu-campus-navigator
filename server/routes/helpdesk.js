import express from "express";

import Contact from "../models/Contact.js";
import Faq from "../models/Faq.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { textSearch } from "../utils/textSearch.js";

const router = express.Router();

// GET /api/faqs
router.get(
  "/faqs",
  asyncHandler(async (req, res) => {
    res.json(await Faq.find());
  }),
);

// GET /api/faqs/search?q=wifi
router.get(
  "/faqs/search",
  asyncHandler(async (req, res) => {
    res.json(await textSearch(Faq, req.query.q));
  }),
);

// GET /api/contacts
router.get(
  "/contacts",
  asyncHandler(async (req, res) => {
    res.json(await Contact.find());
  }),
);

export default router;
