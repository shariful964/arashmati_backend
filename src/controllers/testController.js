import Question from "../models/questionModel.js";
import TestResult from "../models/testResultModel.js";
import ActivityLog from "../models/activityLogModel.js";

// ========================================
// HELPER: Seconds কে readable format এ convert করা
// ========================================
const formatTimeTaken = (seconds) => {
  if (!seconds || seconds <= 0) return "0m";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

// Fetch list of 10 tests with their status for the current user
export const getTestList = async (req, res) => {
  try {
    const userId = req.user.id;
    const tests = [];

    // Fetch all test results for the user
    const allResults = await TestResult.find({ user: userId });

    // ✅ প্রতিটা test এর best score বের করো (unique)
    const bestScoresPerTest = new Map();
    let overallBestScore = 0;

    allResults.forEach((r) => {
      const currentBest = bestScoresPerTest.get(r.testNumber);
      if (!currentBest || r.score > currentBest) {
        bestScoresPerTest.set(r.testNumber, r.score);
      }
      // Overall best score (সব tests এর মধ্যে highest)
      if (r.score > overallBestScore) {
        overallBestScore = r.score;
      }
    });

    // ✅ Unique best scores এর array
    const uniqueBestScores = Array.from(bestScoresPerTest.values());
    const completedCount = uniqueBestScores.length;

    // ✅ Average score (শুধু unique tests এর best scores থেকে)
    const avgScore =
      completedCount > 0
        ? Math.round(
            uniqueBestScores.reduce((acc, score) => acc + score, 0) /
              completedCount,
          )
        : 0;
    // Generate list of 10 tests
    for (let i = 1; i <= 10; i++) {
      const testResultsForNum = allResults.filter((r) => r.testNumber === i);
      const isCompleted = testResultsForNum.length > 0;

      // Find highest score for this specific test
      let testBestScore = null;
      let passed = false;
      if (isCompleted) {
        testBestScore = Math.max(...testResultsForNum.map((r) => r.score));
        passed = testBestScore >= 70; // Assuming passing score is 70
      }

      tests.push({
        testNumber: i,
        testName: `Mock Test ${String(i).padStart(2, "0")}`,
        durationMinutes: 90,
        totalQuestions: 10,
        isCompleted,
        bestScore: testBestScore,
        passed,
        action: isCompleted ? "Retake Test" : "Start Test",
      });
    }

    return res.status(200).json({
      msg: "Test list fetched successfully",
      overview: {
        completedCount,
        totalTests: 10,
        bestScore: overallBestScore,
        avgScore,
      },
      tests,
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal Server Error",
    });
  }
};

// GET /api/tests/:testNumber
//get test by number
export const getTestByNumber = async (req, res) => {
  try {
    const userId = req.user.id;
    const testNumber = parseInt(req.params.testNumber);

    if (isNaN(testNumber) || testNumber < 1 || testNumber > 10) {
      return res.status(400).json({
        msg: "Invalid test number",
      });
    }
    const testResults = await TestResult.find({ user: userId, testNumber });
    const isCompleted = testResults.length > 0;
    let bestScore = null;
    let passed = false;
    if (isCompleted) {
      bestScore = Math.max(...testResults.map((r) => r.score));
      passed = bestScore >= 70;
    }

    const test = {
      testNumber,
      testName: `Mock Test ${String(testNumber).padStart(2, "0")}`,
      durationMinutes: 90,
      totalQuestions: 10,
      passingPercentage: 70,
      isCompleted,
      bestScore,
      passed,
      action: isCompleted ? "Retake Test" : "Start Test",
    };

    return res.status(200).json({
      msg: "Test fetched successfully",
      test,
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal Server Error",
    });
  }
};

// Start test: fetch 10 random questions
export const startTest = async (req, res) => {
  try {
    const testNumber = parseInt(req.params.testNumber);
    if (isNaN(testNumber) || testNumber < 1 || testNumber > 10) {
      return res.status(400).json({ msg: "Invalid test number" });
    }

    // Check if we have enough questions in the database
    const questionCount = await Question.countDocuments();
    if (questionCount < 10) {
      return res.status(400).json({
        msg: `Not enough questions in database (currently ${questionCount}, need at least 10). Please contact admin.`,
      });
    }

    // Fetch 10 random questions
    const randomQuestions = await Question.aggregate([
      { $sample: { size: 10 } },
    ]);

    // Remove correctAnswer from response to prevent cheating
    const questionsWithoutAnswers = randomQuestions.map((q) => {
      const { correctAnswer, ...rest } = q;
      return rest;
    });

    // return res.status(200).json({
    //   msg: "Test started successfully",
    //   testNumber,
    //   questions: questionsWithoutAnswers,
    // });

    return res.status(200).json({
      msg: "Test started successfully",

      test: {
        testNumber,
        testName: `Mock Test ${String(testNumber).padStart(2, "0")}`,
        durationMinutes: 90,
        totalQuestions: 10,
        passingPercentage: 70,
      },

      questions: questionsWithoutAnswers,
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal Server Error",
    });
  }
};



export const submitTest = async (req, res) => {
  try {
    const userId = req.user.id;
    const testNumber = parseInt(req.params.testNumber);
    const { answers, timeTaken } = req.body; // ✅ timeTaken ও extract করো

    if (isNaN(testNumber) || testNumber < 1 || testNumber > 10) {
      return res.status(400).json({ msg: "Invalid test number" });
    }

    if (!answers || !Array.isArray(answers) || answers.length !== 10) {
      return res.status(400).json({ msg: "Please provide exactly 10 answers" });
    }

    // ✅ timeTaken validate করো (string বা number দুটোই handle করবে)
    let validTimeTaken = 0;
    if (timeTaken !== undefined && timeTaken !== null) {
      const parsedTime = Number(timeTaken);
      if (!isNaN(parsedTime) && parsedTime > 0) {
        validTimeTaken = parsedTime;
      }
    }

    // ✅ Max time limit check (90 minutes = 5400 seconds)
    const maxTime = 90 * 60;
    const finalTimeTaken = Math.min(validTimeTaken, maxTime);

    // Fetch previous test results to calculate progress log later
    const previousResults = await TestResult.find({ user: userId });
    const previousCount = previousResults.length;

    // ✅ পুরনো readiness score (unique best scores থেকে)
    let oldReadinessScore = 0;
    if (previousCount > 0) {
      const bestScoresPerTest = new Map();
      previousResults.forEach((r) => {
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

    let correctCount = 0;
    const reviewAnswers = [];

    // Grade each answer
    for (const ans of answers) {
      const question = await Question.findById(ans.questionId);
      if (!question) {
        return res
          .status(400)
          .json({ msg: `Question not found: ${ans.questionId}` });
      }

      const isCorrect = question.correctAnswer === ans.selectedAnswer;
      if (isCorrect) {
        correctCount++;
      }

      reviewAnswers.push({
        questionId: question._id,
        questionText: question.questionText,
        image: question.image,
        options: question.options,
        selectedAnswer: ans.selectedAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
      });
    }

    const scorePercentage = (correctCount / 10) * 100;
    const incorrectCount = 10 - correctCount;

    // Save the new test result
    const testName = `Mock Test ${String(testNumber).padStart(2, "0")}`;
    const newTest = await TestResult.create({
      user: userId,
      testNumber,
      testName,
      score: scorePercentage,
      totalMarks: 100,
      timeTaken: finalTimeTaken,
      //  timeTakenFormatted: formatTimeTaken(finalTimeTaken),
    });

    // ✅ নতুন readiness score (unique best scores থেকে)
    const allResults = [...previousResults, newTest];
    const bestScoresPerTestNew = new Map();
    allResults.forEach((r) => {
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

    // ✅ শুধু পজিটিভ প্রোগ্রেস লগ করবে
    if (previousCount > 0) {
      const progressDiff = newReadinessScore - oldReadinessScore;
      if (progressDiff > 0) {
        await ActivityLog.create({
          user: userId,
          type: "progress_updated",
          title: `Progress Updated: +${progressDiff}%`,
        });
      }
    }

    return res.status(201).json({
      msg: "Test graded and submitted successfully",
      testResult: {
        testNumber,
        testName,
        totalQuestions: 10,
        score: scorePercentage,
        correctCount,
        incorrectCount,
        accuracyRate: scorePercentage,
        timeTaken: finalTimeTaken,
        timeTakenFormatted: formatTimeTaken(finalTimeTaken),
      },
      reviewAnswers,
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal Server Error",
    });
  }
};
