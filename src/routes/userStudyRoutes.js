import express from "express";
import {
  getUserStudyMaterials,
  markLessonComplete,
  getChapterProgress,
  resetChapterProgress,
  getUserChapterDetail,       // ← নতুন
  markChapterComplete,         // ← নতুন
} from "../controllers/userStudyController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// User study materials (overall progress)
router.get("/materials", protect, getUserStudyMaterials);

// ✅ নতুন: Chapter detail page (user এর জন্য)
router.get("/chapter/:chapterId", protect, getUserChapterDetail);

// Mark single lesson complete
router.post("/lesson/complete", protect, markLessonComplete);

// ✅ নতুন: Mark entire chapter complete (সব lessons + chapter)
router.post("/chapter/complete", protect, markChapterComplete);

// Get chapter progress
router.get("/chapter/:chapterId/progress", protect, getChapterProgress);

// Reset chapter progress
router.patch("/chapter/reset", protect, resetChapterProgress);

export default router;