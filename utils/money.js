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

function utcDate(year, month, day) {
  const value = new Date(Date.UTC(year, month - 1, day));
  if (
    value.getUTCFullYear() !== year ||
    value.getUTCMonth() !== month - 1 ||
    value.getUTCDate() !== day
  ) {
    throw new Error('Invalid invoice date');
  }
  return value;
}

function parseInvoiceDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return utcDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }

  const raw = String(value || '').trim();
  let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return utcDate(Number(match[1]), Number(match[2]), Number(match[3]));

  match = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) return utcDate(Number(match[3]), Number(match[2]), Number(match[1]));

  throw new Error('Invalid invoice date');
}

function gstType(companyGstin, partyGstin) {
  const companyState = String(companyGstin || '').trim().slice(0, 2);
  const partyState = String(partyGstin || '').trim().slice(0, 2);
  if (!/^\d{2}$/.test(companyState) || !/^\d{2}$/.test(partyState)) return 'unknown';
  return companyState === partyState ? 'gst' : 'igst';
}

module.exports = { roundMoney, calculateLine, calculateInvoice, parseInvoiceDate, gstType };
