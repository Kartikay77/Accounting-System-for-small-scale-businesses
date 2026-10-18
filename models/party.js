const mongoose = require('mongoose');

const PartySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  gstin: { type: String, trim: true, uppercase: true },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  pincode: { type: String, trim: true },
  country: { type: String, trim: true, default: 'India' },
  contactPersonName: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  mobileNumber: { type: String, trim: true },
  altMobileNumber: { type: String, trim: true },
  companyid: { type: String, required: true, index: true },
  isArchived: { type: Boolean, default: false, index: true }
}, { timestamps: true });

PartySchema.index({ companyid: 1, name: 1 });
PartySchema.index({ companyid: 1, gstin: 1 });

PartySchema.statics.findByCompanyId = function findByCompanyId(companyid) {
  return this.find({ companyid: String(companyid), isArchived: { $ne: true } }).sort({ name: 1 });
};

PartySchema.statics.findByGstin = function findByGstin(gstin, companyid) {
  const query = { gstin: String(gstin || '').trim().toUpperCase(), isArchived: { $ne: true } };
  if (companyid) query.companyid = String(companyid);
  return this.findOne(query);
};

PartySchema.statics.countTotalDoucments = function countTotalDocuments(companyid) {
  if (!companyid) return 0;
  return this.countDocuments({ companyid: String(companyid), isArchived: { $ne: true } });
};

module.exports = mongoose.model('Party', PartySchema);
