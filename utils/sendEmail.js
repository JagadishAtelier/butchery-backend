const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter;

const initTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false, // true if using 465
      auth: {
        user: process.env.EMAIL_USER, // your gmail address
        pass: process.env.EMAIL_PASS, // your app password (not Gmail login)
      },
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

  const info = await transporter.sendMail(mailOptions);
  console.log(`✅ Email sent: ${info.messageId}`);
  return info;
};

module.exports = sendEmail;
