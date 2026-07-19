import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";
import { createFAQ, deleteFAQ, getFAQs, updateFAQ } from "../controllers/faqController.js";


const router = express.Router();

router.get("/", getFAQs );
router.post("/", protect, adminOnly, createFAQ);
router.patch("/:id", protect, adminOnly, updateFAQ);
router.put("/:id", protect, adminOnly, updateFAQ);
router.delete("/:id", protect, adminOnly, deleteFAQ);

export default router;