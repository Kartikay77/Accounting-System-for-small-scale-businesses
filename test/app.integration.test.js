/* global describe, test, expect, beforeAll, afterAll, jest */
const run = process.env.RUN_INTEGRATION === '1';
const describeIntegration = run ? describe : describe.skip;

jest.setTimeout(30000);

describeIntegration('core application and accounting workflow', () => {
  let app, mongoose, User, Company, Party, Item, Invoice, SerialNumber, PayrollEntry;
  let JournalEntry, InventoryTransaction, VendorBill, BankTransaction, AccountingPeriod;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.SESSION_SECRET = 'integration-test-secret';
    process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/accounting_system_test';

    app = require('../app');
    mongoose = require('../config/mongoose');
    User = require('../models/user');
    Company = require('../models/company');
    Party = require('../models/party');
    Item = require('../models/items/item');
    Invoice = require('../models/invoice/invoice');
    SerialNumber = require('../models/invoice/serialNumber');
    PayrollEntry = require('../models/payrollEntry');
    JournalEntry = require('../models/journalEntry');
    InventoryTransaction = require('../models/inventoryTransaction');
    VendorBill = require('../models/vendorBill');
    BankTransaction = require('../models/bankTransaction');
    AccountingPeriod = require('../models/accountingPeriod');

    await mongoose.connectionPromise;
    await mongoose.connection.db.dropDatabase();
  });

  afterAll(async () => {
    if (mongoose?.connection.readyState !== 0) await mongoose.disconnect();
  });

  test('register through financial close with balanced automatic posting', async () => {
    const request = require('supertest');
    const agent = request.agent(app);

    await agent.post('/user/register').type('form').send({ username: 'Integration User', email: 'integration@example.com', password: 'StrongPass123!' }).expect(302);
    const user = await User.findOne({ email: 'integration@example.com' });
    expect(user).toBeTruthy();

    await agent.post('/company/new').type('form').send({ name: 'Integration Co', gstin: '27ABCDE1234F1Z5', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' }).expect(302);
    const company = await Company.findOne({ userid: String(user._id) });
    expect(company).toBeTruthy();
    const companyAjax = await agent.get('/company/getcompanyforlist').expect(200);
    expect(companyAjax.body.data).toHaveLength(1);

    await agent.post('/party/new').type('form').send({ name: 'Integration Customer', gstin: '27AAACA1111A1Z1', city: 'Mumbai', state: 'Maharashtra' }).expect(302);
    const party = await Party.findOne({ companyid: String(company._id) });
    expect(party).toBeTruthy();

    await agent.post('/item/new').type('form').send({ companyName: 'Test Brand', newModelName: 'TEST-ITEM', hsn: '84713010', itemType: 'Electronics', tax: 18, price: 1000, unitCost: 600, quantityOnHand: 10 }).expect(302);
    let item = await Item.findOne({ companyId: String(company._id), newModelName: 'TEST-ITEM' });
    expect(item).toBeTruthy();
    expect(await InventoryTransaction.countDocuments({ type: 'OPENING_BALANCE' })).toBe(1);
    expect(await JournalEntry.countDocuments({ referenceType: 'ITEM_OPENING' })).toBe(1);

    await agent.post('/invoice/new').type('form').send({ number: 'INT-001', date: '2026-10-18', partyId: String(party._id), select_item_1: 'TEST-ITEM', quantity_1: 2, rate_per_1: 1000, serials_1: 'SN-001, SN-002', narration: 'Integration test' }).expect(302);
    const invoice = await Invoice.findOne({ companyId: String(company._id), number: 'INT-001' });
    expect(invoice).toBeTruthy();
    expect(invoice.totalAmount).toBe(2360);
    expect(await SerialNumber.countDocuments({})).toBe(2);
    item = await Item.findById(item._id);
    expect(item.quantityOnHand).toBe(8);
    expect(await JournalEntry.countDocuments({ referenceType: 'SALES_INVOICE', referenceId: String(invoice._id) })).toBe(1);
    expect(await JournalEntry.countDocuments({ referenceType: 'COGS', referenceId: String(invoice._id) })).toBe(1);
    expect(await InventoryTransaction.countDocuments({ type: 'SALE', referenceId: String(invoice._id) })).toBe(1);

    const invoiceAjax = await agent.get('/invoice/getinvoiceforlist').expect(200);
    expect(invoiceAjax.body.data[0].number).toBe('INT-001');
    await agent.get('/invoice/list').expect(200);
    await agent.get(`/invoice/print/${invoice._id}`).expect(200);

    await agent.post(`/accounting/ar/${invoice._id}/receive`).type('form').send({ date: '2026-10-18', amount: 2360, mode: 'BANK_TRANSFER', reference: 'BANK-RECEIPT-1' }).expect(302);
    const paidInvoice = await Invoice.findById(invoice._id);
    expect(paidInvoice.status).toBe('PAID');
    expect(paidInvoice.amountPaid).toBe(2360);
    const receiptJournal = await JournalEntry.findOne({ referenceType: 'CUSTOMER_RECEIPT' });
    expect(receiptJournal).toBeTruthy();

    await agent.post('/accounting/ap/new').type('form').send({ partyId: String(party._id), billType: 'EXPENSE', number: 'VB-001', date: '2026-10-18', dueDate: '2026-11-18', subtotal: 500, taxAmount: 90, description: 'Office expense' }).expect(302);
    const bill = await VendorBill.findOne({ number: 'VB-001' });
    expect(bill.totalAmount).toBe(590);
    expect(await JournalEntry.countDocuments({ referenceType: 'VENDOR_BILL', referenceId: String(bill._id) })).toBe(1);

    await agent.post(`/accounting/ap/${bill._id}/pay`).type('form').send({ amount: 590, mode: 'BANK_TRANSFER', reference: 'BANK-PAY-1' }).expect(302);
    const paidBill = await VendorBill.findById(bill._id);
    expect(paidBill.status).toBe('PAID');

    await agent.post('/accounting/inventory/adjust').type('form').send({ itemId: String(item._id), date: '2026-10-18', quantityDelta: -1, notes: 'Damaged unit' }).expect(302);
    item = await Item.findById(item._id);
    expect(item.quantityOnHand).toBe(7);
    expect(await JournalEntry.countDocuments({ referenceType: 'INVENTORY_ADJUSTMENT' })).toBe(1);

    await agent.post('/accounting/journals/new').type('form').send({ date: '2026-10-18', description: 'Owner bank contribution', debitAccountId: receiptJournal.lines[0].accountId, creditAccountId: (await JournalEntry.findOne({ referenceType: 'ITEM_OPENING' })).lines[1].accountId, amount: 100 }).expect(302);
    expect(await JournalEntry.countDocuments({ referenceType: 'MANUAL' })).toBe(1);

    await agent.post('/accounting/bank-reconciliation/new').type('form').send({ date: '2026-10-18', description: 'Customer deposit', reference: 'STMT-1', amount: 2360 }).expect(302);
    const bankTx = await BankTransaction.findOne({ reference: 'STMT-1' });
    await agent.post(`/accounting/bank-reconciliation/${bankTx._id}/match`).type('form').send({ journalEntryId: String(receiptJournal._id) }).expect(302);
    expect((await BankTransaction.findById(bankTx._id)).status).toBe('MATCHED');

    await agent.get('/accounting').expect(200);
    await agent.get('/accounting/journals').expect(200);
    await agent.get('/accounting/ledger').expect(200);
    await agent.get('/accounting/trial-balance').expect(200);
    await agent.get('/accounting/profit-loss').expect(200);
    await agent.get('/accounting/balance-sheet').expect(200);
    await agent.get('/accounting/ar').expect(200);
    await agent.get('/accounting/ap').expect(200);
    await agent.get('/accounting/inventory').expect(200);
    await agent.get('/accounting/bank-reconciliation').expect(200);

    const posted = await JournalEntry.find({ status: 'POSTED' }).lean();
    for (const entry of posted) {
      const debit = entry.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
      const credit = entry.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
      expect(debit).toBeCloseTo(credit, 2);
    }

    await agent.post('/salary/new').type('form').send({ employeeName: 'Test Employee', monthlySalary: 60000 }).expect(302);
    let payroll = await PayrollEntry.findOne({ companyId: String(company._id), employeeName: 'Test Employee' });
    expect(payroll.monthlySalary).toBe(60000);
    const salaryApi = await agent.get('/salary/api').expect(200);
    expect(salaryApi.body.totals.yearly).toBe(720000);
    await agent.put(`/salary/api/${payroll._id}`).send({ employeeName: 'Test Employee', monthlySalary: 65000 }).expect(200);
    await agent.delete(`/salary/api/${payroll._id}`).expect(200);
    payroll = await PayrollEntry.findById(payroll._id);
    expect(payroll.isArchived).toBe(true);

    await agent.post('/accounting/periods/close').type('form').send({ name: 'Integration Day', startDate: '2026-10-18', endDate: '2026-10-18' }).expect(302);
    expect(await AccountingPeriod.countDocuments({ status: 'CLOSED' })).toBe(1);
    expect(await JournalEntry.countDocuments({ referenceType: 'PERIOD_CLOSE' })).toBe(1);

    await agent.post('/accounting/journals/new').type('form').send({ date: '2026-10-18', description: 'Should be blocked', debitAccountId: receiptJournal.lines[0].accountId, creditAccountId: (await JournalEntry.findOne({ referenceType: 'ITEM_OPENING' })).lines[1].accountId, amount: 1 }).expect(409);
  });
});
