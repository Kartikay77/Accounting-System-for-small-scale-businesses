const Account = require('../models/account');
const JournalEntry = require('../models/journalEntry');
const AccountingPeriod = require('../models/accountingPeriod');
const InventoryTransaction = require('../models/inventoryTransaction');
const Item = require('../models/items/item');
const InvoiceItem = require('../models/invoice/invoiceItem');
const { roundMoney } = require('../utils/money');

const DEFAULT_ACCOUNTS = [
  ['1000', 'Cash', 'ASSET'],
  ['1100', 'Bank', 'ASSET'],
  ['1200', 'Accounts Receivable', 'ASSET'],
  ['1300', 'Inventory', 'ASSET'],
  ['2000', 'Accounts Payable', 'LIABILITY'],
  ['2100', 'GST Payable', 'LIABILITY'],
  ['2200', 'GST Input Credit', 'ASSET'],
  ['3000', 'Owner Equity', 'EQUITY'],
  ['4000', 'Sales Revenue', 'REVENUE'],
  ['5000', 'Cost of Goods Sold', 'EXPENSE'],
  ['5100', 'Operating Expense', 'EXPENSE']
];

async function ensureDefaultAccounts(companyId) {
  const docs = [];
  for (const [code, name, type] of DEFAULT_ACCOUNTS) {
    docs.push(await Account.findOneAndUpdate(
      { companyId, code },
      { $setOnInsert: { companyId, code, name, type, isActive: true } },
      { upsert: true, new: true }
    ));
  }
  return Object.fromEntries(docs.map((doc) => [doc.code, doc]));
}

async function assertOpenPeriod(companyId, date) {
  const day = new Date(date);
  const closed = await AccountingPeriod.findOne({
    companyId,
    status: 'CLOSED',
    startDate: { $lte: day },
    endDate: { $gte: day }
  }).lean();
  if (closed) throw new Error(`Accounting period ${closed.name} is closed`);
}

async function postJournal({ companyId, date, referenceType, referenceId, description, lines }) {
  await assertOpenPeriod(companyId, date);
  const existing = await JournalEntry.findOne({ companyId, referenceType, referenceId, status: { $ne: 'REVERSED' } });
  if (existing) return existing;
  const accounts = await ensureDefaultAccounts(companyId);
  const mapped = lines
    .map((line) => ({
      accountId: accounts[line.code]?._id,
      description: line.description || description,
      debit: roundMoney(line.debit || 0),
      credit: roundMoney(line.credit || 0)
    }))
    .filter((line) => line.accountId && (line.debit || line.credit));
  return JournalEntry.create({ companyId, date, referenceType, referenceId: String(referenceId), description, status: 'POSTED', lines: mapped });
}

async function postSalesInvoice({ companyId, invoice, lines }) {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + Number(line.lineSubtotal || 0), 0));
  const tax = roundMoney(lines.reduce((sum, line) => sum + Number(line.taxAmount || 0), 0));
  const total = roundMoney(subtotal + tax);
  const journal = await postJournal({
    companyId,
    date: invoice.date,
    referenceType: 'SALES_INVOICE',
    referenceId: invoice._id,
    description: `Sales invoice ${invoice.number}`,
    lines: [
      { code: '1200', debit: total },
      { code: '4000', credit: subtotal },
      { code: '2100', credit: tax }
    ]
  });

  let cogs = 0;
  const createdTransactions = [];
  try {
    for (const line of lines) {
      const item = line.item;
      const quantity = Number(line.quantity || 0);
      const unitCost = Number(item.unitCost || 0);
      if (Number(item.quantityOnHand || 0) < quantity) throw new Error(`Insufficient stock for ${item.newModelName}`);
      await Item.updateOne({ _id: item._id, companyId: String(companyId) }, { $inc: { quantityOnHand: -quantity } });
      const tx = await InventoryTransaction.create({
        companyId,
        itemId: item._id,
        type: 'SALE',
        quantity: -quantity,
        unitCost,
        referenceType: 'SALES_INVOICE',
        referenceId: String(invoice._id),
        transactionDate: invoice.date
      });
      createdTransactions.push({ tx, itemId: item._id, quantity });
      cogs = roundMoney(cogs + quantity * unitCost);
    }
    if (cogs > 0) {
      await postJournal({
        companyId,
        date: invoice.date,
        referenceType: 'COGS',
        referenceId: invoice._id,
        description: `COGS for invoice ${invoice.number}`,
        lines: [
          { code: '5000', debit: cogs },
          { code: '1300', credit: cogs }
        ]
      });
    }
    return journal;
  } catch (error) {
    for (const created of createdTransactions) {
      await Item.updateOne({ _id: created.itemId }, { $inc: { quantityOnHand: created.quantity } });
      await InventoryTransaction.deleteOne({ _id: created.tx._id });
    }
    await JournalEntry.deleteMany({ companyId, referenceId: String(invoice._id), referenceType: { $in: ['SALES_INVOICE', 'COGS'] } });
    throw error;
  }
}

async function reverseSalesInvoice({ companyId, invoice }) {
  const originalEntries = await JournalEntry.find({ companyId, referenceId: String(invoice._id), status: 'POSTED' });
  for (const original of originalEntries) {
    await JournalEntry.create({
      companyId,
      date: new Date(),
      referenceType: 'REVERSAL',
      referenceId: String(original._id),
      description: `Reversal of ${original.description || invoice.number}`,
      status: 'POSTED',
      lines: original.lines.map((line) => ({
        accountId: line.accountId,
        description: `Reversal: ${line.description || ''}`,
        debit: line.credit,
        credit: line.debit
      }))
    });
    original.status = 'REVERSED';
    await original.save();
  }

  const saleTransactions = await InventoryTransaction.find({ companyId, referenceType: 'SALES_INVOICE', referenceId: String(invoice._id) });
  for (const tx of saleTransactions) {
    const restore = Math.abs(Number(tx.quantity || 0));
    await Item.updateOne({ _id: tx.itemId }, { $inc: { quantityOnHand: restore } });
    await InventoryTransaction.create({
      companyId,
      itemId: tx.itemId,
      type: 'RETURN_IN',
      quantity: restore,
      unitCost: tx.unitCost,
      referenceType: 'INVOICE_VOID',
      referenceId: String(invoice._id),
      notes: 'Automatic inventory reversal for void invoice'
    });
  }
}

async function postVendorBill({ companyId, bill }) {
  return postJournal({
    companyId,
    date: bill.date,
    referenceType: 'VENDOR_BILL',
    referenceId: bill._id,
    description: `Vendor bill ${bill.number}`,
    lines: [
      { code: '5100', debit: bill.subtotal },
      { code: '2200', debit: bill.taxAmount },
      { code: '2000', credit: bill.totalAmount }
    ]
  });
}

async function postVendorPayment({ companyId, bill, amount, mode, reference }) {
  const cashCode = mode === 'CASH' ? '1000' : '1100';
  return postJournal({
    companyId,
    date: new Date(),
    referenceType: 'VENDOR_PAYMENT',
    referenceId: `${bill._id}:${Date.now()}`,
    description: `Payment for vendor bill ${bill.number}${reference ? ` (${reference})` : ''}`,
    lines: [
      { code: '2000', debit: amount },
      { code: cashCode, credit: amount }
    ]
  });
}

async function generalLedger(companyId, from, to) {
  const accounts = await ensureDefaultAccounts(companyId);
  const accountById = new Map(Object.values(accounts).map((a) => [String(a._id), a]));
  const query = { companyId, status: 'POSTED' };
  if (from || to) query.date = {};
  if (from) query.date.$gte = new Date(from);
  if (to) query.date.$lte = new Date(`${to}T23:59:59.999Z`);
  const entries = await JournalEntry.find(query).sort({ date: 1, createdAt: 1 }).lean();
  const rows = [];
  const balances = new Map();
  for (const entry of entries) {
    for (const line of entry.lines) {
      const account = accountById.get(String(line.accountId)) || await Account.findById(line.accountId).lean();
      if (!account) continue;
      const normalDebit = ['ASSET', 'EXPENSE'].includes(account.type);
      const movement = normalDebit ? Number(line.debit || 0) - Number(line.credit || 0) : Number(line.credit || 0) - Number(line.debit || 0);
      const balance = roundMoney((balances.get(String(account._id)) || 0) + movement);
      balances.set(String(account._id), balance);
      rows.push({ date: entry.date, referenceType: entry.referenceType, referenceId: entry.referenceId, accountCode: account.code, accountName: account.name, description: line.description || entry.description, debit: Number(line.debit || 0), credit: Number(line.credit || 0), balance });
    }
  }
  return rows;
}

async function trialBalance(companyId, from, to) {
  const query = { companyId, status: 'POSTED' };
  if (from || to) query.date = {};
  if (from) query.date.$gte = new Date(from);
  if (to) query.date.$lte = new Date(`${to}T23:59:59.999Z`);
  const entries = await JournalEntry.find(query).lean();
  const accounts = await Account.find({ companyId, isActive: true }).sort({ code: 1 }).lean();
  const sums = new Map(accounts.map((a) => [String(a._id), { debit: 0, credit: 0 }]));
  for (const entry of entries) for (const line of entry.lines) {
    const bucket = sums.get(String(line.accountId)) || { debit: 0, credit: 0 };
    bucket.debit = roundMoney(bucket.debit + Number(line.debit || 0));
    bucket.credit = roundMoney(bucket.credit + Number(line.credit || 0));
    sums.set(String(line.accountId), bucket);
  }
  return accounts.map((account) => ({ ...account, ...(sums.get(String(account._id)) || { debit: 0, credit: 0 }) }));
}

async function financialStatements(companyId, from, to) {
  const tb = await trialBalance(companyId, from, to);
  const balanceFor = (row) => ['ASSET', 'EXPENSE'].includes(row.type) ? roundMoney(row.debit - row.credit) : roundMoney(row.credit - row.debit);
  const revenue = tb.filter((r) => r.type === 'REVENUE').map((r) => ({ ...r, balance: balanceFor(r) }));
  const expenses = tb.filter((r) => r.type === 'EXPENSE').map((r) => ({ ...r, balance: balanceFor(r) }));
  const assets = tb.filter((r) => r.type === 'ASSET').map((r) => ({ ...r, balance: balanceFor(r) }));
  const liabilities = tb.filter((r) => r.type === 'LIABILITY').map((r) => ({ ...r, balance: balanceFor(r) }));
  const equity = tb.filter((r) => r.type === 'EQUITY').map((r) => ({ ...r, balance: balanceFor(r) }));
  const revenueTotal = roundMoney(revenue.reduce((s, r) => s + r.balance, 0));
  const expenseTotal = roundMoney(expenses.reduce((s, r) => s + r.balance, 0));
  const netIncome = roundMoney(revenueTotal - expenseTotal);
  return { revenue, expenses, assets, liabilities, equity, revenueTotal, expenseTotal, netIncome };
}

module.exports = {
  DEFAULT_ACCOUNTS,
  ensureDefaultAccounts,
  assertOpenPeriod,
  postJournal,
  postSalesInvoice,
  reverseSalesInvoice,
  postVendorBill,
  postVendorPayment,
  generalLedger,
  trialBalance,
  financialStatements
};
