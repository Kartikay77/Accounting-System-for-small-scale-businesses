const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true, enum: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

AccountSchema.index({ companyId: 1, code: 1 }, { unique: true });
module.exports = mongoose.model('Account', AccountSchema);
