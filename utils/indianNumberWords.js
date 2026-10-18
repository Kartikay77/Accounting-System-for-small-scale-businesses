const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowThousand(number) {
  let n = number;
  const words = [];
  if (n >= 100) {
    words.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    words.push(TENS[Math.floor(n / 10)]);
    n %= 10;
  }
  if (n > 0) words.push(ONES[n]);
  return words.join(' ');
}

function integerToWords(number) {
  let n = Math.floor(Math.abs(Number(number)));
  if (!Number.isFinite(n)) return '';
  if (n === 0) return 'Zero';

  const groups = [
    [10000000, 'Crore'],
    [100000, 'Lakh'],
    [1000, 'Thousand']
  ];
  const words = [];

  for (const [value, label] of groups) {
    if (n >= value) {
      const count = Math.floor(n / value);
      words.push(`${integerToWords(count)} ${label}`);
      n %= value;
    }
  }

  if (n > 0) words.push(belowThousand(n));
  return words.join(' ').replace(/\s+/g, ' ').trim();
}

function rupeesToWords(value) {
  const amount = Math.round(Number(value) * 100) / 100;
  if (!Number.isFinite(amount)) return '';
  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);
  let result = `Rupees ${integerToWords(rupees)}`;
  if (paise) result += ` and Paise ${integerToWords(paise)}`;
  return `${result} only`;
}

module.exports = { integerToWords, rupeesToWords };
