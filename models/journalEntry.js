const mongoose = require('mongoose');
const { roundMoney } = require('../utils/money');

const JournalLineSchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  description: { type: String, trim: true },
  debit: { type: Number, min: 0, default: 0 },
  credit: { type: Number, min: 0, default: 0 }
}, { _id: false });

const JournalEntrySchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  date: { type: Date, required: true, default: Date.now, index: true },
  referenceType: { type: String, trim: true },
  referenceId: { type: String, trim: true, index: true },
  description: { type: String, trim: true },
  status: { type: String, enum: ['DRAFT', 'POSTED', 'REVERSED'], default: 'POSTED' },
  lines: { type: [JournalLineSchema], validate: [(lines) => lines.length >= 2, 'Journal entry requires at least two lines'] }
}, { timestamps: true });

JournalEntrySchema.pre('validate', function validateBalance() {
  const debit = roundMoney(this.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0));
  const credit = roundMoney(this.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0));
  if (debit !== credit) this.invalidate('lines', `Journal entry is not balanced: debit ${debit}, credit ${credit}`);
  if (debit === 0) this.invalidate('lines', 'Journal entry total cannot be zero');
});

JournalEntrySchema.index({ companyId: 1, date: -1 });
module.exports = mongoose.model('JournalEntry', JournalEntrySchema);
