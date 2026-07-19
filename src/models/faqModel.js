import mongoose from "mongoose";

const faqSchema = mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true
    },
    answer: {
      type: String,
      required: true
    }, 
    order: {
      type: Number,
      default: 0
    },
    isActive: {
        type: Boolean, 
        default: true,
    },
  },
  {
    timestamps: true
  }
);

const FAQ = mongoose.model("FAQ", faqSchema);
export default FAQ;