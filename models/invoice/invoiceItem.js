const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true, index: true },
  ratePer: { type: Number, required: true, min: 0 },
  invoiceId: { type: String, required: true, index: true },
  quantity: { type: Number, required: true, min: 0.000001 },
  taxRate: { type: Number, min: 0, max: 100, default: 0 },
  lineSubtotal: { type: Number, min: 0, default: 0 },
  taxAmount: { type: Number, min: 0, default: 0 },
  lineTotal: { type: Number, min: 0, default: 0 }
}, { timestamps: true });

InvoiceItemSchema.statics.findByInvoiceId = function findByInvoiceId(invoiceId) {
  return this.find({ invoiceId: String(invoiceId) });
};

module.exports = mongoose.model('InvoiceItem', InvoiceItemSchema);
