import TestResult from "../models/testResultModel.js";
import User from "../models/userModel.js";
import moment from "moment";

// ========================================
// GET OVERALL PROGRESS (Readiness, Tests, Accuracy, Streak)
// ========================================
export const getOverallProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    // সব test results fetch করো
    const testResults = await TestResult.find({ user: userId });

    // ✅ Unique completed tests count
    const completedUniqueTests = new Set(testResults.map((r) => r.testNumber))
      .size;

    // ✅ Readiness score calculate করো (unique best scores থেকে)
    let readinessScore = 0;
    if (completedUniqueTests > 0) {
      const bestScoresPerTest = new Map();
      testResults.forEach((r) => {
        const currentBest = bestScoresPerTest.get(r.testNumber);
        if (!currentBest || r.score > currentBest) {
          bestScoresPerTest.set(r.testNumber, r.score);
        }
      });

      const uniqueBestScores = Array.from(bestScoresPerTest.values());
      if (uniqueBestScores.length > 0) {
        const sumScores = uniqueBestScores.reduce(
          (acc, score) => acc + score,
          0,
        );
        readinessScore = Math.round(sumScores / uniqueBestScores.length);
      }
    }

    // This week's tests calculate করো
    const weekAgo = moment().subtract(7, "days").toDate();
    const thisWeekTests = testResults.filter(
      (test) => test.createdAt >= weekAgo,
    );

    // ✅ This week এর readiness score (unique best scores)
    let thisWeekScore = 0;
    if (thisWeekTests.length > 0) {
      const bestScoresThisWeek = new Map();
      thisWeekTests.forEach((r) => {
        const currentBest = bestScoresThisWeek.get(r.testNumber);
        if (!currentBest || r.score > currentBest) {
          bestScoresThisWeek.set(r.testNumber, r.score);
        }
      });

      const uniqueBestScoresThisWeek = Array.from(bestScoresThisWeek.values());
      if (uniqueBestScoresThisWeek.length > 0) {
        const sumThisWeek = uniqueBestScoresThisWeek.reduce(
          (acc, score) => acc + score,
          0,
        );
        thisWeekScore = Math.round(
          sumThisWeek / uniqueBestScoresThisWeek.length,
        );
      }
    }

    // Last week's tests calculate করো
    const lastWeekStart = moment().subtract(14, "days").toDate();
    const lastWeekEnd = moment().subtract(7, "days").toDate();
    const lastWeekTests = testResults.filter(
      (test) => test.createdAt >= lastWeekStart && test.createdAt < lastWeekEnd,
    );

    // ✅ গত সপ্তাহে test আছে কিনা check করো
    const hasLastWeekData = lastWeekTests.length > 0;

    // ✅ Last week এর readiness score (unique best scores)
    let lastWeekScore = 0;
    if (hasLastWeekData) {
      const bestScoresLastWeek = new Map();
      lastWeekTests.forEach((r) => {
        const currentBest = bestScoresLastWeek.get(r.testNumber);
        if (!currentBest || r.score > currentBest) {
          bestScoresLastWeek.set(r.testNumber, r.score);
        }
      });

      const uniqueBestScoresLastWeek = Array.from(bestScoresLastWeek.values());
      if (uniqueBestScoresLastWeek.length > 0) {
        const sumLastWeek = uniqueBestScoresLastWeek.reduce(
          (acc, score) => acc + score,
          0,
        );
        lastWeekScore = Math.round(
          sumLastWeek / uniqueBestScoresLastWeek.length,
        );
      }
    }

    // ✅ Week over week change (গত সপ্তাহে test না থাকলে 0)
    let weekChange = 0;
    if (hasLastWeekData) {
      weekChange = thisWeekScore - lastWeekScore;
    }

    // Accuracy calculate করো
    const accuracy = readinessScore;

    return res.status(200).json({
      msg: "Overall progress fetched successfully",
      data: {
        readinessScore,
        weekChange: weekChange > 0 ? `+${weekChange}%` : `${weekChange}%`,
        testsDone: completedUniqueTests,
        totalTests: 10,
        accuracy,
        streak: user.streak || 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal Server Error",
    });
  }
};

// ========================================
// GET SCORE HISTORY (Chart Data)
// ========================================

export const getScoreHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = "week" } = req.query;
    let startDate;
    if (period === "month") {
      startDate = moment().subtract(30, "days").toDate();
    } else {
      startDate = moment().subtract(7, "days").toDate();
    }

    // fetch all test results
    const testResults = await TestResult.find({
      user: userId,
      createdAt: { $gte: startDate },
    }).sort({ createdAt: 1 });

    // prepare chart data
    const chartData = testResults.map((test) => ({
      testId: test._id,
      testNumber: test.testNumber,
      testName: test.testName,
      score: test.score,
      totalMarks: test.totalMarks,
      date: moment(test.createdAt).format("MMM D, YYYY"),
      day: moment(test.createdAt).format("ddd"),
      dateTime: moment(test.createdAt).format("MMM D, YYYY hh:mm A"),
    }));
    return res.status(200).json({
      msg: "Score history fetched successfully",
      period,
      totalTests: chartData.length,
      data: chartData,
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal Server Error",
    });
  }
};

//====================================
//chart data without retake test
//====================================

// export const getScoreHistory = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { period = "week" } = req.query;

//     let startDate;
//     if (period === "month") {
//       startDate = moment().subtract(30, "days").toDate();
//     } else {
//       startDate = moment().subtract(7, "days").toDate();
//     }

//     // সব test results fetch করো
//     const allResults = await TestResult.find({
//       user: userId,
//       createdAt: { $gte: startDate },
//     });

//     // ✅ প্রতিটা test এর best score বের করো
//     const bestScoresMap = new Map();
//     allResults.forEach((test) => {
//       const currentBest = bestScoresMap.get(test.testNumber);
//       if (!currentBest || test.score > currentBest.score) {
//         bestScoresMap.set(test.testNumber, test);
//       }
//     });

//     // ✅ Unique best scores এর array
//     const uniqueTests = Array.from(bestScoresMap.values());

//     // Sort by testNumber
//     uniqueTests.sort((a, b) => a.testNumber - b.testNumber);

//     // Chart data prepare করো
//     const chartData = uniqueTests.map((test) => ({
//       testId: test._id,
//       testNumber: test.testNumber,
//       testName: test.testName,
//       score: test.score,
//       totalMarks: test.totalMarks,
//       date: moment(test.createdAt).format("YYYY-MM-DD"),
//       day: moment(test.createdAt).format("ddd"),
//       dateTime: moment(test.createdAt).format("MMM D, YYYY h:mm A"),
//     }));

//     return res.status(200).json({
//       msg: "Score history fetched successfully",
//       period,
//       totalTests: chartData.length,
//       data: chartData,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       msg: error.message || "Internal Server Error",
//     });
//   }
// };

// ========================================
// GET TEST HISTORY (List)
// ========================================
export const getTestHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    //fetch all test results for the user
    const allResutls = await TestResult.find({ user: userId });
    const bestScoresMap = new Map();
    const latestTestMap = new Map();
    allResutls.forEach((test) => {
      const currentBest = bestScoresMap.get(test.testNumber);
      if (!currentBest || test.score > currentBest.score) {
        bestScoresMap.set(test.testNumber, {
          score: test.score,
          testId: test._id,
          testName: test.testName,
          createdAt: test.createdAt,
        });
      }
      //latest attempt track for date
      const currentLatest = latestTestMap.get(test.testNumber);
      if (!currentLatest || test.createdAt > currentLatest.createdAt) {
        latestTestMap.set(test.testNumber, test);
      }
    });
    const uniqueTests = Array.from(bestScoresMap.entries()).map(
      ([testNumber, data]) => {
        const latestTest = latestTestMap.get(testNumber);
        return {
          testId: data.testId,
          testName: data.testName,
          testNumber,
          score: data.score,
          totalMarks: latestTest.totalMarks,
          date: moment(latestTest.createdAt).format("MMM D, YYYY"),
          statusColor:
            data.score >= 80
              ? "green"
              : data.score >= 60
                ? "yellow"
                : data.score >= 40
                  ? "orange"
                  : "red",
        };
      },
    );

    // sort
    uniqueTests.sort((a, b) => b.testNumber - a.testNumber);

    //pagination
    const total = uniqueTests.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + Number(limit);
    const paginatedTests = uniqueTests.slice(startIndex, endIndex);
    return res.status(200).json({
      msg: "Test history fetched successfully",
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      tests: paginatedTests,
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal Server Error",
    });
  }
};
