const express = require('express');
const Account = require('../models/account');
const JournalEntry = require('../models/journalEntry');
const Party = require('../models/party');
const VendorBill = require('../models/vendorBill');
const BankTransaction = require('../models/bankTransaction');
const AccountingPeriod = require('../models/accountingPeriod');
const auth = require('../middleware/auth');
const { sameOriginOnly } = require('../middleware/security');
const { roundMoney } = require('../utils/money');
const {
  ensureDefaultAccounts,
  postVendorBill,
  postVendorPayment,
  generalLedger,
  trialBalance,
  financialStatements
} = require('../services/accounting');

const router = express.Router();
router.use(auth.isAuthorized, auth.requireCompany);

function companyId(req) { return req.company._id; }
function queryDates(req) { return { from: req.query.from || '', to: req.query.to || '' }; }
function money(value) { return Number(value || 0).toFixed(2); }

router.get('/', async (req, res, next) => {
  try {
    await ensureDefaultAccounts(companyId(req));
    const [accounts, journals, openBills, unmatchedBank, closedPeriods] = await Promise.all([
      Account.countDocuments({ companyId: companyId(req), isActive: true }),
      JournalEntry.countDocuments({ companyId: companyId(req), status: 'POSTED' }),
      VendorBill.countDocuments({ companyId: companyId(req), status: { $in: ['OPEN', 'PARTIALLY_PAID'] }, isArchived: { $ne: true } }),
      BankTransaction.countDocuments({ companyId: companyId(req), status: 'UNMATCHED' }),
      AccountingPeriod.countDocuments({ companyId: companyId(req), status: 'CLOSED' })
    ]);
    return res.render('accounting/index', { title: 'Accounting', accounting_page: true, accounts, journals, openBills, unmatchedBank, closedPeriods });
  } catch (error) { return next(error); }
});

router.get('/ledger', async (req, res, next) => {
  try {
    const { from, to } = queryDates(req);
    const rows = await generalLedger(companyId(req), from, to);
    return res.render('accounting/ledger', { title: 'General Ledger', accounting_page: true, rows: rows.map((r) => ({ ...r, dateText: new Date(r.date).toISOString().slice(0, 10), debitText: money(r.debit), creditText: money(r.credit), balanceText: money(r.balance) })), from, to });
  } catch (error) { return next(error); }
});

router.get('/trial-balance', async (req, res, next) => {
  try {
    const { from, to } = queryDates(req);
    const rows = await trialBalance(companyId(req), from, to);
    const debitTotal = roundMoney(rows.reduce((sum, row) => sum + Number(row.debit || 0), 0));
    const creditTotal = roundMoney(rows.reduce((sum, row) => sum + Number(row.credit || 0), 0));
    return res.render('accounting/trial_balance', { title: 'Trial Balance', accounting_page: true, rows: rows.map((r) => ({ ...r, debitText: money(r.debit), creditText: money(r.credit) })), debitTotal: money(debitTotal), creditTotal: money(creditTotal), balanced: debitTotal === creditTotal, from, to });
  } catch (error) { return next(error); }
});

router.get('/profit-loss', async (req, res, next) => {
  try {
    const { from, to } = queryDates(req);
    const statement = await financialStatements(companyId(req), from, to);
    return res.render('accounting/profit_loss', { title: 'Profit & Loss', accounting_page: true, from, to, revenue: statement.revenue.map((r) => ({ ...r, balanceText: money(r.balance) })), expenses: statement.expenses.map((r) => ({ ...r, balanceText: money(r.balance) })), revenueTotal: money(statement.revenueTotal), expenseTotal: money(statement.expenseTotal), netIncome: money(statement.netIncome) });
  } catch (error) { return next(error); }
});

router.get('/balance-sheet', async (req, res, next) => {
  try {
    const { to } = queryDates(req);
    const statement = await financialStatements(companyId(req), '', to);
    const assetsTotal = roundMoney(statement.assets.reduce((s, r) => s + r.balance, 0));
    const liabilitiesTotal = roundMoney(statement.liabilities.reduce((s, r) => s + r.balance, 0));
    const equityBase = roundMoney(statement.equity.reduce((s, r) => s + r.balance, 0));
    const equityTotal = roundMoney(equityBase + statement.netIncome);
    return res.render('accounting/balance_sheet', { title: 'Balance Sheet', accounting_page: true, to, assets: statement.assets.map((r) => ({ ...r, balanceText: money(r.balance) })), liabilities: statement.liabilities.map((r) => ({ ...r, balanceText: money(r.balance) })), equity: statement.equity.map((r) => ({ ...r, balanceText: money(r.balance) })), assetsTotal: money(assetsTotal), liabilitiesTotal: money(liabilitiesTotal), equityBase: money(equityBase), currentEarnings: money(statement.netIncome), equityTotal: money(equityTotal), liabilitiesEquityTotal: money(roundMoney(liabilitiesTotal + equityTotal)) });
  } catch (error) { return next(error); }
});

router.get('/ap', async (req, res, next) => {
  try {
    const [bills, parties] = await Promise.all([
      VendorBill.find({ companyId: companyId(req), isArchived: { $ne: true } }).sort({ dueDate: 1 }).lean(),
      Party.findByCompanyId(req.session.companyId).lean()
    ]);
    const partyMap = new Map(parties.map((p) => [String(p._id), p.name]));
    const now = new Date();
    const rows = bills.map((bill) => {
      const due = Math.max(0, roundMoney(Number(bill.totalAmount || 0) - Number(bill.amountPaid || 0)));
      const daysPastDue = due > 0 && new Date(bill.dueDate) < now ? Math.floor((now - new Date(bill.dueDate)) / 86400000) : 0;
      return { ...bill, vendorName: partyMap.get(String(bill.partyId)) || 'Unknown', dateText: new Date(bill.date).toISOString().slice(0, 10), dueDateText: new Date(bill.dueDate).toISOString().slice(0, 10), totalText: money(bill.totalAmount), paidText: money(bill.amountPaid), dueText: money(due), daysPastDue };
    });
    return res.render('accounting/ap', { title: 'Accounts Payable', accounting_page: true, rows, parties });
  } catch (error) { return next(error); }
});

router.post('/ap/new', sameOriginOnly, async (req, res, next) => {
  let bill;
  try {
    const party = await Party.findOne({ _id: req.body.partyId, companyid: String(req.session.companyId), isArchived: { $ne: true } });
    if (!party) return res.status(400).send('Select a valid vendor/party');
    const subtotal = roundMoney(Number(req.body.subtotal));
    const taxAmount = roundMoney(Number(req.body.taxAmount || 0));
    if (!(subtotal >= 0) || !(taxAmount >= 0) || subtotal + taxAmount <= 0) return res.status(400).send('Enter valid bill amounts');
    bill = await VendorBill.create({ companyId: companyId(req), partyId: party._id, number: String(req.body.number || '').trim(), date: req.body.date, dueDate: req.body.dueDate, description: req.body.description, subtotal, taxAmount, totalAmount: roundMoney(subtotal + taxAmount) });
    await postVendorBill({ companyId: companyId(req), bill });
    return res.redirect('/accounting/ap');
  } catch (error) {
    if (bill) await VendorBill.deleteOne({ _id: bill._id });
    if (error?.code === 11000) return res.status(409).send('Vendor bill number already exists');
    return next(error);
  }
});

router.post('/ap/:id/pay', sameOriginOnly, async (req, res, next) => {
  try {
    const bill = await VendorBill.findOne({ _id: req.params.id, companyId: companyId(req), isArchived: { $ne: true }, status: { $ne: 'VOID' } });
    if (!bill) return res.status(404).send('Vendor bill not found');
    const due = roundMoney(bill.totalAmount - bill.amountPaid);
    const amount = roundMoney(Number(req.body.amount));
    if (!(amount > 0) || amount > due) return res.status(400).send('Payment must be positive and cannot exceed amount due');
    await postVendorPayment({ companyId: companyId(req), bill, amount, mode: req.body.mode, reference: req.body.reference });
    bill.amountPaid = roundMoney(bill.amountPaid + amount);
    bill.status = bill.amountPaid >= bill.totalAmount ? 'PAID' : 'PARTIALLY_PAID';
    await bill.save();
    return res.redirect('/accounting/ap');
  } catch (error) { return next(error); }
});

router.get('/bank-reconciliation', async (req, res, next) => {
  try {
    const accounts = await ensureDefaultAccounts(companyId(req));
    const bank = accounts['1100'];
    const [transactions, journals] = await Promise.all([
      BankTransaction.find({ companyId: companyId(req), bankAccountId: bank._id }).sort({ date: -1 }).lean(),
      JournalEntry.find({ companyId: companyId(req), status: 'POSTED', 'lines.accountId': bank._id }).sort({ date: -1 }).limit(200).lean()
    ]);
    const journalRows = journals.map((entry) => {
      const line = entry.lines.find((l) => String(l.accountId) === String(bank._id));
      return { _id: entry._id, dateText: new Date(entry.date).toISOString().slice(0, 10), description: entry.description, referenceType: entry.referenceType, amountText: money(Number(line?.debit || 0) - Number(line?.credit || 0)) };
    });
    return res.render('accounting/bank', { title: 'Bank Reconciliation', accounting_page: true, transactions: transactions.map((t) => ({ ...t, dateText: new Date(t.date).toISOString().slice(0, 10), amountText: money(t.amount) })), journals: journalRows });
  } catch (error) { return next(error); }
});

router.post('/bank-reconciliation/new', sameOriginOnly, async (req, res, next) => {
  try {
    const accounts = await ensureDefaultAccounts(companyId(req));
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount === 0) return res.status(400).send('Bank amount cannot be zero');
    await BankTransaction.create({ companyId: companyId(req), bankAccountId: accounts['1100']._id, date: req.body.date, description: req.body.description, reference: req.body.reference, amount });
    return res.redirect('/accounting/bank-reconciliation');
  } catch (error) { return next(error); }
});

router.post('/bank-reconciliation/:id/match', sameOriginOnly, async (req, res, next) => {
  try {
    const accounts = await ensureDefaultAccounts(companyId(req));
    const transaction = await BankTransaction.findOne({ _id: req.params.id, companyId: companyId(req), status: 'UNMATCHED' });
    const journal = await JournalEntry.findOne({ _id: req.body.journalEntryId, companyId: companyId(req), status: 'POSTED' });
    if (!transaction || !journal) return res.status(404).send('Transaction or journal entry not found');
    const bankLine = journal.lines.find((line) => String(line.accountId) === String(accounts['1100']._id));
    const journalAmount = roundMoney(Number(bankLine?.debit || 0) - Number(bankLine?.credit || 0));
    if (journalAmount !== roundMoney(transaction.amount)) return res.status(400).send('Bank transaction amount does not match the selected journal entry');
    transaction.status = 'MATCHED';
    transaction.matchedJournalEntryId = journal._id;
    transaction.matchedAt = new Date();
    await transaction.save();
    return res.redirect('/accounting/bank-reconciliation');
  } catch (error) { return next(error); }
});

router.get('/periods', async (req, res, next) => {
  try {
    const periods = await AccountingPeriod.find({ companyId: companyId(req) }).sort({ startDate: -1 }).lean();
    return res.render('accounting/periods', { title: 'Financial Periods', accounting_page: true, periods: periods.map((p) => ({ ...p, startText: new Date(p.startDate).toISOString().slice(0, 10), endText: new Date(p.endDate).toISOString().slice(0, 10) })) });
  } catch (error) { return next(error); }
});

router.post('/periods/close', sameOriginOnly, async (req, res, next) => {
  try {
    const startDate = new Date(req.body.startDate);
    const endDate = new Date(`${req.body.endDate}T23:59:59.999Z`);
    if (!(startDate <= endDate)) return res.status(400).send('Invalid period dates');
    const overlap = await AccountingPeriod.findOne({ companyId: companyId(req), $or: [{ startDate: { $lte: endDate }, endDate: { $gte: startDate } }] });
    if (overlap) return res.status(409).send('This period overlaps an existing financial period');
    const draftCount = await JournalEntry.countDocuments({ companyId: companyId(req), status: 'DRAFT', date: { $gte: startDate, $lte: endDate } });
    if (draftCount) return res.status(409).send('Post or remove draft journal entries before closing the period');

    const tb = await trialBalance(companyId(req), req.body.startDate, req.body.endDate);
    const closingLines = [];
    let netIncome = 0;
    for (const row of tb) {
      if (row.type === 'REVENUE') {
        const balance = roundMoney(row.credit - row.debit);
        if (balance > 0) closingLines.push({ accountId: row._id, debit: balance, credit: 0, description: 'Period close' });
        netIncome = roundMoney(netIncome + balance);
      }
      if (row.type === 'EXPENSE') {
        const balance = roundMoney(row.debit - row.credit);
        if (balance > 0) closingLines.push({ accountId: row._id, debit: 0, credit: balance, description: 'Period close' });
        netIncome = roundMoney(netIncome - balance);
      }
    }
    if (closingLines.length) {
      const accounts = await ensureDefaultAccounts(companyId(req));
      closingLines.push({ accountId: accounts['3000']._id, debit: netIncome < 0 ? Math.abs(netIncome) : 0, credit: netIncome > 0 ? netIncome : 0, description: 'Current period earnings transferred to equity' });
      await JournalEntry.create({ companyId: companyId(req), date: endDate, referenceType: 'PERIOD_CLOSE', referenceId: `${req.body.startDate}:${req.body.endDate}`, description: `Close ${req.body.name || req.body.endDate}`, status: 'POSTED', lines: closingLines });
    }
    await AccountingPeriod.create({ companyId: companyId(req), name: req.body.name || `${req.body.startDate} to ${req.body.endDate}`, startDate, endDate, status: 'CLOSED', closedAt: new Date(), closedBy: req.session.userId });
    return res.redirect('/accounting/periods');
  } catch (error) { return next(error); }
});

module.exports = router;
