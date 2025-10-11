// utils/sendEmail.js
const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter;

const initTransporter = () => {
  if (!transporter) {
    console.log("📧 Initializing email transporter...");
    console.log("🛠 ENV VARIABLES:", {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.EMAIL_USER,
      hasPass: !!process.env.EMAIL_PASS,
    });

    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 465,
      secure: true, // true for port 465
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 5000,    // 5 seconds
      logger: true,             // nodemailer logs
      debug: true,              // show SMTP traffic in console
    });
  }
};

const sendEmail = async (to, subject, htmlContent, textContent) => {
  if (!transporter) initTransporter();

  const mailOptions = {
    from: `"ShopNow" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text: textContent,
    html: htmlContent,
  };

  console.log("📨 Sending email to:", to);
  console.log("📝 Subject:", subject);
  console.log("💬 Text:", textContent);
  console.log("🖥 HTML:", htmlContent);

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully! Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("❌ Failed to send email!");
    console.error("Error details:", error);

    // Optional: give a friendly message for API responses
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

module.exports = sendEmail;
