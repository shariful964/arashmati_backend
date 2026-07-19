import mongoose from "mongoose";

const paragraphSchema = new mongoose.Schema(
  {
    lessonId: {  // ← sectionId থেকে lessonId
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",  // ← Section থেকে Lesson
      required: [true, "Lesson ID is required"],
    },
    paragraphOrder: {
      type: Number,
      required: [true, "Paragraph order is required"],
    },
    content: {
      type: String,
      required: [true, "Paragraph content is required"],
    },
  },
  {
    timestamps: true,
  }
);

paragraphSchema.index({ lessonId: 1, paragraphOrder: 1 });  // ← sectionId থেকে lessonId

const Paragraph = mongoose.model("Paragraph", paragraphSchema);
export default Paragraph;