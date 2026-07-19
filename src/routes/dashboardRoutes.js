import express from "express";
import {
  getDashboardData,
  submitTestResult,
} from "../controllers/dashboardController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getDashboardData);
router.post("/test-result", protect, submitTestResult);

export default router;