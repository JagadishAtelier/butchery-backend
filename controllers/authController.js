const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../Model/User');
const sendEmail = require('../utils/sendEmail');
const protect = require('../middleware/auth')
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

exports.register = async function (req, res) {
  try {
    const { name, email, password, role = 'customer' } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const newUser = new User({ name, email, password, role });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully',result :newUser });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.login = async function (req, res) {
  try {
    const { email, password } = req.body;

    // 🔍 Find user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 🔐 Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // 🔑 Generate token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 📦 Prepare response data
    const responseUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      role: user.role,
      address: user.addresses && user.addresses.length > 0 ? user.addresses[0] : null, // return only first address
    };

    // 🚀 Send response
    res.status(200).json({
      token,
      user: responseUser,
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const createOtpEmailTemplate = (otp) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
            .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eeeeee; }
            .header img { width: 150px; }
            .content { padding: 20px 0; }
            .content p { font-size: 16px; color: #333333; line-height: 1.5; }
            .otp-code { font-size: 36px; font-weight: bold; text-align: center; padding: 20px; background-color: #f0f0f0; border-radius: 5px; letter-spacing: 5px; margin: 20px 0; }
            .footer { text-align: center; font-size: 12px; color: #777777; padding-top: 20px; border-top: 1px solid #eeeeee; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>ShopNow By Atelier</h1>
                <h2>Password Reset Request</h2>
            </div>
            <div class="content">
                <p>Hello,</p>
                <p>We received a request to reset the password for your account. Please use the following One-Time Password (OTP) to proceed:</p>
                <div class="otp-code">${otp}</div>
                <p>This OTP is valid for 10 minutes. If you did not request this, please disregard this email.</p>
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ShopNow By Atelier. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
  user.otp = otp;
  user.otpExpires = Date.now() + 10 * 60 * 1000; 
  await user.save();

 const subject = 'Your Password Reset OTP';
    const htmlContent = createOtpEmailTemplate(otp);
    const textContent = `Your password reset OTP is: ${otp}. It expires in 10 minutes.`;

    await sendEmail(email, subject, htmlContent, textContent);

  res.json({ message: 'OTP sent to your email' });
};

exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({ email, otp, otpExpires: { $gt: Date.now() } });
  if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });

  user.password = newPassword;
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  res.json({ message: 'Password reset successful' });
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user profile', error: err.message });
  }
};


// update-profile controller (supports addresses)
exports.updateProfile = async (req, res) => {
  try {
    const { name, email,phone, addresses } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // update basic profile fields
    if (name) user.name = name;

    if (email && email !== user.email) {
      const exists = await User.findOne({ email });
      if (exists && exists._id.toString() !== user._id.toString()) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email;
    }

    // handle addresses if provided
    if (typeof addresses !== 'undefined') {
      if (!Array.isArray(addresses)) {
        return res.status(400).json({ message: 'Addresses must be an array' });
      }

      // sanitize and normalize incoming address objects
      const sanitized = addresses.map((a) => ({
        label: (a.label || '').trim(),
        street: (a.street || '').trim(),
        city: (a.city || '').trim(),
        state: (a.state || '').trim(),
        pincode: a.pincode ? String(a.pincode).trim() : '',
        landmark: a.landmark ? String(a.landmark).trim() : '',
        isDefault: !!a.isDefault,
      }));

      // validate required fields for each address
      for (let i = 0; i < sanitized.length; i += 1) {
        const addr = sanitized[i];
        if (!addr.label || !addr.street || !addr.city || !addr.pincode) {
          return res.status(400).json({
            message: `Address at index ${i} missing required fields (label, street, city, pincode).`,
          });
        }
        // basic pincode validation (adjust to your country's rule if needed)
        if (!/^\d{4,10}$/.test(addr.pincode)) {
          return res.status(400).json({
            message: `Address at index ${i} has invalid pincode.`,
          });
        }
      }

      // ensure at most one default address: keep the first default and unset others
      const defaultCount = sanitized.filter((a) => a.isDefault).length;
      if (defaultCount > 1) {
        let seen = false;
        sanitized.forEach((a) => {
          if (a.isDefault) {
            if (!seen) seen = true;
            else a.isDefault = false;
          }
        });
      }

      // assign sanitized addresses to user
      user.addresses = sanitized;
    }

    await user.save();

    // avoid returning sensitive fields
    const userObj = user.toObject ? user.toObject() : user;
    if (userObj.password) delete userObj.password;

    return res.json({ message: 'Profile updated successfully', user: userObj });
  } catch (err) {
    return res.status(500).json({ message: 'Update failed', error: err.message });
  }
};


exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Old password is incorrect' });
    const isMatching = await bcrypt.compare(oldPassword, newPassword);
    if (isMatching) return res.status(400).json({ message: 'can not have new password as oldpassword' });

    user.password = newPassword; // will be hashed by pre-save hook
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to change password', error: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select("-password -otp -otpExpires") // hide sensitive fields
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch user",
      error: err.message,
    });
  }
};
