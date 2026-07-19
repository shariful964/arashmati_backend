import Chapter from "../models/chapterModel.js";
import Lesson from "../models/lessonModel.js";
import Paragraph from "../models/paragraphModel.js";
import fs from "fs";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/imageUpload.js";

// Helper: Delete temporary file
const deleteTempFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};



// Helper: Delete all temp files from request
const deleteAllTempFiles = (files) => {
  if (!files) return;


  if (Array.isArray(files)) {
    // Format 1: Direct array
    files.forEach((file) => deleteTempFile(file.path));
  } else {
    // Format 2: Object with field names as keys
    Object.values(files).forEach((fileOrArray) => {
      if (Array.isArray(fileOrArray)) {
        // Multiple files under same field name
        fileOrArray.forEach((file) => deleteTempFile(file.path));
      } else if (fileOrArray && fileOrArray.path) {
        // Single file under a field name
        deleteTempFile(fileOrArray.path);
      }
    });
  }
};

// ✅ NEW HELPER: upload.any() থেকে নির্দিষ্ট ফাইল খুঁজে বের করা
const getFileByFieldname = (files, fieldName) => {
  if (!files || !Array.isArray(files)) return null;
  return files.find((file) => file.fieldname === fieldName) || null;
};

// Helper: Parse lessons from request body
const parseLessons = (reqBody) => {
  if (reqBody.lessons !== undefined) {
    return typeof reqBody.lessons === "string"
      ? JSON.parse(reqBody.lessons)
      : reqBody.lessons;
  }
  if (reqBody.sections !== undefined) {
    return typeof reqBody.sections === "string"
      ? JSON.parse(reqBody.sections)
      : reqBody.sections;
  }
  return undefined;
};

// Helper: Upload lesson images and create lessons
// Helper: Upload lesson images and create lessons
const createLessonsWithImages = async (chapterId, lessonsBody, files) => {
  if (!lessonsBody || !Array.isArray(lessonsBody)) return;

  for (let i = 0; i < lessonsBody.length; i++) {
    const lessonData = lessonsBody[i];

    let lessonImage = null;
    let lessonImagePublicId = null;

    // দুইটা naming support করো (lessonImage বা sectionImage)
       const imageFile = 
      getFileByFieldname(files, `lessonImage_${i}`) || 
      getFileByFieldname(files, `sectionImage_${i}`);

    if (imageFile) {
      try {
        const uploaded = await uploadToCloudinary(imageFile.path, "lessons");
        lessonImage = uploaded.url;
        lessonImagePublicId = uploaded.publicId;
      } catch (uploadError) {
        console.error(
          `Failed to upload lesson image ${i}:`,
          uploadError.message,
        );
      }
    }

    // ✅ ফ্রন্টএন্ড থেকে আসা title/heading এবং content handle করা
    const heading = lessonData.title || lessonData.heading || `Lesson ${i + 1}`;

    const newLesson = await Lesson.create({
      chapterId,
      lessonOrder: lessonData.order || i + 1,
      heading,
      lessonImage,
      lessonImagePublicId,
    });

    // ✅ content string কে paragraphs array তে convert করা
    let paragraphsToCreate = [];

    if (lessonData.content && typeof lessonData.content === "string") {
      // ফ্রন্টএন্ড থেকে \n\n দিয়ে split করে পাঠানো হয়েছে
      paragraphsToCreate = lessonData.content
        .split("\n\n")
        .filter((p) => p.trim() !== "")
        .map((text, idx) => ({
          paragraphOrder: idx + 1,
          content: text.trim(),
        }));
    } else if (lessonData.paragraphs && Array.isArray(lessonData.paragraphs)) {
      // যদি সরাসরি paragraphs array আসে (পুরনো format)
      paragraphsToCreate = lessonData.paragraphs.map((p, idx) => ({
        paragraphOrder: idx + 1,
        content: typeof p === "string" ? p : p.content,
      }));
    }

    // Paragraphs সেভ করা
    for (const para of paragraphsToCreate) {
      await Paragraph.create({
        lessonId: newLesson._id,
        paragraphOrder: para.paragraphOrder,
        content: para.content,
      });
    }
  }
};

// ========================================
// GET ALL CHAPTERS
// ========================================
export const getChapters = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role !== "admin") {
      filter.status = "published";
    }

    const chapters = await Chapter.find(filter)
      .populate("createdBy", "name email")
      .sort({ chapterNumber: 1 });

    const chaptersWithLessons = await Promise.all(
      chapters.map(async (chapter) => {
        const lessonCount = await Lesson.countDocuments({
          chapterId: chapter._id,
        });
        return {
          _id: chapter._id,
          chapterNumber: chapter.chapterNumber,
          title: chapter.title,
          subtitle: chapter.subtitle,
          coverImage: chapter.coverImage,
          coverImagePublicId: chapter.coverImagePublicId,
          status: chapter.status,
          publishedAt: chapter.publishedAt,
          createdBy: chapter.createdBy,
          lessonCount,
          createdAt: chapter.createdAt,
          updatedAt: chapter.updatedAt,
        };
      }),
    );

    return res.status(200).json({
      msg: "Chapters fetched successfully",
      total_count: chaptersWithLessons.length,
      chapters: chaptersWithLessons,
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal server error",
    });
  }
};

// ========================================
// GET SINGLE CHAPTER BY ID
// ========================================
export const getChapterById = async (req, res) => {
  try {
    const { id } = req.params;

    const chapter = await Chapter.findById(id).populate(
      "createdBy",
      "name email",
    );

    if (!chapter) {
      return res.status(404).json({
        msg: "Chapter not found",
      });
    }

    if (req.user.role !== "admin" && chapter.status !== "published") {
      return res.status(403).json({
        msg: "This chapter is not published yet",
      });
    }

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
          lessonImagePublicId: lesson.lessonImagePublicId,
          paragraphs,
        };
      }),
    );

    return res.status(200).json({
      msg: "Chapter fetched successfully",
      chapter: {
        _id: chapter._id,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        subtitle: chapter.subtitle,
        coverImage: chapter.coverImage,
        coverImagePublicId: chapter.coverImagePublicId,
        status: chapter.status,
        publishedAt: chapter.publishedAt,
        createdBy: chapter.createdBy,
        lessonCount: lessonsWithParagraphs.length,
        lessons: lessonsWithParagraphs,
        createdAt: chapter.createdAt,
        updatedAt: chapter.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal server error",
    });
  }
};

// ========================================
// CREATE NEW CHAPTER (POST /api/chapters)
// ========================================
export const createChapter = async (req, res) => {
  try {
    const { chapterNumber, title, subtitle, status } = req.body;
    const lessonsBody = parseLessons(req.body);

    if (req.user.role !== "admin") {
      return res.status(403).json({
        msg: "Only admins can create chapters",
      });
    }
   
    // Validation
    if (!chapterNumber) {
      deleteAllTempFiles(req.files);
      return res.status(400).json({
        msg: "Chapter number is required",
      });
    }

    if (!title || title === "") {
      deleteAllTempFiles(req.files);
      return res.status(400).json({
        msg: "Title is required",
      });
    }

    // Check if chapter number already exists
    const existingChapter = await Chapter.findOne({ chapterNumber });
    if (existingChapter) {
      deleteAllTempFiles(req.files);
      return res.status(400).json({
        msg: `Chapter number ${chapterNumber} already exists. Use PATCH /api/chapters/:id to update.`,
      });
    }

    // Upload cover image
    let coverImage = null;
    let coverImagePublicId = null;

  const coverFile = getFileByFieldname(req.files, "coverImage");
    
    if (coverFile) {
      try {
        const uploaded = await uploadToCloudinary(
          coverFile.path, // [0] লাগবে না
          "chapters"
        );
        coverImage = uploaded.url;
        coverImagePublicId = uploaded.publicId;
      } catch (uploadError) {
        deleteAllTempFiles(req.files);
        return res.status(500).json({
          msg: "Failed to upload cover image",
          error: uploadError.message,
        });
      }
    }
   
    const chapter = await Chapter.create({
      chapterNumber,
      title,
      subtitle: subtitle || "",
      coverImage,
      coverImagePublicId,
      status: status || "draft",
      publishedAt: status === "published" ? new Date() : null,
      createdBy: req.user._id,
    });

    // Create lessons
    await createLessonsWithImages(chapter._id, lessonsBody, req.files);

    // Cleanup temp files
    deleteAllTempFiles(req.files);

    // Fetch complete chapter
    const completeLessons = await Lesson.find({
      chapterId: chapter._id,
    }).sort({ lessonOrder: 1 });

    return res.status(201).json({
      msg:
        status === "published"
          ? "Chapter created and published successfully"
          : "Chapter created and saved as draft",
      chapter: {
        _id: chapter._id,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        subtitle: chapter.subtitle,
        coverImage: chapter.coverImage,
        status: chapter.status,
        publishedAt: chapter.publishedAt,
        lessons: completeLessons,
      },
    });
  } catch (error) {
    deleteAllTempFiles(req.files);

    return res.status(500).json({
      msg: error.message || "Internal server error",
    });
  }
};

// ========================================
// UPDATE CHAPTER - PARTIAL UPDATE (PATCH /api/chapters/:id)
// ========================================
export const updateChapter = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, status } = req.body;
    const lessonsBody = parseLessons(req.body);

    if (req.user.role !== "admin") {
      return res.status(403).json({
        msg: "Only admins can update chapters",
      });
    }

    // Find chapter
    const chapter = await Chapter.findById(id);
    if (!chapter) {
      deleteAllTempFiles(req.files);
      return res.status(404).json({
        msg: "Chapter not found",
      });
    }

    // ✅ PARTIAL UPDATE: শুধু যে fields পাঠানো হয়েছে সেগুলোই update করো
    let hasChanges = false;

    // Title update
    if (title !== undefined && title !== "") {
      chapter.title = title;
      hasChanges = true;
    }

    // Subtitle update
    if (subtitle !== undefined) {
      chapter.subtitle = subtitle;
      hasChanges = true;
    }

    // Status update
    if (status !== undefined && status !== "") {
      chapter.status = status;
      if (status === "published" && !chapter.publishedAt) {
        chapter.publishedAt = new Date();
      }
      hasChanges = true;
    }

    // Cover image update (যদি নতুন image পাঠানো হয়)
        // ❌ পুরনো কোড মুছে দাও:
    // if (req.files && req.files["coverImage"]) { ... }

    // ✅ নতুন কোড বসাও:
    const newCoverFile = getFileByFieldname(req.files, "coverImage");
    
    if (newCoverFile) {
      try {
        if (chapter.coverImagePublicId) {
          await deleteFromCloudinary(chapter.coverImagePublicId);
        }

        const uploaded = await uploadToCloudinary(
          newCoverFile.path, // [0] লাগবে না
          "chapters"
        );
        chapter.coverImage = uploaded.url;
        chapter.coverImagePublicId = uploaded.publicId;
        hasChanges = true;
      } catch (uploadError) {
        deleteAllTempFiles(req.files);
        return res.status(500).json({
          msg: "Failed to upload cover image",
          error: uploadError.message,
        });
      }
    }

    // ========================================
    // ✅ Lessons update - Images Preserve করবে
    // ========================================
    if (lessonsBody !== undefined && Array.isArray(lessonsBody)) {
      // পুরনো lessons fetch করো
      const oldLessons = await Lesson.find({ chapterId: chapter._id }).sort({
        lessonOrder: 1,
      });

      // পুরনো lessons এর images map করে রাখো (index অনুযায়ী)
      const oldImagesMap = {};
      oldLessons.forEach((lesson, index) => {
        oldImagesMap[index] = {
          lessonImage: lesson.lessonImage,
          lessonImagePublicId: lesson.lessonImagePublicId,
        };
      });

      // ✅ Extra lessons (যেগুলো নতুন array তে নেই) তাদের images delete করো
      for (let i = lessonsBody.length; i < oldLessons.length; i++) {
        if (oldImagesMap[i] && oldImagesMap[i].lessonImagePublicId) {
          await deleteFromCloudinary(oldImagesMap[i].lessonImagePublicId);
        }
      }

      // পুরনো lessons এবং paragraphs delete করো
      for (const lesson of oldLessons) {
        await Paragraph.deleteMany({ lessonId: lesson._id });
      }
      await Lesson.deleteMany({ chapterId: chapter._id });

      // ✅ নতুন lessons create করো (images preserve করে)
      for (let i = 0; i < lessonsBody.length; i++) {
        const lessonData = lessonsBody[i];

        let lessonImage = null;
        let lessonImagePublicId = null;

        // নতুন image পাঠানো হয়েছে কিনা check করো
        const imageFile = 
          getFileByFieldname(req.files, `lessonImage_${i}`) || 
          getFileByFieldname(req.files, `sectionImage_${i}`);

        if (imageFile) {
          // ✅ নতুন image upload করো
          try {
            // পুরনো image থাকলে delete করো
            if (oldImagesMap[i] && oldImagesMap[i].lessonImagePublicId) {
              await deleteFromCloudinary(oldImagesMap[i].lessonImagePublicId);
            }

            const uploaded = await uploadToCloudinary(
              imageFile.path,
              "lessons",
            );
            lessonImage = uploaded.url;
            lessonImagePublicId = uploaded.publicId;
          } catch (uploadError) {
            console.error(
              `Failed to upload lesson image ${i}:`,
              uploadError.message,
            );
            // Upload fail হলে পুরনো image রাখো
            if (oldImagesMap[i]) {
              lessonImage = oldImagesMap[i].lessonImage;
              lessonImagePublicId = oldImagesMap[i].lessonImagePublicId;
            }
          }
        } else if (oldImagesMap[i]) {
          // ✅ নতুন image না পাঠালে পুরনো image রাখো
          lessonImage = oldImagesMap[i].lessonImage;
          lessonImagePublicId = oldImagesMap[i].lessonImagePublicId;
        }
        const heading =
          lessonData.title || lessonData.heading || `Lesson ${i + 1}`;
        const newLesson = await Lesson.create({
          chapterId: chapter._id,
          lessonOrder: lessonData.order || i + 1,
          heading,
          lessonImage,
          lessonImagePublicId,
        });
        let paragraphsToCreate = [];
        if (lessonData.content && typeof lessonData.content === "string") {
          paragraphsToCreate = lessonData.content
            .split("\n\n")
            .filter((p) => p.trim() !== "")
            .map((text, idx) => ({
              paragraphOrder: idx + 1,
              content: text.trim(),
            }));
        } else if (
          lessonData.paragraphs &&
          Array.isArray(lessonData.paragraphs)
        ) {
          paragraphsToCreate = lessonData.paragraphs.map((p, idx) => ({
            paragraphOrder: idx + 1,
            content: typeof p === "string" ? p : p.content,
          }));
        }
        for (const para of paragraphsToCreate) {
          await Paragraph.create({
            lessonId: newLesson._id,
            paragraphOrder: para.paragraphOrder,
            content: para.content,
          });
        }
      }
      hasChanges = true;
    }

    // কোনো change না হলে
    if (!hasChanges) {
      deleteAllTempFiles(req.files);
      return res.status(400).json({
        msg: "No fields to update",
      });
    }

    await chapter.save();

    // Cleanup temp files
    deleteAllTempFiles(req.files);

    // Fetch complete chapter
    const completeLessons = await Lesson.find({
      chapterId: chapter._id,
    }).sort({ lessonOrder: 1 });

    return res.status(200).json({
      msg: "Chapter updated successfully",
      chapter: {
        _id: chapter._id,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        subtitle: chapter.subtitle,
        coverImage: chapter.coverImage,
        status: chapter.status,
        publishedAt: chapter.publishedAt,
        lessons: completeLessons,
      },
    });
  } catch (error) {
    deleteAllTempFiles(req.files);

    return res.status(500).json({
      msg: error.message || "Internal server error",
    });
  }
};
// ========================================
// TOGGLE CHAPTER STATUS
// ========================================
export const toggleChapterStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (req.user.role !== "admin") {
      return res.status(403).json({
        msg: "Only admins can change status",
      });
    }

    if (!["draft", "published"].includes(status)) {
      return res.status(400).json({
        msg: "Status must be draft or published",
      });
    }

    const chapter = await Chapter.findById(id);
    if (!chapter) {
      return res.status(404).json({
        msg: "Chapter not found",
      });
    }

    chapter.status = status;
    chapter.publishedAt = status === "published" ? new Date() : null;
    await chapter.save();

    return res.status(200).json({
      msg: `Chapter ${
        status === "published" ? "published" : "unpublished"
      } successfully`,
      chapter: {
        _id: chapter._id,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        status: chapter.status,
        publishedAt: chapter.publishedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal server error",
    });
  }
};

// ========================================
// DELETE CHAPTER
// ========================================
export const deleteChapter = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "admin") {
      return res.status(403).json({
        msg: "Only admins can delete chapters",
      });
    }

    const chapter = await Chapter.findById(id);
    if (!chapter) {
      return res.status(404).json({
        msg: "Chapter not found",
      });
    }

    // Delete cover image from Cloudinary
    if (chapter.coverImagePublicId) {
      await deleteFromCloudinary(chapter.coverImagePublicId);
    }

    // Delete all lessons and their images
    const lessons = await Lesson.find({ chapterId: chapter._id });
    for (const lesson of lessons) {
      if (lesson.lessonImagePublicId) {
        await deleteFromCloudinary(lesson.lessonImagePublicId);
      }
      await Paragraph.deleteMany({ lessonId: lesson._id });
    }
    await Lesson.deleteMany({ chapterId: chapter._id });

    // Delete chapter from database
    await Chapter.findByIdAndDelete(id);

    return res.status(200).json({
      msg: "Chapter deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal server error",
    });
  }
};
