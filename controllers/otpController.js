require('dotenv').config();
const axios = require('axios');

const FAST2SMS_KEY = process.env.FAST2SMS_API_KEY;
const SENDER_ID = process.env.FAST2SMS_SENDER || 'FSTSMS';
const ROUTE = process.env.FAST2SMS_ROUTE || 'p';
const OTP_TTL = parseInt(process.env.OTP_TTL_SECONDS || '300', 10);
const MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);

if (!FAST2SMS_KEY) console.warn('FAST2SMS_API_KEY not set in .env');

// In-memory store for OTPs (for demo)
const otpStore = new Map();

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via Fast2SMS
async function sendSmsFast2Sms(numbersCsv, message) {
  const payload = {
    route: ROUTE,
    sender_id: SENDER_ID,
    message,
    language: "english",
    numbers: numbersCsv
  };
  const headers = {
    Authorization: FAST2SMS_KEY,
    'Content-Type': 'application/json'
  };
  const res = await axios.post('https://www.fast2sms.com/dev/bulkV2', payload, { headers, timeout: 10000 });
  return res.data;
}

// Send OTP
exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: 'Phone is required' });

    // Rate limiting (allow resend every 30s)
    const existing = otpStore.get(phone);
    if (existing && Date.now() < existing.expiresAt - (OTP_TTL - 30) * 1000) {
      const secsLeft = Math.ceil((existing.expiresAt - Date.now()) / 1000);
      return res.status(429).json({ success: false, error: `Please wait ${secsLeft}s before requesting new OTP` });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + OTP_TTL * 1000;
    otpStore.set(phone, { otp, expiresAt, attempts: 0 });

    const message = `Your OTP is ${otp}. Do not share it with anyone.`;

    const sendResp = await sendSmsFast2Sms(phone, message);

    if (sendResp && sendResp.return === true) {
      return res.status(200).json({ success: true, message: 'OTP sent' });
    } else {
      otpStore.delete(phone);
      return res.status(502).json({ success: false, provider: sendResp });
    }

  } catch (err) {
    console.error('sendOtp error:', err.response ? err.response.data : err.message);
    return res.status(500).json({ success: false, error: 'Failed to send OTP', details: err.response ? err.response.data : err.message });
  }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ success: false, error: 'Phone and OTP required' });

    const entry = otpStore.get(phone);
    if (!entry) return res.status(400).json({ success: false, error: 'No OTP requested or expired' });

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(phone);
      return res.status(400).json({ success: false, error: 'OTP expired' });
    }

    entry.attempts++;
    otpStore.set(phone, entry);

    if (entry.attempts > MAX_ATTEMPTS) {
      otpStore.delete(phone);
      return res.status(429).json({ success: false, error: 'Maximum verification attempts exceeded' });
    }

    if (entry.otp === String(otp).trim()) {
      otpStore.delete(phone);
      return res.status(200).json({ success: true, message: 'OTP verified' });
    } else {
      const triesLeft = MAX_ATTEMPTS - entry.attempts;
      return res.status(400).json({ success: false, error: 'Invalid OTP', triesLeft });
    }

  } catch (err) {
    console.error('verifyOtp error:', err);
    return res.status(500).json({ success: false, error: 'Verification failed', details: err.message });
  }
};
