const mongoose = require('mongoose');

const SerialNumberSchema = new mongoose.Schema({
  invoiceItemId: { type: String, required: true, index: true },
  serialNumber: { type: String, required: true, trim: true }
}, { timestamps: true });

SerialNumberSchema.index({ invoiceItemId: 1, serialNumber: 1 }, { unique: true });
SerialNumberSchema.statics.findByInvoiceItemId = function findByInvoiceItemId(invoiceItemId) {
  return this.find({ invoiceItemId: String(invoiceItemId) });
};

module.exports = mongoose.model('SerialNumber', SerialNumberSchema);
