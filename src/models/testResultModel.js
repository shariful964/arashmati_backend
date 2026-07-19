import mongoose from "mongoose";

const testResultSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    testName: {
      type: String,
      required: true,
    },
    testNumber: {
      type: Number,
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
    totalMarks: {
      type: Number,
      default: 100,
    },
    timeTaken: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

const TestResult = mongoose.model("TestResult", testResultSchema);
export default TestResult;
