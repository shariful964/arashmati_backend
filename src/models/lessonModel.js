import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
      required: [true, "Chapter ID is required"],
    },
    lessonOrder: {
      type: Number,
      required: [true, "Lesson order is required"],
    },
    heading: {
      type: String,
      required: [true, "Lesson heading is required"],
      trim: true,
      maxlength: [255, "Heading cannot exceed 255 characters"],
    },
    lessonImage: {
      type: String,
      default: null,
    },
    lessonImagePublicId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

lessonSchema.index({ chapterId: 1, lessonOrder: 1 });

const Lesson = mongoose.model("Lesson", lessonSchema);
export default Lesson;