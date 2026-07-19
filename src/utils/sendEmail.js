// import nodemailer from "nodemailer";

// export const sendEmail = async ({ to, subject, text }) => {
//   try {
//     const transporter = nodemailer.createTransport({
//       host: process.env.EMAIL_HOST,
//       port: process.env.EMAIL_PORT,
//       secure: false,
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASSWORD,
//       },
//     });
//     await transporter.sendMail({
//       from: process.env.EMAIL_USER,
//       to,
//       subject,
//       text,
//     });
//     console.log("Email sent successfully to :", to);
//   } catch (error) {
//     console.error("Email sent failed:", error);
//   }
// };

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
