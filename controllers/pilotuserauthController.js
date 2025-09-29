// controllers/pilotUserAuthController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PilotUser = require('../Model/pilotuser');
const sendEmail = require('../utils/sendEmail');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

// Helper: create token
function signToken(pilot) {
  return jwt.sign({ pilotId: pilot._id, role: pilot.role || 'pilot' }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

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

// REGISTER
exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      aadhaarNumber,
      licenceNumber,
      addresses = [],
    } = req.body;

    const existing = await PilotUser.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Pilot with this email already exists' });

    const pilot = new PilotUser({
      name,
      email,
      password,
      phone,
      aadhaarNumber,
      licenceNumber,
      addresses,
    });

    await pilot.save();

    // sign token
    const token = signToken(pilot);

    res.status(201).json({
      success: true,
      message: 'Pilot registered successfully',
      token,
      pilot: {
        id: pilot._id,
        name: pilot.name,
        email: pilot.email,
        phone: pilot.phone,
        role: pilot.role,
      },
    });
  } catch (err) {
    console.error('Pilot register error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const pilot = await PilotUser.findOne({ email }).select('+password') || await PilotUser.findOne({ email });
    if (!pilot) return res.status(404).json({ message: 'Pilot not found' });

    // If schema uses select: false for password, ensure we fetch it; fallback to stored password
    const pilotWithPassword = pilot.password ? pilot : await PilotUser.findOne({ email }).select('+password');

    const isMatch = await bcrypt.compare(password, pilotWithPassword.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = signToken(pilotWithPassword);

    res.status(200).json({
      success: true,
      token,
      pilot: { id: pilotWithPassword._id, name: pilotWithPassword.name, email: pilotWithPassword.email, role: pilotWithPassword.role },
    });
  } catch (err) {
    console.error('Pilot login error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// FORGOT PASSWORD (OTP)
// NOTE: Ensure PilotUser schema has `otp` and `otpExpires` fields for this to work.
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const pilot = await PilotUser.findOne({ email });
    if (!pilot) return res.status(404).json({ message: 'Pilot not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    pilot.otp = otp;
    pilot.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await pilot.save();

    const subject = 'Your Password Reset OTP';
    const htmlContent = createOtpEmailTemplate(otp);
    const textContent = `Your password reset OTP is: ${otp}. It expires in 10 minutes.`;

    await sendEmail(pilot.email, subject, htmlContent, textContent);

    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) {
    console.error('Pilot forgotPassword error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// RESET PASSWORD (using OTP)
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const pilot = await PilotUser.findOne({ email, otp, otpExpires: { $gt: Date.now() } });
    if (!pilot) return res.status(400).json({ message: 'Invalid or expired OTP' });

    pilot.password = newPassword; // pre-save will hash
    pilot.otp = undefined;
    pilot.otpExpires = undefined;
    await pilot.save();

    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    console.error('Pilot resetPassword error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// PROTECT MIDDLEWARE FOR PILOT ROUTES (use in routes: protectPilot)
exports.protectPilot = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) return res.status(401).json({ message: 'No token provided' });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.error('Pilot JWT verify error:', err);
      if (err.name === 'TokenExpiredError') return res.status(401).json({ message: 'Token expired' });
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const pilotId = decoded.pilotId || decoded.id;
    if (!pilotId) return res.status(401).json({ message: 'Invalid token payload' });

    const pilot = await PilotUser.findById(pilotId).select('-password');
    if (!pilot) return res.status(401).json({ message: 'Pilot not found' });

    req.pilot = pilot; // attach pilot to request
    next();
  } catch (err) {
    console.error('protectPilot unexpected error:', err);
    res.status(500).json({ message: 'Server error in auth' });
  }
};

// GET PROFILE (uses protectPilot)
exports.getProfile = async (req, res) => {
  try {
    // support both req.pilot (when using protectPilot) and token-based fallback
    const pilot = req.pilot || (await PilotUser.findById(req.user?._id || req.params?.id).select('-password'));
    if (!pilot) return res.status(404).json({ message: 'Pilot not found' });
    res.json({ success: true, pilot });
  } catch (err) {
    console.error('getProfile error:', err);
    res.status(500).json({ message: 'Failed to fetch pilot profile', error: err.message });
  }
};

// UPDATE PROFILE
exports.updateProfile = async (req, res) => {
  try {
    const pilot = req.pilot || (await PilotUser.findById(req.params?.id || req.user?._id));
    if (!pilot) return res.status(404).json({ message: 'Pilot not found' });

    const { name, email, phone, addresses, aadhaarNumber, licenceNumber } = req.body;

    if (name) pilot.name = name;
    if (phone) pilot.phone = phone;
    if (addresses) pilot.addresses = addresses;

    if (email && email !== pilot.email) {
      const exists = await PilotUser.findOne({ email });
      if (exists) return res.status(400).json({ message: 'Email already in use' });
      pilot.email = email;
    }

    if (aadhaarNumber && aadhaarNumber !== pilot.aadhaarNumber) {
      const existsA = await PilotUser.findOne({ aadhaarNumber });
      if (existsA) return res.status(400).json({ message: 'Aadhaar number already in use' });
      pilot.aadhaarNumber = aadhaarNumber;
    }

    if (licenceNumber && licenceNumber !== pilot.licenceNumber) {
      const existsL = await PilotUser.findOne({ licenceNumber });
      if (existsL) return res.status(400).json({ message: 'Licence number already in use' });
      pilot.licenceNumber = licenceNumber;
    }

    await pilot.save();
    res.json({ success: true, message: 'Profile updated successfully', pilot: pilot.toJSON() });
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
};

// CHANGE PASSWORD
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const pilot = req.pilot || (await PilotUser.findById(req.user?._id).select('+password'));
    if (!pilot) return res.status(404).json({ message: 'Pilot not found' });

    const hasPassword = pilot.password;
    if (!hasPassword) return res.status(400).json({ message: 'No password set for this account' });

    const isMatch = await bcrypt.compare(oldPassword, pilot.password);
    if (!isMatch) return res.status(400).json({ message: 'Old password is incorrect' });

    const isSame = await bcrypt.compare(newPassword, pilot.password);
    if (isSame) return res.status(400).json({ message: 'New password cannot be same as old password' });

    pilot.password = newPassword;
    await pilot.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('changePassword error:', err);
    res.status(500).json({ message: 'Failed to change password', error: err.message });
  }
};

// GET PILOT BY ID (public or admin)
exports.getPilotById = async (req, res) => {
  try {
    const { id } = req.params;
    const pilot = await PilotUser.findById(id).select('-password -otp -otpExpires');
    if (!pilot) return res.status(404).json({ message: 'Pilot not found' });
    res.json({ success: true, pilot });
  } catch (err) {
    console.error('getPilotById error:', err);
    res.status(500).json({ message: 'Failed to fetch pilot', error: err.message });
  }
};
