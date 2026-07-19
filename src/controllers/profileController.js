import User from "../models/userModel.js";
import TestResult from "../models/testResultModel.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/imageUpload.js";
import fs from "fs";

// Helper: Delete temporary file
const deleteTempFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// ========================================
// GET CURRENT USER PROFILE
// ========================================
export const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select(
      "-password -otp -otpExpiry -resetToken -resetTokenExpiry -__v",
    );

    if (!user) {
      return res.status(404).json({
        msg: "User not found",
      });
    }

    // Test results fetch
    const testResults = await TestResult.find({ user: userId });
    const totalTests = 10;

    // ✅ Unique completed tests count
    const completedUniqueTests = new Set(testResults.map((r) => r.testNumber))
      .size;

    // ✅ প্রতিটা unique test এর best score বের করো
    const bestScoresPerTest = new Map();
    testResults.forEach((r) => {
      const currentBest = bestScoresPerTest.get(r.testNumber);
      if (!currentBest || r.score > currentBest) {
        bestScoresPerTest.set(r.testNumber, r.score);
      }
    });

    // ✅ Best scores গুলোর array বানাও
    const uniqueBestScores = Array.from(bestScoresPerTest.values());

    // ✅ Best score (সব tests এর মধ্যে highest)
    const bestScore =
      uniqueBestScores.length > 0 ? Math.max(...uniqueBestScores) : 0;

    // ✅ Average score (শুধু unique tests এর best scores থেকে)
    const averageScore =
      uniqueBestScores.length > 0
        ? Math.round(
            uniqueBestScores.reduce((acc, score) => acc + score, 0) /
              uniqueBestScores.length,
          )
        : 0;

    return res.status(200).json({
      msg: "Profile fetched successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_pic: user.profile_pic,
        profile_pic_public_id: user.profile_pic_public_id,
        isVerified: user.isVerified,
        streak: user.streak,
        lastLoginDate: user.lastLoginDate,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      testStats: {
        totalTests,
        completedCount: completedUniqueTests,
        bestScore,
        averageScore,
      },
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal server error",
    });
  }
};
// ========================================
// UPDATE PROFILE (Partial Update)
// ========================================
export const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      if (req.file) deleteTempFile(req.file.path);
      return res.status(404).json({
        msg: "User not found",
      });
    }

    let hasChanges = false;

    // ✅ Name update (যদি পাঠানো হয়)
    if (name !== undefined && name.trim() !== "") {
      user.name = name.trim();
      hasChanges = true;
    }

    // ✅ Profile picture update (যদি নতুন image পাঠানো হয়)
    if (req.file) {
      try {
        // পুরনো image Cloudinary থেকে delete করো (যদি default না হয়)
        if (
          user.profile_pic_public_id &&
          user.profile_pic !==
            "https://res.cloudinary.com/dbfttxqgu/image/upload/v1782049446/default_lyursk.png"
        ) {
          await deleteFromCloudinary(user.profile_pic_public_id);
        }

        const uploaded = await uploadToCloudinary(req.file.path, "profiles");
        user.profile_pic = uploaded.url;
        user.profile_pic_public_id = uploaded.publicId;
        hasChanges = true;

        // Temp file delete করো
        deleteTempFile(req.file.path);
      } catch (uploadError) {
        deleteTempFile(req.file.path);
        return res.status(500).json({
          msg: "Failed to upload profile picture",
          error: uploadError.message,
        });
      }
    }

    // কোনো change না হলে
    if (!hasChanges) {
      return res.status(400).json({
        msg: "No fields to update",
      });
    }

    await user.save();

    return res.status(200).json({
      msg: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_pic: user.profile_pic,
        profile_pic_public_id: user.profile_pic_public_id,
        isVerified: user.isVerified,
        streak: user.streak,
        lastLoginDate: user.lastLoginDate,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    if (req.file) deleteTempFile(req.file.path);

    return res.status(500).json({
      msg: error.message || "Internal server error",
    });
  }
};

// ========================================
// REMOVE PROFILE PICTURE (Default এ ফিরিয়ে আনা)
// ========================================
export const removeProfilePic = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        msg: "User not found",
      });
    }

    // Cloudinary থেকে delete করো (যদি custom image থাকে)
    if (
      user.profile_pic_public_id &&
      user.profile_pic !==
        "https://res.cloudinary.com/dbfttxqgu/image/upload/v1782049446/default_lyursk.png"
    ) {
      await deleteFromCloudinary(user.profile_pic_public_id);
    }

    // Default image এ ফিরিয়ে আনো
    user.profile_pic =
      "https://res.cloudinary.com/dbfttxqgu/image/upload/v1782049446/default_lyursk.png";
    user.profile_pic_public_id = null;
    await user.save();

    return res.status(200).json({
      msg: "Profile picture removed successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profile_pic: user.profile_pic,
      },
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal server error",
    });
  }
};



// ========================================
// CHANGE PASSWORD
// ========================================
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmNewPassword } = req.body;

    // ১. সব ফিল্ড আছে কিনা চেক করো
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        msg: "Please provide all required fields",
      });
    }

    // ২. নতুন পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড ম্যাচ করছে কিনা
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        msg: "New password and confirm password do not match",
      });
    }

    // ৩. নতুন পাসওয়ার্ডের দৈর্ঘ্য চেক করো
    if (newPassword.length < 8) {
      return res.status(400).json({
        msg: "Password must be at least 8 characters long",
      });
    }

    // ৪. ইউজার খুঁজে বের করো (পাসওয়ার্ড ফিল্ড সহ)
    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res.status(404).json({
        msg: "User not found",
      });
    }

    // ৫. পুরনো পাসওয়ার্ড সঠিক কিনা যাচাই করো
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({
        msg: "Old password is incorrect",
      });
    }

    // ৬. নতুন পাসওয়ার্ড সেট করো (Mongoose pre-save hook অটোমেটিক হ্যাশ করবে)
    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      msg: "Password changed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal server error",
    });
  }
};
