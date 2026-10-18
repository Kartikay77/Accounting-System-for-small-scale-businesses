const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, trim: true, lowercase: true },
  gstin: { type: String, trim: true, uppercase: true },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  pincode: { type: String, trim: true },
  country: { type: String, trim: true, default: 'India' },
  bankName: { type: String, trim: true },
  branch: { type: String, trim: true },
  ifsc: { type: String, trim: true, uppercase: true },
  accountNumber: { type: String, trim: true },
  userid: { type: String, required: true, index: true },
  isArchived: { type: Boolean, default: false, index: true }
}, { timestamps: true });

CompanySchema.index({ userid: 1, name: 1 });

CompanySchema.statics.findByUserId = function findByUserId(userid) {
  return this.find({ userid: String(userid), isArchived: { $ne: true } }).sort({ name: 1 });
};

CompanySchema.statics.countTotalDoucments = function countTotalDocuments(userid) {
  return this.countDocuments({ userid: String(userid), isArchived: { $ne: true } });
};

module.exports = mongoose.model('Company', CompanySchema);
