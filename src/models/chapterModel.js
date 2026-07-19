import mongoose from "mongoose";

const chapterSchema = new mongoose.Schema(
  {
    chapterNumber: {
      type: Number,
      required: [true, "Chapter number is required"],
      unique: true, // ← এটাই automatically index তৈরি করে
    },
    title: {
      type: String,
      required: [true, "Chapter title is required"],
      trim: true,
      maxlength: [255, "Title cannot exceed 255 characters"],
    },
    subtitle: {
      type: String,
      default: "",
      trim: true,
    },
    coverImage: {
      type: String,
      default: null,
    },
    coverImagePublicId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ❌ এই লাইনটা সরিয়ে দাও (duplicate index)
// chapterSchema.index({ chapterNumber: 1 });

// ✅ শুধু status এর index রাখো
chapterSchema.index({ status: 1 });

const Chapter = mongoose.model("Chapter", chapterSchema);
export default Chapter;