const mongoose = require('mongoose');

const InventoryTransactionSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
  type: { type: String, enum: ['OPENING_BALANCE', 'PURCHASE', 'SALE', 'RETURN_IN', 'RETURN_OUT', 'ADJUSTMENT', 'TRANSFER'], required: true },
  quantity: { type: Number, required: true },
  unitCost: { type: Number, min: 0, default: 0 },
  referenceType: { type: String, trim: true },
  referenceId: { type: String, trim: true, index: true },
  notes: { type: String, trim: true },
  transactionDate: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

InventoryTransactionSchema.index({ companyId: 1, itemId: 1, transactionDate: -1 });
module.exports = mongoose.model('InventoryTransaction', InventoryTransactionSchema);
