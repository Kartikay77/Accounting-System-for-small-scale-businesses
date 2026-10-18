require('dotenv').config();
const mongoose = require('mongoose');
require('../config/mongoose');
const User = require('../models/user');
const Company = require('../models/company');
const Party = require('../models/party');
const Item = require('../models/items/item');
const Invoice = require('../models/invoice/invoice');
const InvoiceItem = require('../models/invoice/invoiceItem');

async function seed() {
  await mongoose.connection.asPromise();
  let user = await User.findOne({ email: 'demo@easyaccounting.local' });
  if (!user) user = await User.create({ username: 'Demo User', email: 'demo@easyaccounting.local', password: 'DemoPass123!' });
  let company = await Company.findOne({ userid: String(user._id), name: 'Demo Trading Co.', isArchived: { $ne: true } });
  if (!company) company = await Company.create({ name: 'Demo Trading Co.', email: 'accounts@demo.local', gstin: '27ABCDE1234F1Z5', address: '100 Market Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', country: 'India', bankName: 'Demo Bank', branch: 'Fort', ifsc: 'DEMO0001234', accountNumber: '1234567890', userid: String(user._id) });
  let party = await Party.findOne({ companyid: String(company._id), name: 'Acme Retail Pvt Ltd', isArchived: { $ne: true } });
  if (!party) party = await Party.create({ name: 'Acme Retail Pvt Ltd', gstin: '27AAACA1111A1Z1', address: '12 Commerce Street', city: 'Mumbai', state: 'Maharashtra', pincode: '400002', country: 'India', contactPersonName: 'Aarav Sharma', email: 'buyer@acme.local', mobileNumber: '9999999999', companyid: String(company._id) });
  let item = await Item.findOne({ companyId: String(company._id), newModelName: 'DEMO-LAPTOP-14', isArchived: { $ne: true } });
  if (!item) item = await Item.create({ companyName: 'Demo Electronics', newModelName: 'DEMO-LAPTOP-14', hsn: '84713010', itemType: 'Electronics', tax: 18, price: 50000, quantityOnHand: 25, reorderLevel: 5, companyId: String(company._id) });
  let invoice = await Invoice.findOne({ companyId: String(company._id), number: 'DEMO-001' });
  if (!invoice) {
    invoice = await Invoice.create({ partyId: String(party._id), date: new Date(), number: 'DEMO-001', totalAmount: 59000, narration: 'Seeded demonstration invoice', companyId: String(company._id), status: 'ISSUED' });
    await InvoiceItem.create({ itemId: String(item._id), ratePer: 50000, invoiceId: String(invoice._id), quantity: 1, taxRate: 18, lineSubtotal: 50000, taxAmount: 9000, lineTotal: 59000 });
  }
  console.log('Demo data ready: demo@easyaccounting.local / DemoPass123!');
}
seed().then(()=>mongoose.disconnect()).catch(async(error)=>{console.error(error);await mongoose.disconnect();process.exitCode=1;});
