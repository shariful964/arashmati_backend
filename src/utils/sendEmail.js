import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, text }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || "shariful0411@gmail.com",
        pass: process.env.EMAIL_PASSWORD || "daoy wqyn xghy xxwp",
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER || "shariful0411@gmail.com",
      to,
      subject,
      text,
    });
    console.log("Email sent successfully to :", to);
  } catch (error) {
    console.error("Email sent failed:", error);
  }
};
