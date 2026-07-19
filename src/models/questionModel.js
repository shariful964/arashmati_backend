// import mongoose from "mongoose";

// const questionSchema = new mongoose.Schema(
//   {
//     questionText: {
//       type: String,
//       default: "",
//     },
//     image: {
//       type: String,
//       default: "",
//     },
//     options: {
//       A: { type: String, required: true },
//       B: { type: String, required: true },
//       C: { type: String, required: true },
//       D: { type: String, required: true },
//     },
//     correctAnswer: {
//       type: String,
//       enum: ["A", "B", "C", "D"],
//       required: true,
//     },
//   },
//   { timestamps: true }
// );

// const Question = mongoose.model("Question", questionSchema);
// export default Question;




import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      default: "",
      trim: true,
    },
    image: {
      type: String,
      default: "",
    },
    imagePublicId: {
      type: String,
      default: null,
    },
    options: {
      A: { type: String, required: true },
      B: { type: String, required: true },
      C: { type: String, required: true },
      D: { type: String, required: true },
    },
    correctAnswer: {
      type: String,
      enum: ["A", "B", "C", "D"],
      required: true,
    },
  },
  { timestamps: true }
);

const Question = mongoose.model("Question", questionSchema);
export default Question;