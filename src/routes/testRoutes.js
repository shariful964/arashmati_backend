import express from "express";
import {
  getTestByNumber,
  getTestList,
  startTest,
  submitTest,
} from "../controllers/testController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getTestList);
router.get("/:testNumber", protect, getTestByNumber);
router.get("/:testNumber/start", protect, startTest);
router.post("/:testNumber/submit", protect, submitTest);

export default router;