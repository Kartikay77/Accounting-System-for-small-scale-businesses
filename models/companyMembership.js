const mongoose = require('mongoose');

const CompanyMembershipSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: ['OWNER', 'ADMIN', 'ACCOUNTANT', 'SALES', 'WAREHOUSE', 'VIEWER'], default: 'VIEWER' }
}, { timestamps: true });

CompanyMembershipSchema.index({ companyId: 1, userId: 1 }, { unique: true });
module.exports = mongoose.model('CompanyMembership', CompanyMembershipSchema);
