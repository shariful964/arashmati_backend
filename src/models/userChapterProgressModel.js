import mongoose from "mongoose";

const userChapterProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
      required: true,
    },
    completedLessons: [
      {
        lessonId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Lesson",
          required: true,
        },
        completedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isChapterCompleted: {
      type: Boolean,
      default: false,
    },
    chapterCompletedAt: {
      type: Date,
      default: null,
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index for faster queries
userChapterProgressSchema.index(
  { userId: 1, chapterId: 1 },
  { unique: true }
);
userChapterProgressSchema.index({ userId: 1, isChapterCompleted: 1 });

const UserChapterProgress = mongoose.model(
  "UserChapterProgress",
  userChapterProgressSchema
);
export default UserChapterProgress;