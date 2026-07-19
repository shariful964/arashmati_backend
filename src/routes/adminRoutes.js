import express from "express";
import { adminOnly } from "../middleware/adminMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js"; // ← এইটা add করো

import {
  deleteUser,
  getAllUsers,
  getMonthlyUserStats,
  getUserDetails,
} from "../controllers/adminController.js";

import {
  getAllQuestions,
  addQuestion,
  bulkAddQuestions,
  updateQuestion,
  deleteQuestion,
} from "../controllers/adminQuestionController.js";

const router = express.Router();

// ========================================
// USER MANAGEMENT
// ========================================
router.get("/all-users", protect, adminOnly, getAllUsers);
router.get("/monthly-users-stats", protect, adminOnly, getMonthlyUserStats);

// ========================================
// QUESTION MANAGEMENT
// ========================================

// GET - সব questions
router.get("/questions", protect, adminOnly, getAllQuestions);

// POST - নতুন question (with image upload)
router.post(
  "/questions",
  protect,
  adminOnly,
  upload.single("image"), // ← এইটা add করো
  addQuestion
);

// POST - bulk add (without images)
router.post("/questions/bulk", protect, adminOnly, bulkAddQuestions);

// PUT - update question (with image update)
router.put(
  "/questions/:id",
  protect,
  adminOnly,
  upload.single("image"), // ← এইটা add করো
  updateQuestion
);

// PATCH - update question (with image update)
router.patch(
  "/questions/:id",
  protect,
  adminOnly,
  upload.single("image"), // ← এইটা add করো
  updateQuestion
);
// DELETE - delete question
router.delete("/questions/:id", protect, adminOnly, deleteQuestion);


router.get("/:id/details", protect, adminOnly, getUserDetails);
router.delete("/:id", protect, adminOnly, deleteUser);

export default router;