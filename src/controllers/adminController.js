import User from "../models/userModel.js";
import TestResult from "../models/testResultModel.js";
import UserChapterProgress from "../models/userChapterProgressModel.js";
import ActivityLog from "../models/activityLogModel.js";
import { deleteFromCloudinary } from "../utils/imageUpload.js";


//get monthly user stats
export const getMonthlyUserStats = async (req, res) => {
  try {
    //dynamic year from query
    const year = Number(req.query.year);
    // fallback if year not send
    const targetYear = year || new Date().getFullYear();
    const startDate = new Date(`${targetYear}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${targetYear}-12-31T23:59:59.999Z`);
    const users = await User.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
      isVerified: true,
    });
    // 12 month init
    const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      totalUsers: 0,
    }));
    //count logic
    users.forEach((user) => {
      const month = new Date(user.createdAt).getMonth();
      monthlyStats[month].totalUsers += 1;
    });
    return res.status(200).json({
      year: targetYear,
      data: monthlyStats,
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal Server Error",
    });
  }
};

// controllers/userController.js

export const getAllUsers = async (req, res) => {
  try {
    
    const users = await User.find({isVerified: true})
      .select("name email role profile_pic createdAt isVerified")
      .sort({ createdAt: -1 }); 

    // ২. প্রতিটি ইউজারের টেস্ট পরিসংখ্যান বের করো
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const testResults = await TestResult.find({ user: user._id });
        
        // মোট টেস্ট সংখ্যা (Unique tests)
        const totalTestsTaken = new Set(testResults.map(r => r.testNumber)).size;
        
        // সর্বশেষ লগিন বা জয়েন ডেট
        const joinDate = user.createdAt;

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          isVerified: user.isVerified,
          profile_pic: user.profile_pic,
          role: user.role,
          joinDate: joinDate,
          totalTestsTaken,
          // তুমি চাইলে এখানে 'plan' ফিল্ডও যোগ করতে পারো যদি User মডেলে থাকে
        };
      })
    );

    return res.status(200).json({
      msg: "All users fetched successfully",
      count: usersWithStats.length,
      data: usersWithStats,
    });
  } catch (error) {
    return res.status(500).json({ msg: error.message || "Internal server error" });
  }
};


// controllers/userController.js

export const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. ইউজার বেসিক ইনফো
    const user = await User.findById(id).select("-password -otp -resetToken");
    if (!user) return res.status(404).json({ msg: "User not found" });

    // 2. টেস্ট স্ট্যাটিস্টিক্স (আগের লজিক অনুযায়ী)
    const testResults = await TestResult.find({ user: id }).sort({ takenAt: 1 });
    const uniqueTests = new Set(testResults.map(r => r.testNumber));
    
    const bestScoresMap = new Map();
    testResults.forEach(r => {
      const currentBest = bestScoresMap.get(r.testNumber);
      if (!currentBest || r.score > currentBest) bestScoresMap.set(r.testNumber, r.score);
    });
    const bestScoresArray = Array.from(bestScoresMap.values());
    const bestScore = bestScoresArray.length > 0 ? Math.max(...bestScoresArray) : 0;
    const averageScore = bestScoresArray.length > 0 
      ? Math.round(bestScoresArray.reduce((a, b) => a + b, 0) / bestScoresArray.length) 
      : 0;

    // ✅ 3. Chapters Done গণনা (UserChapterProgress থেকে)
    const chaptersDone = await UserChapterProgress.countDocuments({
      userId: id,           // ️ মডেলে 'userId' ফিল্ড আছে, 'user' নয়
      isChapterCompleted: true // শুধু সম্পূর্ণ হওয়া চ্যাপ্টারগুলো গণনা করবে
    });

    return res.status(200).json({
      msg: "User details fetched successfully",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          profile_pic: user.profile_pic,
          role: user.role,
          isVerified: user.isVerified,
          streak: user.streak,
          lastLoginDate: user.lastLoginDate,
          createdAt: user.createdAt,
        },
        stats: {
          testsTaken: uniqueTests.size,
          averageScore,
          bestScore,
          chaptersDone: chaptersDone, //  এখন সঠিক সংখ্যা আসবে
        },
        scoreHistory: testResults.map(r => ({
          date: r.takenAt,
          score: r.score,
          testName: r.testName || `Test ${r.testNumber}`
        }))
      }
    });
  } catch (error) {
    console.error("Get User Details Error:", error);
    return res.status(500).json({ msg: error.message || "Internal server error" });
  }
};


// delete user 


export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // ১. ইউজার খুঁজে বের করো (প্রোফাইল ছবি ও সেফটি চেকের জন্য)
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // ️ Safety Check: Admin নিজেকে ডিলিট করতে পারবে না
    if (req.user._id.toString() === id) {
      return res.status(403).json({ 
        msg: "You cannot delete your own account from the admin panel." 
      });
    }

    // ২. Cloudinary থেকে কাস্টম প্রোফাইল ছবি ডিলিট করো
    // ডিফল্ট ছবি বা public_id না থাকলে ডিলিট করার দরকার নেই
    if (user.profile_pic_public_id && !user.profile_pic.includes("default")) {
      try {
        await deleteFromCloudinary(user.profile_pic_public_id);
      } catch (err) {
        console.error("Cloudinary image delete failed:", err.message);
        // ইমেজ ডিলিট ফেল করলেও ইউজার ডিলিট প্রক্রিয়া চালিয়ে যাও
      }
    }

    // ৩. সম্পর্কিত সব ডাটা একসাথে মুছে ফেলো (Cascading Delete)
    // লক্ষ্য করো: ActivityLog ও TestResult এ 'user' ফিল্ড, কিন্তু Progress এ 'userId' ফিল্ড
    await Promise.all([
      ActivityLog.deleteMany({ user: id }),
      TestResult.deleteMany({ user: id }),
      UserChapterProgress.deleteMany({ userId: id })
    ]);

    // . ইউজার অ্যাকাউন্ট স্থায়ীভাবে ডিলিট করো
    await User.findByIdAndDelete(id);

    return res.status(200).json({
      msg: "User and all associated data permanently deleted.",
      deletedUserId: id
    });

  } catch (error) {
    console.error("Delete User Error:", error);
    return res.status(500).json({ 
      msg: error.message || "Internal server error" 
    });
  }
};