import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, text }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: "shariful0411@gmail.com",
        pass: "daoy wqyn xghy xxwp",
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });
    await transporter.sendMail({
      from: "shariful0411@gmail.com",
      to,
      subject,
      text,
    });
    console.log("Email sent successfully to :", to);
  } catch (error) {
    console.error("Email sent failed:", error);
  }
};
