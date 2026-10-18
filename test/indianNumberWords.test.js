const { integerToWords, rupeesToWords } = require('../utils/indianNumberWords');

describe('Indian currency words', () => {
  test('formats Indian number groups', () => {
    expect(integerToWords(1250000)).toBe('Twelve Lakh Fifty Thousand');
  });

  test('formats rupees and paise', () => {
    expect(rupeesToWords(1180.5)).toBe('Rupees One Thousand One Hundred Eighty and Paise Fifty only');
  });
});
