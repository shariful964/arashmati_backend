// import TestResult from "../models/testResultModel.js";
// import ActivityLog from "../models/activityLogModel.js";
// import User from "../models/userModel.js";

// // Get dashboard statistics
// export const getDashboardData = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ msg: "User not found" });
//     }

//     // Fetch user's tests
//     const testResults = await TestResult.find({ user: userId });
//     const testsDone = testResults.length;

//     // Calculate Exam Readiness Score as average mark percentage
//     let examReadinessScore = 0;
//     if (testsDone > 0) {
//       const sumPercentage = testResults.reduce((acc, result) => {
//         const percent = (result.score / result.totalMarks) * 100;
//         return acc + percent;
//       }, 0);
//       examReadinessScore = Math.round(sumPercentage / testsDone);
//     }

//     // Fetch recent activities (Latest 1 of each type in fixed order)
//     const activities = [];

//     const latestTest = await ActivityLog.findOne({
//       user: userId,
//       type: "test_completed",
//     }).sort({ createdAt: -1 });
//     if (latestTest) {
//       activities.push(latestTest);
//     }

//     const latestStreak = await ActivityLog.findOne({
//       user: userId,
//       type: "streak_achieved",
//     }).sort({ createdAt: -1 });
//     if (latestStreak) {
//       activities.push(latestStreak);
//     }

//     const latestProgress = await ActivityLog.findOne({
//       user: userId,
//       type: "progress_updated",
//     }).sort({ createdAt: -1 });
//     if (latestProgress) {
//       activities.push(latestProgress);
//     }

//     return res.status(200).json({
//       msg: "Dashboard data fetched successfully",
//       data: {
//         examReadinessScore,
//         testsDone,
//         streak: user.streak || 0,
//         recentActivity: activities,
//       },
//     });
//   } catch (error) {
//     return res.status(500).json({
//       msg: error.message || "Internal Server Error",
//     });
//   }
// };

// // Submit test result
// export const submitTestResult = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { testName, score, totalMarks = 100 } = req.body;

//     if (!testName || score === undefined) {
//       return res.status(400).json({
//         msg: "Please provide testName and score",
//       });
//     }

//     // Get previous test results to calculate progress later
//     const previousTestResults = await TestResult.find({ user: userId });
//     const previousTestsCount = previousTestResults.length;
//     let oldReadinessScore = 0;
//     if (previousTestsCount > 0) {
//       const sumPercentage = previousTestResults.reduce((acc, result) => {
//         return acc + (result.score / result.totalMarks) * 100;
//       }, 0);
//       oldReadinessScore = Math.round(sumPercentage / previousTestsCount);
//     }

//     // Save the new test result
//     const newTest = await TestResult.create({
//       user: userId,
//       testName,
//       score,
//       totalMarks,
//     });

//     // Calculate new readiness score
//     const allTestResults = [...previousTestResults, newTest];
//     const newTestsCount = allTestResults.length;
//     const sumPercentageNew = allTestResults.reduce((acc, result) => {
//       return acc + (result.score / result.totalMarks) * 100;
//     }, 0);
//     const newReadinessScore = Math.round(sumPercentageNew / newTestsCount);

//     // Create activity log for completed test
//     await ActivityLog.create({
//       user: userId,
//       type: "test_completed",
//       title: `Completed: ${testName}`,
//     });

//     // Log progress update activity if readiness score changed
//     if (previousTestsCount > 0) {
//       const progressDiff = newReadinessScore - oldReadinessScore;
//       if (progressDiff > 0) {
//         await ActivityLog.create({
//           user: userId,
//           type: "progress_updated",
//           title: `Progress Updated: +${progressDiff}%`,
//         });
//       } else if (progressDiff < 0) {
//         await ActivityLog.create({
//           user: userId,
//           type: "progress_updated",
//           title: `Progress Updated: -${Math.abs(progressDiff)}%`,
//         });
//       }
//     }

//     return res.status(201).json({
//       msg: "Test result submitted successfully",
//       testResult: newTest,
//       newReadinessScore,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       msg: error.message || "Internal Server Error",
//     });
//   }
// };

import TestResult from "../models/testResultModel.js";
import ActivityLog from "../models/activityLogModel.js";
import User from "../models/userModel.js";
import Chapter from "../models/chapterModel.js";
import Lesson from "../models/lessonModel.js";

// ========================================
// HELPER: Date কে "Time Ago" তে convert করা
// ========================================
const getTimeAgo = (date) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 1) return `${diffDay} days ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffHour > 0) return `${diffHour} hours ago`;
  if (diffMin > 0) return `${diffMin} minutes ago`;
  return "Just now";
};

// ========================================
// HELPER: Score based status text
// ========================================
const getExamStatus = (score, testsDone) => {
  if (testsDone === 0) {
    return "Beginning";
  }

  if (score < 40) {
    return "Very Bad";
  } else if (score < 60) {
    return "Bad";
  } else if (score < 70) {
    return "Average";
  } else if (score < 80) {
    return "Good";
  } else if (score < 90) {
    return "Very Good";
  } else {
    return "Excellent";
  }
};

// ========================================
// GET DASHBOARD DATA
// ========================================
export const getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Fetch user's tests
    const testResults = await TestResult.find({ user: userId });

    // ✅ Unique completed tests count (retake count হবে না)
    const completedUniqueTests = new Set(testResults.map((r) => r.testNumber))
      .size;

    // Calculate Exam Readiness Score (শুধু unique tests এর best score থেকে)
    let examReadinessScore = 0;
    if (completedUniqueTests > 0) {
      // প্রতিটা test এর best score বের করো
      const bestScoresPerTest = new Map();
      testResults.forEach((r) => {
        const currentBest = bestScoresPerTest.get(r.testNumber);
        if (!currentBest || r.score > currentBest) {
          bestScoresPerTest.set(r.testNumber, r.score);
        }
      });

      const uniqueBestScores = Array.from(bestScoresPerTest.values());

      if (uniqueBestScores.length > 0) {
        const sumPercentage = uniqueBestScores.reduce((acc, score) => {
          return acc + score;
        }, 0);
        examReadinessScore = Math.round(
          sumPercentage / uniqueBestScores.length,
        );
      }
    }

    const examStatus = getExamStatus(examReadinessScore, completedUniqueTests);

    // ✅ সব Published Chapters fetch করো
    const allChapters = await Chapter.find({ status: "published" })
      .select("chapterNumber title subtitle coverImage")
      .sort({ chapterNumber: 1 });

    // ✅ Study Topics হিসেবে chapters গুলো সাজাও
    const studyTopics = await Promise.all(
      allChapters.map(async (chapter) => {
        const totalLessons = await Lesson.countDocuments({
          chapterId: chapter._id,
        });

        return {
          chapterNumber: chapter.chapterNumber,
          chapterId: chapter._id,
          title: chapter.title,
          subtitle: chapter.subtitle || "",
          coverImage: chapter.coverImage || "",
          totalLessons,
        };
      }),
    );

    // Fetch recent activities
    const activitiesRaw = [];

    const latestTest = await ActivityLog.findOne({
      user: userId,
      type: "test_completed",
    }).sort({ createdAt: -1 });
    if (latestTest) {
      activitiesRaw.push(latestTest);
    }

    const latestStreak = await ActivityLog.findOne({
      user: userId,
      type: "streak_achieved",
    }).sort({ createdAt: -1 });
    if (latestStreak) {
      activitiesRaw.push(latestStreak);
    }

    const latestProgress = await ActivityLog.findOne({
      user: userId,
      type: "progress_updated",
    }).sort({ createdAt: -1 });
    if (latestProgress) {
      activitiesRaw.push(latestProgress);
    }

    // ✅ Activities কে format করো (শুধু প্রয়োজনীয় fields)
    const recentActivity = activitiesRaw.map((activity) => ({
      _id: activity._id,
      type: activity.type,
      title: activity.title,
      timeAgo: getTimeAgo(activity.createdAt),
      createdAt: activity.createdAt,
    }));

    return res.status(200).json({
      msg: "Dashboard data fetched successfully",
      data: {
        examReadinessScore,
        examStatus,
        totalTests: 10, // ✅ total tests always 10
        testsDone: completedUniqueTests, // ✅ শুধু unique tests count
        streak: user.streak || 0,
        studyTopics,
        recentActivity,
      },
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal Server Error",
    });
  }
};

// ========================================
// SUBMIT TEST RESULT (Updated - No Negative Progress)
// ========================================
export const submitTestResult = async (req, res) => {
  try {
    const userId = req.user.id;
    const { testName, score, totalMarks = 100 } = req.body;

    if (!testName || score === undefined) {
      return res.status(400).json({
        msg: "Please provide testName and score",
      });
    }

    // Get previous test results
    const previousTestResults = await TestResult.find({ user: userId });

    // ✅ পুরনো readiness score calculate করো (unique best scores থেকে)
    let oldReadinessScore = 0;
    if (previousTestResults.length > 0) {
      const bestScoresPerTest = new Map();
      previousTestResults.forEach((r) => {
        const currentBest = bestScoresPerTest.get(r.testNumber);
        if (!currentBest || r.score > currentBest) {
          bestScoresPerTest.set(r.testNumber, r.score);
        }
      });

      const uniqueBestScores = Array.from(bestScoresPerTest.values());
      if (uniqueBestScores.length > 0) {
        const sumPercentage = uniqueBestScores.reduce(
          (acc, score) => acc + score,
          0,
        );
        oldReadinessScore = Math.round(sumPercentage / uniqueBestScores.length);
      }
    }

    // Save the new test result
    const newTest = await TestResult.create({
      user: userId,
      testName,
      score,
      totalMarks,
    });

    // ✅ নতুন readiness score calculate করো (unique best scores থেকে)
    const allTestResults = [...previousTestResults, newTest];
    const bestScoresPerTestNew = new Map();
    allTestResults.forEach((r) => {
      const currentBest = bestScoresPerTestNew.get(r.testNumber);
      if (!currentBest || r.score > currentBest) {
        bestScoresPerTestNew.set(r.testNumber, r.score);
      }
    });

    const uniqueBestScoresNew = Array.from(bestScoresPerTestNew.values());
    let newReadinessScore = 0;
    if (uniqueBestScoresNew.length > 0) {
      const sumPercentageNew = uniqueBestScoresNew.reduce(
        (acc, score) => acc + score,
        0,
      );
      newReadinessScore = Math.round(
        sumPercentageNew / uniqueBestScoresNew.length,
      );
    }

    // Create activity log for completed test
    await ActivityLog.create({
      user: userId,
      type: "test_completed",
      title: `Completed: ${testName}`,
    });

    // ✅ শুধু পজিটিভ প্রোগ্রেস লগ করবে। নেগেটিভ হলে কিছুই করবে না।
    if (previousTestResults.length > 0) {
      const progressDiff = newReadinessScore - oldReadinessScore;

      if (progressDiff > 0) {
        await ActivityLog.create({
          user: userId,
          type: "progress_updated",
          title: `Progress Updated: +${progressDiff}%`,
        });
      }
      // ❌ নেগেটিভ হলে কোনো লগ তৈরি হবে না (ইউজার হতাশ হবে না)
    }

    return res.status(201).json({
      msg: "Test result submitted successfully",
      testResult: newTest,
      newReadinessScore,
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal Server Error",
    });
  }
};
