import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getOverallProgress,
  getScoreHistory,
  getTestHistory,
} from "../controllers/progressTrackerController.js";

const router = express.Router();

router.get("/overview", protect, getOverallProgress);
router.get("/score-history", protect, getScoreHistory);
router.get("/test-history", protect, getTestHistory);

export default router;