import express from "express";
import {
  getProfile,
  updateProfile,
  removeProfilePic,
  changePassword
} from "../controllers/profileController.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

// ========================================
// GET PROFILE
// ========================================
router.get("/", protect, getProfile);

// ========================================
// UPDATE PROFILE (Partial Update)
// - name: text field (optional)
// - profile_pic: file field (optional)
// ========================================
router.patch("/", protect, upload.single("profile_pic"), updateProfile);

// ========================================
// REMOVE PROFILE PICTURE (Default এ ফিরিয়ে আনা)
// ========================================
router.delete("/picture", protect, removeProfilePic);

//change password 
router.post("/change-password", protect, changePassword);

export default router;