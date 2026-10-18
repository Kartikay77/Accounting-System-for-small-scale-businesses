const mongoose = require('mongoose');

const VendorBillSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true, index: true },
  number: { type: String, required: true, trim: true },
  date: { type: Date, required: true, default: Date.now, index: true },
  dueDate: { type: Date, required: true, index: true },
  description: { type: String, trim: true },
  subtotal: { type: Number, required: true, min: 0 },
  taxAmount: { type: Number, required: true, min: 0, default: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['OPEN', 'PARTIALLY_PAID', 'PAID', 'VOID'], default: 'OPEN', index: true },
  isArchived: { type: Boolean, default: false, index: true }
}, { timestamps: true });

VendorBillSchema.index({ companyId: 1, number: 1 }, { unique: true });
VendorBillSchema.index({ companyId: 1, dueDate: 1, status: 1 });
VendorBillSchema.virtual('amountDue').get(function amountDue() {
  return Math.max(0, Number(this.totalAmount || 0) - Number(this.amountPaid || 0));
});

module.exports = mongoose.model('VendorBill', VendorBillSchema);
