const mongoose = require('mongoose');

const PaymentAllocationSchema = new mongoose.Schema({
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  amount: { type: Number, required: true, min: 0.01 }
}, { _id: false });

const PaymentSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true, index: true },
  vendorBillId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorBill', index: true },
  type: { type: String, enum: ['CUSTOMER_RECEIPT', 'VENDOR_PAYMENT'], default: 'CUSTOMER_RECEIPT', index: true },
  date: { type: Date, required: true, default: Date.now },
  amount: { type: Number, required: true, min: 0.01 },
  mode: { type: String, enum: ['CASH', 'BANK_TRANSFER', 'CARD', 'UPI', 'CHEQUE', 'OTHER'], default: 'BANK_TRANSFER' },
  reference: { type: String, trim: true },
  allocations: [PaymentAllocationSchema],
  status: { type: String, enum: ['POSTED', 'VOID'], default: 'POSTED', index: true },
  reversedAt: Date,
  reversalReason: { type: String, trim: true, maxlength: 250 }
}, { timestamps: true });

PaymentSchema.index({ companyId: 1, date: -1 });
module.exports = mongoose.model('Payment', PaymentSchema);
