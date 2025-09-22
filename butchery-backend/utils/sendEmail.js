const nodemailer = require('nodemailer');
require('dotenv').config();


let transporter;

const initTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_USER, 
        pass: process.env.BREVO_PASS 
      }
    });
  }
};

const sendEmail = async (to, subject, text) => {
  if (!transporter) initTransporter();

  const mailOptions = {
    from: `"ShopNow" <prasanth.atelier@gmail.com>`,
    to,
    subject,
    text
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

module.exports = sendEmail;
