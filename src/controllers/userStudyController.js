import UserChapterProgress from "../models/userChapterProgressModel.js";
import Chapter from "../models/chapterModel.js";
import Lesson from "../models/lessonModel.js";
import Paragraph from "../models/paragraphModel.js"

// ========================================
// GET USER STUDY MATERIALS (Progress সহ)
// ========================================
export const getUserStudyMaterials = async (req, res) => {
  try {
    const userId = req.user._id;

    // সব published chapter fetch করো
    const chapters = await Chapter.find({ status: "published" })
      .populate("createdBy", "name email")
      .sort({ chapterNumber: 1 });

    // প্রতিটি chapter এর জন্য progress calculate করো
    const chaptersWithProgress = await Promise.all(
      chapters.map(async (chapter) => {
        // মোট lessons count করো
        const totalLessons = await Lesson.countDocuments({
          chapterId: chapter._id,
        });

        // User এর progress খুঁজে বের করো
        const userProgress = await UserChapterProgress.findOne({
          userId,
          chapterId: chapter._id,
        });

        // Completed lessons count
        const completedLessonsCount = userProgress
          ? userProgress.completedLessons.length
          : 0;

        // Progress percentage
        const progressPercentage =
          totalLessons > 0
            ? Math.round((completedLessonsCount / totalLessons) * 100)
            : 0;

        // Chapter complete হয়েছে কিনা
        const isChapterCompleted = userProgress
          ? userProgress.isChapterCompleted
          : false;

        return {
          _id: chapter._id,
          chapterNumber: chapter.chapterNumber,
          title: chapter.title,
          subtitle: chapter.subtitle,
          coverImage: chapter.coverImage,
          totalLessons,
          completedLessons: completedLessonsCount,
          progressPercentage,
          isChapterCompleted,
          chapterCompletedAt: userProgress?.chapterCompletedAt || null,
          lastAccessedAt: userProgress?.lastAccessedAt || null,
          createdAt: chapter.createdAt,
        };
      })
    );

    // Overall progress calculate করো
    const totalChapters = chaptersWithProgress.length;
    const completedChapters = chaptersWithProgress.filter(
      (ch) => ch.isChapterCompleted
    ).length;
    const totalLessonsAllChapters = chaptersWithProgress.reduce(
      (sum, ch) => sum + ch.totalLessons,
      0
    );
    const completedLessonsAllChapters = chaptersWithProgress.reduce(
      (sum, ch) => sum + ch.completedLessons,
      0
    );
    const overallProgressPercentage =
      totalLessonsAllChapters > 0
        ? Math.round(
            (completedLessonsAllChapters / totalLessonsAllChapters) * 100
          )
        : 0;

    return res.status(200).json({
      msg: "User study materials fetched successfully",
      overallProgress: {
        totalChapters,
        completedChapters,
        totalLessons: totalLessonsAllChapters,
        completedLessons: completedLessonsAllChapters,
        progressPercentage: overallProgressPercentage,
      },
      chapters: chaptersWithProgress,
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal server error",
    });
  }
};

// ========================================
// MARK LESSON AS COMPLETED
// ========================================
export const markLessonComplete = async (req, res) => {
  try {
    const userId = req.user._id;
    const { chapterId, lessonId } = req.body;

    if (!chapterId || !lessonId) {
      return res.status(400).json({
        msg: "Chapter ID and Lesson ID are required",
      });
    }

    // Chapter exists কিনা check করো
    const chapter = await Chapter.findById(chapterId);
    if (!chapter) {
      return res.status(404).json({
        msg: "Chapter not found",
      });
    }

    // Lesson exists কিনা check করো
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({
        msg: "Lesson not found",
      });
    }

    // User progress খুঁজে বের করো অথবা create করো
    let userProgress = await UserChapterProgress.findOne({
      userId,
      chapterId,
    });

    if (!userProgress) {
      userProgress = await UserChapterProgress.create({
        userId,
        chapterId,
        completedLessons: [],
      });
    }

    // Lesson ইতিমধ্যে complete হয়েছে কিনা check করো
    const alreadyCompleted = userProgress.completedLessons.some(
      (item) => item.lessonId.toString() === lessonId
    );

    if (!alreadyCompleted) {
      // নতুন lesson add করো
      userProgress.completedLessons.push({
        lessonId,
        completedAt: new Date(),
      });
      userProgress.lastAccessedAt = new Date();
      await userProgress.save();
    }

    // সব lessons complete হয়েছে কিনা check করো
    const totalLessons = await Lesson.countDocuments({ chapterId });
    if (userProgress.completedLessons.length === totalLessons) {
      userProgress.isChapterCompleted = true;
      userProgress.chapterCompletedAt = new Date();
      await userProgress.save();
    }

    return res.status(200).json({
      msg: "Lesson marked as complete",
      progress: {
        chapterId,
        completedLessons: userProgress.completedLessons.length,
        totalLessons,
        isChapterCompleted: userProgress.isChapterCompleted,
      },
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal server error",
    });
  }
};

// ========================================
// GET USER PROGRESS FOR SPECIFIC CHAPTER
// ========================================
export const getChapterProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    const { chapterId } = req.params;

    const chapter = await Chapter.findById(chapterId);
    if (!chapter) {
      return res.status(404).json({
        msg: "Chapter not found",
      });
    }

    const userProgress = await UserChapterProgress.findOne({
      userId,
      chapterId,
    }).populate("completedLessons.lessonId", "heading lessonOrder");

    if (!userProgress) {
      return res.status(200).json({
        msg: "No progress found for this chapter",
        progress: {
          chapterId,
          completedLessons: [],
          totalLessons: 0,
          progressPercentage: 0,
          isChapterCompleted: false,
        },
      });
    }

    const totalLessons = await Lesson.countDocuments({ chapterId });
    const progressPercentage =
      totalLessons > 0
        ? Math.round(
            (userProgress.completedLessons.length / totalLessons) * 100
          )
        : 0;

    return res.status(200).json({
      msg: "Chapter progress fetched successfully",
      progress: {
        chapterId,
        completedLessons: userProgress.completedLessons,
        totalLessons,
        progressPercentage,
        isChapterCompleted: userProgress.isChapterCompleted,
        chapterCompletedAt: userProgress.chapterCompletedAt,
        lastAccessedAt: userProgress.lastAccessedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal server error",
    });
  }
};

// ========================================
// RESET CHAPTER PROGRESS
// ========================================
export const resetChapterProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    const { chapterId } = req.body;

    if (!chapterId) {
      return res.status(400).json({
        msg: "Chapter ID is required",
      });
    }

    const userProgress = await UserChapterProgress.findOneAndDelete({
      userId,
      chapterId,
    });

    if (!userProgress) {
      return res.status(404).json({
        msg: "No progress found for this chapter",
      });
    }

    return res.status(200).json({
      msg: "Chapter progress reset successfully",
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal server error",
    });
  }
};



// ========================================
// GET CHAPTER DETAILS FOR USER (Progress সহ)
// ========================================
export const getUserChapterDetail = async (req, res) => {
  try {
    const userId = req.user._id;
    const { chapterId } = req.params;

    // Chapter fetch করো (published হতে হবে)
    const chapter = await Chapter.findById(chapterId);
    if (!chapter) {
      return res.status(404).json({
        msg: "Chapter not found",
      });
    }

    // User শুধু published chapter দেখতে পারবে
    if (chapter.status !== "published") {
      return res.status(403).json({
        msg: "This chapter is not available yet",
      });
    }

    // সব lessons fetch করো (paragraphs সহ)
    const lessons = await Lesson.find({ chapterId: chapter._id }).sort({
      lessonOrder: 1,
    });

    const lessonsWithParagraphs = await Promise.all(
      lessons.map(async (lesson) => {
        const paragraphs = await Paragraph.find({
          lessonId: lesson._id,
        }).sort({ paragraphOrder: 1 });

        return {
          _id: lesson._id,
          lessonOrder: lesson.lessonOrder,
          heading: lesson.heading,
          lessonImage: lesson.lessonImage,
          paragraphs: paragraphs.map((p) => ({
            _id: p._id,
            paragraphOrder: p.paragraphOrder,
            content: p.content,
          })),
        };
      })
    );

    // User এর progress check করো
    const userProgress = await UserChapterProgress.findOne({
      userId,
      chapterId: chapter._id,
    });

    const completedLessonIds = userProgress
      ? userProgress.completedLessons.map((item) => item.lessonId.toString())
      : [];

    const totalLessons = lessons.length;
    const completedLessonsCount = completedLessonIds.length;
    const progressPercentage =
      totalLessons > 0
        ? Math.round((completedLessonsCount / totalLessons) * 100)
        : 0;

    // Next chapter খুঁজে বের করো
    const nextChapter = await Chapter.findOne({
      chapterNumber: chapter.chapterNumber + 1,
      status: "published",
    }).select("_id chapterNumber title");

    return res.status(200).json({
      msg: "Chapter details fetched successfully",
      chapter: {
        _id: chapter._id,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        subtitle: chapter.subtitle,
        coverImage: chapter.coverImage,
        totalLessons,
        completedLessons: completedLessonsCount,
        progressPercentage,
        isChapterCompleted: userProgress?.isChapterCompleted || false,
        lessons: lessonsWithParagraphs,
        completedLessonIds,
      },
      nextChapter: nextChapter
        ? {
            _id: nextChapter._id,
            chapterNumber: nextChapter.chapterNumber,
            title: nextChapter.title,
          }
        : null,
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal server error",
    });
  }
};

// ========================================
// MARK ENTIRE CHAPTER AS COMPLETE
// (সব lessons + chapter একসাথে complete)
// ========================================
export const markChapterComplete = async (req, res) => {
  try {
    const userId = req.user._id;
    const { chapterId } = req.body;

    if (!chapterId) {
      return res.status(400).json({
        msg: "Chapter ID is required",
      });
    }

    // Chapter exists কিনা check করো
    const chapter = await Chapter.findById(chapterId);
    if (!chapter) {
      return res.status(404).json({
        msg: "Chapter not found",
      });
    }

    // সব lessons fetch করো
    const lessons = await Lesson.find({ chapterId: chapter._id });
    if (lessons.length === 0) {
      return res.status(400).json({
        msg: "This chapter has no lessons",
      });
    }

    // User progress খুঁজে বের করো অথবা create করো
    let userProgress = await UserChapterProgress.findOne({
      userId,
      chapterId: chapter._id,
    });

    if (!userProgress) {
      userProgress = await UserChapterProgress.create({
        userId,
        chapterId: chapter._id,
        completedLessons: [],
      });
    }

    // সব lessons complete mark করো (যেগুলো নেই সেগুলো add করো)
    const existingLessonIds = userProgress.completedLessons.map((item) =>
      item.lessonId.toString()
    );

    const newLessons = lessons.filter(
      (lesson) => !existingLessonIds.includes(lesson._id.toString())
    );

    // নতুন lessons add করো
    for (const lesson of newLessons) {
      userProgress.completedLessons.push({
        lessonId: lesson._id,
        completedAt: new Date(),
      });
    }

    // Chapter complete mark করো
    userProgress.isChapterCompleted = true;
    userProgress.chapterCompletedAt = new Date();
    userProgress.lastAccessedAt = new Date();

    await userProgress.save();

    return res.status(200).json({
      msg: "Chapter marked as complete successfully",
      progress: {
        chapterId: chapter._id,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        completedLessons: userProgress.completedLessons.length,
        totalLessons: lessons.length,
        isChapterCompleted: true,
        chapterCompletedAt: userProgress.chapterCompletedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal server error",
    });
  }
};