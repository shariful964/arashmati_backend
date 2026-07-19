import express from "express";
import {
  getChapters,
  getChapterById,
  createChapter,
  toggleChapterStatus,
  deleteChapter,
  updateChapter,
} from "../controllers/chapterController.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get("/", protect, getChapters);
router.get("/:id", protect, getChapterById);

// ✅ upload.fields([...]) এর বদলে upload.any() ব্যবহার করো
router.post(
  "/",
  protect,
  adminOnly,
  upload.any(), // ← যেকোনো field name accept করবে
  createChapter
);

// ✅ Update route ও same ভাবে change করো
// ⚠️ Note: তোমার controller updateChapter হিসেবে আছে, 
// কিন্তু route এ PATCH আছে। Frontend PUT call করছে কিনা check করো।
// যদি Frontend PUT করে, তাহলে এটা router.put হওয়া উচিত।
router.put(
  "/:id",
  protect,
  adminOnly,
  upload.any(), // ← যেকোনো field name accept করবে
  updateChapter
);

router.patch("/:id/status", protect, adminOnly, toggleChapterStatus);
router.delete("/:id", protect, adminOnly, deleteChapter);

export default router;