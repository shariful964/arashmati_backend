import User from "../models/userModel.js";
import crypto from "crypto";
import { generateOtp } from "../utils/generateOtp.js";
import { generateToken } from "../utils/generateToken.js";
import { sendEmail } from "../utils/sendEmail.js";
import ActivityLog from "../models/activityLogModel.js";

// register user
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    //validation
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({
        msg: "Please provide all the fields",
      });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({
        msg: "Password and confirm password do not match",
      });
    }
    // password validation
    if (password.length < 6) {
      return res.status(400).json({
        msg: "Password must be at least 6 characters long",
      });
    }
    // check exist user
    const existsUser = await User.findOne({ email });
    if (existsUser) {
      if (existsUser.isVerified) {
        return res.status(400).json({
          msg: "User already exists.",
        });
      }

      // unverifed user resend OTP
      const otp = generateOtp();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      existsUser.otp = otp;
      existsUser.otpExpiry = otpExpiry;
      await existsUser.save();
      await sendEmail({
        to: email,
        subject: "Verify Email",
        text: `Your OTP is ${otp}. It will expire in 10 minutes`,
      });

      return res.status(200).json({
        msg: "OTP sent to your email. Please verify your email to login",
      });
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // create new user
    const newUser = await User.create({
      name,
      email,
      password,
      otp,
      otpExpiry,
    });
    // send otp
    try {
      await sendEmail({
        to: email,
        subject: "Verify Email",
        text: `Your OTP is ${otp}. It will expire in 10 minutes`,
      });
      return res.status(201).json({
        msg: "User created successfully and OTP sent to your email",
      });
    } catch (error) {
      if (newUser && newUser._id) {
        await User.findByIdAndDelete(newUser._id);
      }
      return res.status(500).json({
        msg: "Failed to send OTP email.",
      });
    }
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({
      msg: error.message || "Server error",
    });
  }
};


// verify register otp
export const verifyRegisterOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    // validation
    if (!email || !otp) {
      return res.status(400).json({
        msg: "Please provide email and OTP",
      });
    }
    const user = await User.findOne({ email });
    console.log("DB OTP:", user.otp, typeof user.otp);
    console.log("Request OTP:", otp, typeof otp);

    // check user
    if (!user) {
      return res.status(400).json({
        msg: "User not found",
      });
    }

    // check OTP is valid
    if (user.otp !== otp) {
      return res.status(400).json({
        msg: "Invalid OTP",
      });
    }

    // check OTP is not expired
    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({
        msg: "OTP is expired",
      });
    }
    // verified user
    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    return res.status(200).json({
      msg: "OTP verified successfully. You can now login.",
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Failed to verify OTP",
    });
  }
};
// login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    // validation
    if (!email || !password) {
      return res.status(400).json({
        msg: "Please provide email and password",
      });
    }
    //check user
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({
        msg: "User not found",
      });
    }
    //check verified user
    if (!user.isVerified) {
      return res.status(400).json({
        msg: "User not verified",
      });
    }
    //check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        msg: "Invalid password",
      });
    }
    // Update login streak
    const now = new Date();
    const todayStr = now.toDateString();
    let oldStreak = user.streak || 0;
    let newStreak = oldStreak;

    if (!user.lastLoginDate) {
      newStreak = 1;
    } else {
      const lastLogin = new Date(user.lastLoginDate);
      const lastLoginStr = lastLogin.toDateString();

      if (todayStr !== lastLoginStr) {
        const date1 = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        const date2 = new Date(
          lastLogin.getFullYear(),
          lastLogin.getMonth(),
          lastLogin.getDate(),
        );
        const diffTime = Math.abs(date1 - date2);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          newStreak = oldStreak + 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      }
    }

    user.streak = newStreak;
    user.lastLoginDate = now;

    //generate token
    const { accessToken, refreshToken } = generateToken(user);
    // ✅ Refresh token database এ save করো (logout এর জন্য)
    user.refreshToken = refreshToken;
    await user.save();
    // await user.save();

    // Create activity logs for streak milestone if it increased or reset to 1
    if (newStreak > oldStreak || newStreak === 1) {
      const title = `Achieved: ${newStreak}-Day Streak`;
      const existingLog = await ActivityLog.findOne({
        user: user._id,
        type: "streak_achieved",
        title,
      });
      if (!existingLog) {
        await ActivityLog.create({
          user: user._id,
          type: "streak_achieved",
          title,
        });
      }
    }

    const userData = await User.findById(user._id).select(
      "-password -otp -otpExpiry -resetToken -resetTokenExpiry -__v -streak -lastLoginDate",
    );
    // Include the updated fields manually or select them
    const userDataWithStreak = {
      ...userData.toObject(),
      streak: user.streak,
      lastLoginDate: user.lastLoginDate,
    };

    return res.status(200).json({
      msg: "Login successful",
      accessToken,
      refreshToken,
      userData: userDataWithStreak,
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Failed to login",
    });
  }
};

// forgot password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    // validation
    if (!email) {
      return res.status(400).json({
        msg: "Please provide your email",
      });
    }
    // check user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        msg: "User not found",
      });
    }
    // check verified User
    if (!user.isVerified) {
      return res.status(400).json({
        msg: "User is not verified",
      });
    }
    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    // send OTP
    await sendEmail({
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP is ${otp}. It will expire in 10 minutes`,
    });
    return res.status(200).json({
      msg: "Password Reset OTP sent to your email. Please verify your email to reset password",
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal Server Error",
    });
  }
};

// forgot verify otp
export const forgotVerifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    // validation
    if (!email || !otp) {
      return res.status(400).json({
        msg: "Please provide email and OTP",
      });
    }
    // check user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        msg: "User not found",
      });
    }
    // check OTP valid
    if (user.otp !== otp) {
      return res.status(400).json({
        msg: "Invalid OTP",
      });
    }
    // check OTP expiry
    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({
        msg: "OTP is expired",
      });
    }
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.otp = null;
    user.otpExpiry = null;
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    return res.status(200).json({
      msg: "OTP verified successfully. Please reset your password",
      resetToken,
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal Server Error",
    });
  }
};

// reset password
export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword, confirmNewPassword } = req.body;
    // validation
    if (!resetToken || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        msg: "Please provide all the fields",
      });
    }
    // check password and confirm password
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        msg: "Password and confirm password do not match",
      });
    }
    // check password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        msg: "Password must be at least 6 characters long",
      });
    }

    const user = await User.findOne({
      resetToken,
      resetTokenExpiry: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(404).json({
        msg: "Invalid or expired reset token",
      });
    }
    user.password = newPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();
    return res.status(200).json({
      msg: "Password reset successfully",
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal Server Error",
    });
  }
};

//logout user
export const logoutUser = async (req, res) => {
  try {
    const userId = req.user.id;

    // User এর refreshToken clear করো
    const user = await User.findById(userId);
    if (user) {
      user.refreshToken = null;
      await user.save();
    }

    return res.status(200).json({
      msg: "Logout successful",
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Failed to logout",
    });
  }
};
