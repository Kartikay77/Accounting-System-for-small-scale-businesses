const mongoose = require('mongoose');

const BankTransactionSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
  date: { type: Date, required: true, default: Date.now, index: true },
  description: { type: String, trim: true },
  reference: { type: String, trim: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['UNMATCHED', 'MATCHED'], default: 'UNMATCHED', index: true },
  matchedJournalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
  matchedAt: Date
}, { timestamps: true });

BankTransactionSchema.index({ companyId: 1, date: -1 });
module.exports = mongoose.model('BankTransaction', BankTransactionSchema);
