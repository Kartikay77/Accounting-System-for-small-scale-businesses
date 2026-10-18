const mongoose = require('mongoose');

const SerialNumberSchema = new mongoose.Schema({
  companyId: { type: String, index: true },
  itemId: { type: String, index: true },
  invoiceItemId: { type: String, required: true, index: true },
  serialNumber: { type: String, required: true, trim: true, uppercase: true }
}, { timestamps: true });

SerialNumberSchema.index(
  { companyId: 1, serialNumber: 1 },
  { unique: true, partialFilterExpression: { companyId: { $type: 'string' } } }
);
SerialNumberSchema.statics.findByInvoiceItemId = function findByInvoiceItemId(invoiceItemId) {
  return this.find({ invoiceItemId: String(invoiceItemId) });
};

module.exports = mongoose.model('SerialNumber', SerialNumberSchema);
