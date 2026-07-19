import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import chapterRoutes from "./routes/chapterRoutes.js";
import profileRoutes from "./routes/profileRoutes.js"; // ← নতুন add
import userStudyRoutes from "./routes/userStudyRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import faqRoutes from "./routes/faqRoutes.js"; // 



const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

// routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes)
app.use("/api/chapters", chapterRoutes);
app.use("/api/profile", profileRoutes); //
app.use("/api/user-study", userStudyRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/faqs",faqRoutes);



// health check
app.get("/", (req, res) => {
  res.send(`Welcome to ${process.env.APP_NAME}`);
});

export default app;
