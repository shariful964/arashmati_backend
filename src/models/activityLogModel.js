import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["test_completed", "streak_achieved", "progress_updated"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    value: {
      type: String, // e.g., "2 hours ago", "+8%", etc., or we can compute relative time dynamically. Let's make it a value or description.
      default: "",
    },
  },
  { timestamps: true }
);

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
export default ActivityLog;
