const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  partyId: { type: String, required: true, index: true },
  date: { type: Date, required: true, default: Date.now, index: true },
  number: { type: String, required: true, trim: true },
  totalAmount: { type: Number, required: true, min: 0, default: 0 },
  narration: { type: String, trim: true },
  eWay: { type: String, trim: true },
  companyId: { type: String, required: true, index: true },
  status: {
    type: String,
    enum: ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID'],
    default: 'ISSUED',
    index: true
  },
  amountPaid: { type: Number, min: 0, default: 0 },
  isArchived: { type: Boolean, default: false, index: true }
}, { timestamps: true });

InvoiceSchema.index({ companyId: 1, number: 1 }, { unique: true });
InvoiceSchema.index({ companyId: 1, date: -1 });

InvoiceSchema.virtual('amountDue').get(function amountDue() {
  return Math.max(0, this.totalAmount - this.amountPaid);
});

InvoiceSchema.statics.findByCompanyId = function findByCompanyId(companyId) {
  return this.find({ companyId: String(companyId), isArchived: { $ne: true } }).sort({ date: -1, createdAt: -1 });
};

InvoiceSchema.statics.countTotalDoucments = function countTotalDocuments(companyId) {
  if (!companyId) return 0;
  return this.countDocuments({ companyId: String(companyId), isArchived: { $ne: true } });
};

module.exports = mongoose.model('Invoice', InvoiceSchema);
