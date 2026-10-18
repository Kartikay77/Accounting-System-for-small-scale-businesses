const mongoose = require('mongoose');

const AccountingPeriodSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  name: { type: String, required: true, trim: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN', index: true },
  closedAt: Date,
  closedBy: { type: String, trim: true }
}, { timestamps: true });

AccountingPeriodSchema.index({ companyId: 1, startDate: 1, endDate: 1 }, { unique: true });
AccountingPeriodSchema.pre('validate', function validateDates() {
  if (this.startDate && this.endDate && this.startDate > this.endDate) {
    this.invalidate('endDate', 'Period end date must be on or after the start date');
  }
});

module.exports = mongoose.model('AccountingPeriod', AccountingPeriodSchema);
