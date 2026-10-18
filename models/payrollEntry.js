const mongoose = require('mongoose');

const PayrollEntrySchema = new mongoose.Schema({
  companyId: { type: String, required: true, index: true },
  employeeName: { type: String, required: true, trim: true, maxlength: 120 },
  monthlySalary: { type: Number, required: true, min: 0 },
  isArchived: { type: Boolean, default: false, index: true }
}, { timestamps: true });

PayrollEntrySchema.index({ companyId: 1, employeeName: 1 }, { unique: true });

PayrollEntrySchema.statics.findByCompanyId = function findByCompanyId(companyId) {
  return this.find({ companyId: String(companyId), isArchived: { $ne: true } }).sort({ employeeName: 1 });
};

module.exports = mongoose.model('PayrollEntry', PayrollEntrySchema);
