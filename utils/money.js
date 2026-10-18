function roundMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError('Invalid monetary value');
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function calculateLine({ quantity, ratePer, taxRate = 0 }) {
  const qty = Number(quantity);
  const rate = Number(ratePer);
  const tax = Number(taxRate);

  if (!Number.isFinite(qty) || qty <= 0) throw new Error('Quantity must be greater than zero');
  if (!Number.isFinite(rate) || rate < 0) throw new Error('Rate must be zero or greater');
  if (!Number.isFinite(tax) || tax < 0 || tax > 100) throw new Error('Tax rate must be between 0 and 100');

  const lineSubtotal = roundMoney(qty * rate);
  const taxAmount = roundMoney(lineSubtotal * tax / 100);
  const lineTotal = roundMoney(lineSubtotal + taxAmount);

  return { quantity: qty, ratePer: rate, taxRate: tax, lineSubtotal, taxAmount, lineTotal };
}

function calculateInvoice(lines) {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error('Invoice must contain at least one item');

  return lines.reduce((totals, line) => ({
    subtotal: roundMoney(totals.subtotal + line.lineSubtotal),
    taxAmount: roundMoney(totals.taxAmount + line.taxAmount),
    totalAmount: roundMoney(totals.totalAmount + line.lineTotal)
  }), { subtotal: 0, taxAmount: 0, totalAmount: 0 });
}

function parseInvoiceDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  const parsed = match
    ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
    : new Date(raw);
  if (Number.isNaN(parsed.getTime())) throw new Error('Invalid invoice date');
  return parsed;
}

function gstType(companyGstin, partyGstin) {
  const companyState = String(companyGstin || '').slice(0, 2);
  const partyState = String(partyGstin || '').slice(0, 2);
  if (!companyState || !partyState) return 'gst';
  return companyState === partyState ? 'gst' : 'igst';
}

module.exports = { roundMoney, calculateLine, calculateInvoice, parseInvoiceDate, gstType };
