// import Question from "../models/questionModel.js";

// // Get all questions (with search & pagination)
// export const getAllQuestions = async (req, res) => {
//   try {
//     const { search = "", page = 1, limit = 50 } = req.query;
//     const query = search
//       ? { questionText: { $regex: search, $options: "i" } }
//       : {};

//     const total = await Question.countDocuments(query);
//     const questions = await Question.find(query)
//       .skip((page - 1) * limit)
//       .limit(Number(limit))
//       .sort({ createdAt: -1 });

//     return res.status(200).json({
//       msg: "Questions fetched successfully",
//       total,
//       page: Number(page),
//       questions,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       msg: error.message || "Internal Server Error",
//     });
//   }
// };

// // Add a single question
// export const addQuestion = async (req, res) => {
//   try {
//     const { questionText, image, options, correctAnswer } = req.body;

//     if (!options || !correctAnswer) {
//       return res.status(400).json({
//         msg: "Options and correctAnswer are required",
//       });
//     }

//     const question = await Question.create({
//       questionText,
//       image,
//       options,
//       correctAnswer,
//     });

//     return res.status(201).json({
//       msg: "Question added successfully",
//       question,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       msg: error.message || "Internal Server Error",
//     });
//   }
// };

// // Bulk add questions
// export const bulkAddQuestions = async (req, res) => {
//   try {
//     const { questions } = req.body;

//     if (!questions || !Array.isArray(questions)) {
//       return res.status(400).json({
//         msg: "Please provide an array of questions",
//       });
//     }

//     for (const q of questions) {
//       if (!q.options || !q.correctAnswer) {
//         return res.status(400).json({
//           msg: "Each question must contain options and correctAnswer",
//         });
//       }
//     }

//     const insertedQuestions = await Question.insertMany(questions);

//     return res.status(201).json({
//       msg: `${insertedQuestions.length} questions added successfully`,
//       count: insertedQuestions.length,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       msg: error.message || "Internal Server Error",
//     });
//   }
// };

// // Update a question
// export const updateQuestion = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { questionText, image, options, correctAnswer } = req.body;

//     const question = await Question.findByIdAndUpdate(
//       id,
//       { questionText, image, options, correctAnswer },
//       { new: true, runValidators: true }
//     );

//     if (!question) {
//       return res.status(404).json({ msg: "Question not found" });
//     }

//     return res.status(200).json({
//       msg: "Question updated successfully",
//       question,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       msg: error.message || "Internal Server Error",
//     });
//   }
// };

// // Delete a question
// export const deleteQuestion = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const question = await Question.findByIdAndDelete(id);

//     if (!question) {
//       return res.status(404).json({ msg: "Question not found" });
//     }

//     return res.status(200).json({
//       msg: "Question deleted successfully",
//     });
//   } catch (error) {
//     return res.status(500).json({
//       msg: error.message || "Internal Server Error",
//     });
//   }
// };




import Question from "../models/questionModel.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/imageUpload.js";
import fs from "fs";

// Helper: Delete temporary file
const deleteTempFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// ========================================
// GET ALL QUESTIONS (with search & pagination)
// ========================================
export const getAllQuestions = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 50 } = req.query;
    const query = search
      ? { questionText: { $regex: search, $options: "i" } }
      : {};

    const total = await Question.countDocuments(query);
    const questions = await Question.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    return res.status(200).json({
      msg: "Questions fetched successfully",
      total,
      page: Number(page),
      questions,
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal Server Error",
    });
  }
};

// ========================================
// ADD A SINGLE QUESTION (with image upload)
// ========================================
export const addQuestion = async (req, res) => {
  try {
    const { questionText, options, correctAnswer } = req.body;

    //  Validation: অন্তত একটা থাকতে হবে (questionText বা image)
    if (!questionText && !req.file) {
      return res.status(400).json({
        msg: "Either questionText or image is required",
      });
    }

    //  Validation: options এবং correctAnswer required
    if (!options || !correctAnswer) {
      if (req.file) deleteTempFile(req.file.path);
      return res.status(400).json({
        msg: "Options and correctAnswer are required",
      });
    }

    // Image upload to Cloudinary (যদি image পাঠানো হয়)
    let image = "";
    let imagePublicId = null;

    if (req.file) {
      try {
        const uploaded = await uploadToCloudinary(
          req.file.path,
          "questions"
        );
        image = uploaded.url;
        imagePublicId = uploaded.publicId;
        deleteTempFile(req.file.path);
      } catch (uploadError) {
        deleteTempFile(req.file.path);
        return res.status(500).json({
          msg: "Failed to upload question image",
          error: uploadError.message,
        });
      }
    }

    const question = await Question.create({
      questionText: questionText || "",
      image,
      imagePublicId,
      options,
      correctAnswer,
    });

    return res.status(201).json({
      msg: "Question added successfully",
      question,
    });
  } catch (error) {
    if (req.file) deleteTempFile(req.file.path);
    return res.status(500).json({
      msg: error.message || "Internal Server Error",
    });
  }
};

// ========================================
// BULK ADD QUESTIONS (without images)
// ========================================
export const bulkAddQuestions = async (req, res) => {
  try {
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({
        msg: "Please provide an array of questions",
      });
    }

    for (const q of questions) {
      if (!q.options || !q.correctAnswer) {
        return res.status(400).json({
          msg: "Each question must contain options and correctAnswer",
        });
      }

      // ✅ Validation: অন্তত একটা থাকতে হবে
      const hasText = q.questionText && q.questionText.trim().length > 0;
      const hasImage = q.image && q.image.length > 0;

      if (!hasText && !hasImage) {
        return res.status(400).json({
          msg: "Each question must have either questionText or image",
        });
      }
    }

    const insertedQuestions = await Question.insertMany(questions);

    return res.status(201).json({
      msg: `${insertedQuestions.length} questions added successfully`,
      count: insertedQuestions.length,
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal Server Error",
    });
  }
};

// ========================================
// UPDATE A QUESTION (with image update)
// ========================================
export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { questionText, options, correctAnswer } = req.body;

    const question = await Question.findById(id);
    if (!question) {
      if (req.file) deleteTempFile(req.file.path);
      return res.status(404).json({ msg: "Question not found" });
    }

    //  Validation: অন্তত একটা থাকতে হবে
    const newText =
      questionText !== undefined ? questionText : question.questionText;
    const hasText = newText && newText.trim().length > 0;
    const hasImage =
      req.file !== undefined || (question.image && question.image.length > 0);

    if (!hasText && !hasImage) {
      if (req.file) deleteTempFile(req.file.path);
      return res.status(400).json({
        msg: "Either questionText or image is required",
      });
    }

    // Update fields
    if (questionText !== undefined) question.questionText = questionText;
    if (options !== undefined) question.options = options;
    if (correctAnswer !== undefined) question.correctAnswer = correctAnswer;

    // Image update (যদি নতুন image পাঠানো হয়)
    if (req.file) {
      try {
        // পুরনো image Cloudinary থেকে delete করো
        if (question.imagePublicId) {
          await deleteFromCloudinary(question.imagePublicId);
        }

        const uploaded = await uploadToCloudinary(
          req.file.path,
          "questions"
        );
        question.image = uploaded.url;
        question.imagePublicId = uploaded.publicId;
        deleteTempFile(req.file.path);
      } catch (uploadError) {
        deleteTempFile(req.file.path);
        return res.status(500).json({
          msg: "Failed to upload question image",
          error: uploadError.message,
        });
      }
    }

    await question.save();

    return res.status(200).json({
      msg: "Question updated successfully",
      question,
    });
  } catch (error) {
    if (req.file) deleteTempFile(req.file.path);
    return res.status(500).json({
      msg: error.message || "Internal Server Error",
    });
  }
};

// ========================================
// DELETE A QUESTION (with image cleanup)
// ========================================
export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ msg: "Question not found" });
    }

    // Image Cloudinary থেকে delete করো
    if (question.imagePublicId) {
      await deleteFromCloudinary(question.imagePublicId);
    }

    await Question.findByIdAndDelete(id);

    return res.status(200).json({
      msg: "Question deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal Server Error",
    });
  }
};

