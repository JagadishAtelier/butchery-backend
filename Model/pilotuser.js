// Model/PilotUser.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const pilotAddressSchema = new mongoose.Schema(
  {
    label: { type: String }, // e.g. "Home", "Permanent"
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: 'India' },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const docSchema = new mongoose.Schema(
  {
    filename: { type: String }, // stored filename or path
    url: { type: String }, // public URL (S3, CDN, etc.)
    mimeType: { type: String },
    size: { type: Number },
    uploadedAt: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { _id: false }
);

const pilotUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: { type: String, required: true, unique: true, trim: true },

    // password
    password: { type: String, required: true },

    // Aadhaar
    aadhaarNumber: {
      type: String,
      required: false,
      unique: true,
      sparse: true, // allow multiple docs without aadhaarNumber
      trim: true,
    },
    aadhaarDocs: {
      type: [docSchema],
      default: [],
    },

    // Licence
    licenceNumber: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
    },
    licenceDocs: {
      type: [docSchema],
      default: [],
    },

    // Primary address (and support multiple addresses if needed)
    addresses: {
      type: [pilotAddressSchema],
      default: [],
    },

    // Status flags
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // optional: role/type
    role: { type: String, enum: ['pilot', 'admin', 'staff'], default: 'pilot' },

    // optional metadata
    meta: {
      lastLogin: Date,
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
  },
  { timestamps: true }
);

// Hide sensitive fields when converting to JSON
pilotUserSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    // remove sensitive/internal fields
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

// Virtual `id` field for convenience (optional)
pilotUserSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Pre-save: hash password if modified
pilotUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method: compare password
pilotUserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance helper: mask aadhaar (for safety when returning partially)
pilotUserSchema.methods.getMaskedAadhaar = function () {
  if (!this.aadhaarNumber) return null;
  const s = this.aadhaarNumber.toString();
  if (s.length <= 4) return '****';
  return '****-****-' + s.slice(-4);
};

// Instance helper: mask licence
pilotUserSchema.methods.getMaskedLicence = function () {
  if (!this.licenceNumber) return null;
  const s = this.licenceNumber.toString();
  if (s.length <= 4) return '****';
  return '****' + s.slice(-4);
};

module.exports = mongoose.model('PilotUser', pilotUserSchema);
