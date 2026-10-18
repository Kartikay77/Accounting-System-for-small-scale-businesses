const express = require('express');
const mongoose = require('mongoose');
const Party = require('../models/party');
const Invoice = require('../models/invoice/invoice');
const InvoiceItem = require('../models/invoice/invoiceItem');
const SerialNumber = require('../models/invoice/serialNumber');
const Item = require('../models/items/item');
const auth = require('../middleware/auth');
const { sameOriginOnly } = require('../middleware/security');
const { calculateLine, calculateInvoice, parseInvoiceDate, gstType, roundMoney } = require('../utils/money');
const { rupeesToWords } = require('../utils/indianNumberWords');
const { postSalesInvoice, reverseSalesInvoice } = require('../services/accounting');

const router = express.Router();
router.use(auth.isAuthorized, auth.requireCompany);

function serialsForRow(body, row) {
  const legacyExpression = new RegExp(`^serial_${row}_`);
  const legacy = Object.entries(body)
    .filter(([key]) => legacyExpression.test(key))
    .map(([, value]) => String(value || '').trim())
    .filter(Boolean);
  const compact = String(body[`serials_${row}`] || '')
    .split(/[\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set([...legacy, ...compact])];
}

async function resolveParty(value, companyId) {
  const raw = String(value || '').trim();
  const query = { companyid: String(companyId), isArchived: { $ne: true } };
  if (mongoose.isValidObjectId(raw)) query._id = raw;
  else query.gstin = raw.toUpperCase();
  return Party.findOne(query);
}

router.get('/new', async (req, res, next) => {
  try {
    const [parties, items] = await Promise.all([
      Party.findByCompanyId(req.session.companyId).lean(),
      Item.findByCompanyId(req.session.companyId).lean()
    ]);
    return res.render('invoice/new', { title: 'New Invoice', parties, items, invoice_page: true });
  } catch (error) { return next(error); }
});

router.post('/new', sameOriginOnly, async (req, res, next) => {
  let invoice = null;
  try {
    const party = await resolveParty(req.body.partyId, req.session.companyId);
    if (!party) return res.status(400).send('Please select a valid party');

    const rows = [...new Set(Object.keys(req.body).map((key) => key.match(/^select_item_(\d+)$/)).filter(Boolean).map((match) => match[1]))];
    const lines = [];
    for (const row of rows) {
      const selected = String(req.body[`select_item_${row}`] || '').trim();
      const prefix = `select_item_${row}_`;
      const itemName = selected.startsWith(prefix) ? selected.slice(prefix.length) : selected;
      const item = await Item.getByName(itemName, req.session.companyId);
      if (!item) throw new Error(`Item not found: ${itemName}`);
      const calculated = calculateLine({ quantity: req.body[`quantity_${row}`], ratePer: req.body[`rate_per_${row}`], taxRate: item.tax });
      if (Number(item.quantityOnHand || 0) < calculated.quantity) throw new Error(`Insufficient stock for ${item.newModelName}`);
      lines.push({ row, item, serials: serialsForRow(req.body, row), ...calculated });
    }
    if (!lines.length) return res.status(400).send('Add at least one invoice line');

    const totals = calculateInvoice(lines);
    invoice = await Invoice.create({
      partyId: party._id.toString(),
      date: parseInvoiceDate(req.body.date),
      number: String(req.body.number || '').trim(),
      totalAmount: totals.totalAmount,
      narration: req.body.narration,
      eWay: req.body.eWay,
      companyId: String(req.session.companyId),
      status: 'ISSUED'
    });

    for (const line of lines) {
      const invoiceItem = await InvoiceItem.create({
        invoiceId: invoice._id.toString(), itemId: line.item._id.toString(), ratePer: line.ratePer,
        quantity: line.quantity, taxRate: line.taxRate, lineSubtotal: line.lineSubtotal,
        taxAmount: line.taxAmount, lineTotal: line.lineTotal
      });
      if (line.serials.length) {
        await SerialNumber.insertMany(line.serials.map((serialNumber) => ({ invoiceItemId: invoiceItem._id.toString(), serialNumber })));
      }
    }

    await postSalesInvoice({ companyId: req.company._id, invoice, lines });
    return res.redirect('/invoice/list');
  } catch (error) {
    if (invoice) {
      const invoiceItems = await InvoiceItem.find({ invoiceId: invoice._id.toString() }).select('_id').lean();
      const ids = invoiceItems.map((entry) => entry._id.toString());
      if (ids.length) await SerialNumber.deleteMany({ invoiceItemId: { $in: ids } });
      await InvoiceItem.deleteMany({ invoiceId: invoice._id.toString() });
      await Invoice.deleteOne({ _id: invoice._id });
    }
    if (error?.code === 11000) return res.status(409).send('Invoice number or serial number already exists');
    if (String(error?.message || '').startsWith('Insufficient stock')) return res.status(409).send(error.message);
    if (String(error?.message || '').includes('is closed')) return res.status(409).send(error.message);
    return next(error);
  }
});

async function buildInvoiceRows(companyId) {
  const invoices = await Invoice.findByCompanyId(companyId).lean();
  const partyIds = [...new Set(invoices.map((entry) => entry.partyId))];
  const parties = await Party.find({ _id: { $in: partyIds }, companyid: String(companyId) }).lean();
  const partyMap = new Map(parties.map((entry) => [String(entry._id), entry]));
  return invoices.map((entry) => {
    const party = partyMap.get(String(entry.partyId)) || {};
    return {
      _id: entry._id,
      number: entry.number,
      date: entry.date ? new Date(entry.date).toISOString().slice(0, 10) : '',
      partyName: party.name || 'Unknown',
      partyCity: party.city || '',
      totalAmount: Number(entry.totalAmount || 0).toFixed(2),
      status: entry.status || 'ISSUED'
    };
  });
}

router.get('/list', async (req, res, next) => {
  try {
    const invoiceRows = await buildInvoiceRows(req.session.companyId);
    return res.render('invoice/list', { title: 'Invoices', ajax_list_page: true, invoiceRows });
  } catch (error) { return next(error); }
});

router.get('/getinvoiceforlist', async (req, res, next) => {
  try { return res.json({ data: await buildInvoiceRows(req.session.companyId) }); }
  catch (error) { return next(error); }
});

router.post('/delete/:id', sameOriginOnly, async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, companyId: String(req.session.companyId), isArchived: { $ne: true } });
    if (!invoice) return res.status(404).send('Invoice not found');
    await reverseSalesInvoice({ companyId: req.company._id, invoice });
    invoice.status = 'VOID';
    invoice.isArchived = true;
    await invoice.save();
    return res.redirect('/invoice/list');
  } catch (error) { return next(error); }
});

router.get('/print/:id', async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, companyId: String(req.session.companyId), isArchived: { $ne: true } });
    if (!invoice) return res.status(404).send('Invoice not found');
    const [party, invoiceItems] = await Promise.all([
      Party.findOne({ _id: invoice.partyId, companyid: String(req.session.companyId) }).lean(),
      InvoiceItem.findByInvoiceId(invoice._id).lean()
    ]);
    if (!party) return res.status(404).send('Invoice party not found');

    const rows = [];
    let subtotal = 0;
    let taxTotal = 0;
    for (const invoiceItem of invoiceItems) {
      const [item, serialDocs] = await Promise.all([
        Item.findOne({ _id: invoiceItem.itemId, companyId: String(req.session.companyId) }).lean(),
        SerialNumber.find({ invoiceItemId: String(invoiceItem._id) }).lean()
      ]);
      if (!item) continue;
      const fallback = calculateLine({ quantity: invoiceItem.quantity, ratePer: invoiceItem.ratePer, taxRate: item.tax });
      const lineSubtotal = invoiceItem.lineSubtotal || fallback.lineSubtotal;
      const taxAmount = invoiceItem.taxAmount || fallback.taxAmount;
      subtotal = roundMoney(subtotal + lineSubtotal);
      taxTotal = roundMoney(taxTotal + taxAmount);
      rows.push({
        name: item.newModelName, hsn: item.hsn, quantity: invoiceItem.quantity,
        ratePer: Number(invoiceItem.ratePer).toFixed(2), taxRate: invoiceItem.taxRate || item.tax,
        subtotal: Number(lineSubtotal).toFixed(2), taxAmount: Number(taxAmount).toFixed(2),
        total: Number(lineSubtotal + taxAmount).toFixed(2),
        serials: serialDocs.map((doc) => doc.serialNumber).join(', ')
      });
    }
    const total = roundMoney(subtotal + taxTotal);
    const taxType = gstType(req.company.gstin, party.gstin);
    return res.render('invoice/print', {
      title: `Invoice ${invoice.number}`, invoice, party, company: req.company, rows,
      displayDate: invoice.date ? new Date(invoice.date).toISOString().slice(0, 10) : '',
      subtotal: subtotal.toFixed(2), taxTotal: taxTotal.toFixed(2), total: total.toFixed(2),
      taxType: taxType.toUpperCase(), totalWords: rupeesToWords(total)
    });
  } catch (error) { return next(error); }
});

router.get('/serialList', (req, res) => res.render('invoice/serial_list_invoice', { title: 'Serial Numbers' }));
router.get('/edit', (req, res) => res.status(501).send('Invoice editing is not supported. Void the invoice and create a replacement.'));

module.exports = router;
