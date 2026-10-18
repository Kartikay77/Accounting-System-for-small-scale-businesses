/* global describe, describe.skip, test, expect, beforeAll, afterAll, jest */
const run = process.env.RUN_INTEGRATION === '1';
const describeIntegration = run ? describe : describe.skip;

jest.setTimeout(30000);

describeIntegration('core application workflow', () => {
  let app, mongoose, User, Company, Party, Item, Invoice, SerialNumber, PayrollEntry;

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

    await mongoose.connectionPromise;
    await mongoose.connection.db.dropDatabase();
  });

  afterAll(async () => {
    if (mongoose?.connection.readyState !== 0) await mongoose.disconnect();
  });

  test('register, company, party, item, invoice, AJAX and salary workflow', async () => {
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

    await agent.post('/item/new').type('form').send({ companyName: 'Test Brand', newModelName: 'TEST-ITEM', hsn: '84713010', itemType: 'Electronics', tax: 18, price: 1000, quantityOnHand: 10 }).expect(302);
    const item = await Item.findOne({ companyId: String(company._id), newModelName: 'TEST-ITEM' });
    expect(item).toBeTruthy();

    await agent.post('/invoice/new').type('form').send({ number: 'INT-001', date: '2026-10-18', partyId: String(party._id), select_item_1: 'TEST-ITEM', quantity_1: 2, rate_per_1: 1000, serials_1: 'SN-001, SN-002', narration: 'Integration test' }).expect(302);
    const invoice = await Invoice.findOne({ companyId: String(company._id), number: 'INT-001' });
    expect(invoice).toBeTruthy();
    expect(invoice.totalAmount).toBe(2360);
    expect(await SerialNumber.countDocuments({})).toBe(2);
    const invoiceAjax = await agent.get('/invoice/getinvoiceforlist').expect(200);
    expect(invoiceAjax.body.data[0].number).toBe('INT-001');
    await agent.get('/invoice/list').expect(200);
    await agent.get(`/invoice/print/${invoice._id}`).expect(200);

    await agent.post('/salary/new').type('form').send({ employeeName: 'Test Employee', monthlySalary: 60000 }).expect(302);
    const payroll = await PayrollEntry.findOne({ companyId: String(company._id), employeeName: 'Test Employee' });
    expect(payroll.monthlySalary).toBe(60000);
    await agent.get('/salary/list').expect(200);
  });
});
