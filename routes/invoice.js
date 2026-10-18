const express = require('express');
const mongoose = require('mongoose');
const Company = require('../models/company');
const Party = require('../models/party');
const Invoice = require('../models/invoice/invoice');
const InvoiceItem = require('../models/invoice/invoiceItem');
const SerialNumber = require('../models/invoice/serialNumber');
const Item = require('../models/items/item');
const auth = require('../middleware/auth');
const { sameOriginOnly } = require('../middleware/security');
const { calculateLine, calculateInvoice, parseInvoiceDate, gstType, roundMoney } = require('../utils/money');
const { rupeesToWords } = require('../utils/indianNumberWords');

const router = express.Router();
router.use(auth.isAuthorized, auth.requireCompany);

function formatAddress(value) {
  const input = String(value || '').toUpperCase();
  let width = 0;
  let commaCount = 0;
  let output = '';
  for (const char of input) {
    output += char;
    width += 1;
    if (char === ',') {
      commaCount += 1;
      if (commaCount >= 2 || width >= 25) {
        output += '<br>';
        width = 0;
        commaCount = 0;
      }
    }
  }
  return output;
}

function serialsForRow(body, row) {
  const expression = new RegExp(`^myModal${row}_serial_no_`);
  return Object.entries(body)
    .filter(([key]) => expression.test(key))
    .map(([, value]) => String(value || '').trim())
    .filter(Boolean);
}

async function resolveParty(value, companyId) {
  const raw = String(value || '').trim();
  const query = { companyid: String(companyId), isArchived: { $ne: true } };
  if (mongoose.isValidObjectId(raw)) query._id = raw;
  else query.gstin = raw.toUpperCase();
  return Party.findOne(query);
}

router.get('/edit', (req, res) => {
  res.status(501).render('invoice/edit_invoice', { title: 'Edit Invoice', userName: req.session.username, companyName: req.session.companyName });
});

router.get('/new', async (req, res, next) => {
  try {
    const [parties, items] = await Promise.all([
      Party.findByCompanyId(req.session.companyId),
      Item.findByCompanyId(req.session.companyId)
    ]);
    return res.render('invoice/new', {
      title: 'New Invoice', userName: req.session.username, gstin: req.company.gstin,
      companyName: req.session.companyName, parties, items, invoice_page: true
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/new', sameOriginOnly, async (req, res, next) => {
  let invoice = null;
  try {
    const party = await resolveParty(req.body.partyId, req.session.companyId);
    if (!party) return res.status(400).send('Please select a valid party');

    const rows = Object.keys(req.body)
      .map((key) => key.match(/^select_item_(\d+)$/))
      .filter(Boolean)
      .map((match) => match[1]);

    const lines = [];
    for (const row of rows) {
      const selected = String(req.body[`select_item_${row}`] || '');
      const prefix = `select_item_${row}_`;
      const itemName = selected.startsWith(prefix) ? selected.slice(prefix.length) : selected;
      const item = await Item.getByName(itemName, req.session.companyId);
      if (!item) throw new Error(`Item not found: ${itemName}`);

      const calculated = calculateLine({
        quantity: req.body[`quantity_${row}`],
        ratePer: req.body[`rate_per_${row}`],
        taxRate: item.tax
      });
      lines.push({ row, item, serials: serialsForRow(req.body, row), ...calculated });
    }

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
        invoiceId: invoice._id.toString(),
        itemId: line.item._id.toString(),
        ratePer: line.ratePer,
        quantity: line.quantity,
        taxRate: line.taxRate,
        lineSubtotal: line.lineSubtotal,
        taxAmount: line.taxAmount,
        lineTotal: line.lineTotal
      });
      if (line.serials.length) {
        await SerialNumber.insertMany(line.serials.map((serialNumber) => ({
          invoiceItemId: invoiceItem._id.toString(), serialNumber
        })));
      }
    }

    return res.redirect('/invoice/list');
  } catch (error) {
    if (invoice) {
      const invoiceItems = await InvoiceItem.find({ invoiceId: invoice._id.toString() }).select('_id').lean();
      const ids = invoiceItems.map((item) => item._id.toString());
      if (ids.length) await SerialNumber.deleteMany({ invoiceItemId: { $in: ids } });
      await InvoiceItem.deleteMany({ invoiceId: invoice._id.toString() });
      await Invoice.deleteOne({ _id: invoice._id });
    }
    if (error && error.code === 11000) return res.status(409).send('Invoice number already exists for this company');
    return next(error);
  }
});

router.get('/serialList', (req, res) => {
  res.render('invoice/serial_list_invoice', { title: 'Serial List Invoice', userName: req.session.username, companyName: req.session.companyName });
});

router.get('/list', (req, res) => {
  res.render('invoice/list', { title: 'List Invoice', userName: req.session.username, companyName: req.session.companyName, invoice_list: true });
});

router.get('/getinvoiceforlist', async (req, res, next) => {
  try {
    const invoices = await Invoice.findByCompanyId(req.session.companyId);
    const partyIds = [...new Set(invoices.map((invoice) => invoice.partyId))];
    const parties = await Party.find({ _id: { $in: partyIds }, companyid: String(req.session.companyId) }).lean();
    const partyMap = new Map(parties.map((party) => [String(party._id), party]));

    const data = invoices.map((invoice) => {
      const party = partyMap.get(String(invoice.partyId)) || {};
      return {
        number: invoice.number,
        date: invoice.date,
        partyAcName: party.name || 'Unknown',
        partyCity: party.city || '',
        totalAmount: invoice.totalAmount,
        partyContactPersonName: party.contactPersonName || '',
        partyContact: party.mobileNumber || '',
        actions: `<td><div class="dropdown-content"><a href="/invoice/print/${invoice._id}" class="dropdown-item">Print</a><form method="POST" action="/invoice/delete/${invoice._id}" style="display:inline"><button type="submit" class="dropdown-item">Void</button></form></div></td>`
      };
    });
    return res.send({ data });
  } catch (error) {
    return next(error);
  }
});

router.post('/delete/:id', sameOriginOnly, async (req, res, next) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, companyId: String(req.session.companyId), isArchived: { $ne: true } },
      { status: 'VOID', isArchived: true },
      { new: true }
    );
    if (!invoice) return res.status(404).send('Invoice not found');
    return res.redirect('/invoice/list');
  } catch (error) {
    return next(error);
  }
});

router.get('/print/:id', async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, companyId: String(req.session.companyId), isArchived: { $ne: true } });
    if (!invoice) return res.status(404).send('Invoice not found');

    const [party, invoiceItems] = await Promise.all([
      Party.findOne({ _id: invoice.partyId, companyid: String(req.session.companyId) }),
      InvoiceItem.findByInvoiceId(invoice._id)
    ]);
    if (!party) return res.status(404).send('Invoice party not found');

    const company = { ...req.company };
    company.address = formatAddress(company.address);
    for (const field of ['city','gstin','bankName','accountNumber','branch','ifsc']) company[field] = String(company[field] || '').toUpperCase();

    const partyView = party.toObject();
    partyView.address = formatAddress(partyView.address);
    for (const field of ['name','city','gstin','state']) partyView[field] = String(partyView[field] || '').toUpperCase();
    partyView.partyGstinStateCode = partyView.gstin.slice(0, 2);

    const taxType = gstType(company.gstin, partyView.gstin);
    const invoicePackage = {
      invoice,
      company,
      companyNameUpper: String(company.name || '').toUpperCase(),
      companyPan: String(company.gstin || '').slice(2),
      companyGstinStateCode: String(company.gstin || '').slice(0, 2),
      party: partyView,
      invoiceItems: [],
      taxType,
      taxTypeGst: taxType === 'gst'
    };

    const hsnList = {};
    let totalQuantity = 0;
    let taxableTotal = 0;
    let totalTax = 0;

    for (let index = 0; index < invoiceItems.length; index += 1) {
      const invoiceItem = invoiceItems[index];
      const [item, serialNos] = await Promise.all([
        Item.findOne({ _id: invoiceItem.itemId, companyId: String(req.session.companyId) }),
        SerialNumber.findByInvoiceItemId(invoiceItem._id)
      ]);
      if (!item) continue;

      const itemView = item.toObject();
      itemView.newModelName = String(itemView.newModelName || '').toUpperCase();
      itemView.hsn = String(itemView.hsn || '').toUpperCase();
      itemView.itemType = String(itemView.itemType || '').toUpperCase();
      const fallback = calculateLine({ quantity: invoiceItem.quantity, ratePer: invoiceItem.ratePer, taxRate: item.tax });
      const amount = invoiceItem.lineSubtotal || fallback.lineSubtotal;
      const lineTax = invoiceItem.taxAmount || fallback.taxAmount;
      const taxComponent = taxType === 'gst' ? roundMoney(lineTax / 2) : lineTax;

      totalQuantity += invoiceItem.quantity;
      taxableTotal = roundMoney(taxableTotal + amount);
      totalTax = roundMoney(totalTax + lineTax);

      if (!hsnList[itemView.hsn]) hsnList[itemView.hsn] = [0, invoiceItem.ratePer, 0, 0, invoiceItem.taxRate || item.tax];
      hsnList[itemView.hsn][0] = roundMoney(hsnList[itemView.hsn][0] + amount);
      hsnList[itemView.hsn][2] = roundMoney(hsnList[itemView.hsn][2] + taxComponent);
      hsnList[itemView.hsn][3] = roundMoney(hsnList[itemView.hsn][3] + lineTax);

      invoicePackage.invoiceItems.push({
        invoiceItem,
        item: itemView,
        serialNos: serialNos.map((serial) => ({ ...serial.toObject(), serialNumber: String(serial.serialNumber || '').toUpperCase() })),
        amount,
        sr_no: index + 1,
        sr_noequaltotalitems: index + 1 === invoiceItems.length
      });
    }

    const total = roundMoney(taxableTotal + totalTax);
    invoicePackage.totalTaxAmount = totalTax;
    invoicePackage.totalTaxAmount2 = taxType === 'gst' ? roundMoney(totalTax / 2) : totalTax;
    invoicePackage.hsnTaxableTotal = taxableTotal;
    invoicePackage.tax = taxType === 'gst' ? roundMoney(totalTax / 2) : totalTax;
    invoicePackage.totalItems = invoicePackage.invoiceItems.length;
    invoicePackage.totalItems13 = Math.max(0, 13 - invoicePackage.invoiceItems.length);
    invoicePackage.totalItems14 = Math.max(0, 14 - invoicePackage.invoiceItems.length);
    invoicePackage.roundOff = roundMoney(Math.abs(Math.round(total) - total));
    invoicePackage.total = total;
    invoicePackage.iftotalg50k = total >= 50000;
    invoicePackage.totalWords = rupeesToWords(total);
    invoicePackage.taxWords = rupeesToWords(totalTax);
    invoicePackage.hsnList = hsnList;
    invoicePackage.totalQuantity = totalQuantity;

    return res.render('invoice/print', { title: 'Print Invoice', userName: req.session.username, companyName: req.session.companyName, invoicePackage });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
