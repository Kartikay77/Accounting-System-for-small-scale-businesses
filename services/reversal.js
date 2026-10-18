const JournalEntry = require('../models/journalEntry');
const { assertOpenPeriod } = require('./accounting');

async function reverseJournalEntry({ companyId, journalEntryId, date = new Date(), description }) {
  await assertOpenPeriod(companyId, date);
  const original = await JournalEntry.findOne({ _id: journalEntryId, companyId, status: 'POSTED' });
  if (!original) throw new Error('Original journal entry not found');

  const existing = await JournalEntry.findOne({
    companyId,
    referenceType: 'REVERSAL',
    referenceId: String(original._id),
    status: 'POSTED'
  });
  if (existing) return existing;

  return JournalEntry.create({
    companyId,
    date,
    referenceType: 'REVERSAL',
    referenceId: String(original._id),
    description: description || `Reversal of ${original.description || original.referenceType}`,
    status: 'POSTED',
    lines: original.lines.map((line) => ({
      accountId: line.accountId,
      description: `Reversal: ${line.description || original.description || ''}`,
      debit: line.credit,
      credit: line.debit
    }))
  });
}

module.exports = { reverseJournalEntry };
