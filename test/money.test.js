const { calculateLine, calculateInvoice, parseInvoiceDate, gstType } = require('../utils/money');

 describe('money utilities', () => {
  test('calculates line subtotal and GST server-side', () => {
    expect(calculateLine({ quantity: 2, ratePer: 500, taxRate: 18 })).toEqual({
      quantity: 2, ratePer: 500, taxRate: 18, lineSubtotal: 1000, taxAmount: 180, lineTotal: 1180
    });
  });

  test('totals multiple lines', () => {
    const lines = [
      calculateLine({ quantity: 2, ratePer: 500, taxRate: 18 }),
      calculateLine({ quantity: 1, ratePer: 100, taxRate: 5 })
    ];
    expect(calculateInvoice(lines)).toEqual({ subtotal: 1100, taxAmount: 185, totalAmount: 1285 });
  });

  test('rejects invalid quantities', () => {
    expect(() => calculateLine({ quantity: 0, ratePer: 10, taxRate: 18 })).toThrow('Quantity');
  });

  test('parses Indian-style invoice dates', () => {
    const date = parseInvoiceDate('17-10-2026');
    expect(date.getUTCFullYear()).toBe(2026);
    expect(date.getUTCMonth()).toBe(9);
    expect(date.getUTCDate()).toBe(17);
  });

  test('selects intra-state GST versus inter-state IGST', () => {
    expect(gstType('27ABCDE1234F1Z5', '27ABCDE9999F1Z5')).toBe('gst');
    expect(gstType('27ABCDE1234F1Z5', '29ABCDE9999F1Z5')).toBe('igst');
  });
});
