import express from "express";
import {
  forgotPassword,
  forgotVerifyOtp,
  loginUser,
  logoutUser,
  registerUser,
  resetPassword,
  verifyRegisterOtp,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Register user
router.post("/register", registerUser);

// Verify OTP
router.post("/verify-otp", verifyRegisterOtp);

// Login user
router.post("/login", loginUser);
//forgot password
router.post("/forgot-password", forgotPassword);
router.post("/forgot-password-otp", forgotVerifyOtp);
router.post("/reset-password", resetPassword);
router.post("/logout", protect, logoutUser);

export default router;
