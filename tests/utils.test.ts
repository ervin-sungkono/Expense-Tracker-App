import {
  canEditCategory,
  dateToInputValue,
  dateToLocalInput,
  detectMimeType,
  extractText,
  formatDate,
  formatDateString,
  formatCurrency,
  generateAsterisks,
  generateRandomDistinctColors,
  generateRangeOptions,
  getDateRange,
  getBase64,
  getDayDifference,
  getDebtLoanType,
  getMonthlyLabels,
  getOwnerLabel,
  getSignedTransactionAmount,
  getWeekNumber,
  getWeekRanges,
  getWeeklyLabels,
  isInAmountRange,
  isInDateRange,
  nFormatter,
  shouldOpenMenuUpward,
} from '@lib/utils';

describe('utility helpers', () => {
  it('extracts bracket tags while preserving surrounding text', () => {
    expect(extractText('Pay [Food] at [Shop]')).toEqual([
      { type: 'text', value: 'Pay ' },
      { type: 'tag', value: 'Food' },
      { type: 'text', value: ' at ' },
      { type: 'tag', value: 'Shop' },
    ]);
    expect(extractText('plain text')).toEqual([{ type: 'text', value: 'plain text' }]);
  });

  it('generates deterministic utility values', () => {
    expect(generateRandomDistinctColors(2)).toEqual([
      'hsl(137.508,70%,75%)',
      'hsl(275.016,70%,75%)',
    ]);
    expect(generateRangeOptions(2, 4)).toEqual([2, 3, 4]);
    expect(generateAsterisks(3)).toBe('***');
    expect(nFormatter(1234000, 1)).toBe('1.2M');
    expect(nFormatter(0, 1)).toBe('0');
  });

  it('formats values and dates', () => {
    const date = new Date(2026, 0, 2, 3, 4);
    expect(formatCurrency(1200)).toContain('1.200');
    expect(formatDateString(date, 'en-US')).toBe('January 2, 2026');
    expect(formatDate(date, 'DD MMM YYYY')).toBe('02 Jan 2026');
    expect(dateToLocalInput(date)).toBe('2026-01-02T03:04');
    expect(dateToInputValue(date)).toBe('2026-01-02');
  });

  it('creates date labels and ranges', () => {
    expect(getMonthlyLabels(2024, 1)).toHaveLength(29);
    expect(getWeeklyLabels()).toEqual([]);
    expect(
      getWeeklyLabels({ start: new Date(2026, 0, 1), end: new Date(2026, 0, 2) })
    ).toHaveLength(2);
    expect(getDayDifference(new Date(2026, 0, 1), new Date(2026, 0, 3))).toBe(3);
    expect(getWeekRanges(2026).length).toBeGreaterThan(50);
    expect(getWeekNumber(new Date(2025, 11, 28), 2026)).toBe(0);
    expect(getWeekNumber(new Date(2026, 0, 1), 2026)).toBe(1);

    const [weeklyStart, weeklyEnd] = getDateRange('weekly', new Date(2026, 0, 7));
    expect(dateToInputValue(weeklyStart)).toBe('2026-01-05');
    expect(dateToInputValue(weeklyEnd)).toBe('2026-01-11');
    expect(getDateRange('daily', new Date(2026, 5, 4))).toHaveLength(2);
    expect(getDateRange('monthly', new Date(2026, 5, 4))).toHaveLength(2);
    expect(getDateRange('quarter', new Date(2026, 5, 4))).toHaveLength(2);
    expect(getDateRange('annual', new Date(2026, 5, 4))).toHaveLength(2);
    expect(getDateRange('unknown')).toEqual([undefined, undefined]);
  });

  it('recognizes categories and filter ranges', () => {
    expect(getDebtLoanType('Loan')).toBe('Expense');
    expect(getDebtLoanType('Debt')).toBe('Income');
    expect(getDebtLoanType('Food')).toBeNull();
    expect(getOwnerLabel('Loan')).toBe('Borrower');
    expect(getOwnerLabel('Repayment')).toBe('Lender');
    expect(getOwnerLabel('Food')).toBe('');
    expect(isInAmountRange(10, [5, 15])).toBe(true);
    expect(isInAmountRange(4, [5, null])).toBe(false);
    expect(isInAmountRange(16, [null, 15])).toBe(false);
    expect(isInDateRange(new Date(2026, 0, 5), [new Date(2026, 0, 1), new Date(2026, 0, 8)])).toBe(
      true
    );
    expect(isInDateRange(new Date(2026, 0, 9), [null, new Date(2026, 0, 8)])).toBe(false);
  });

  it('treats expenses as negative transaction totals', () => {
    expect(getSignedTransactionAmount(11000, 'Expense')).toBe(-11000);
    expect(getSignedTransactionAmount(11000, 'Income')).toBe(11000);
  });

  it('keeps explicit system categories read-only and flips menus when space below is insufficient', () => {
    expect(canEditCategory({}, true)).toBe(true);
    expect(canEditCategory({ mutable: false }, true)).toBe(false);
    expect(canEditCategory({}, false)).toBe(false);
    expect(shouldOpenMenuUpward(120, 600, 656, 700)).toBe(true);
    expect(shouldOpenMenuUpward(120, 100, 156, 700)).toBe(false);
  });

  it('detects supported image formats', () => {
    expect(detectMimeType('iVBORw0KGgoabcdef')).toBe('image/png');
    expect(detectMimeType('R0lGODdhabcdef')).toBe('image/gif');
    expect(detectMimeType('unknown')).toBeUndefined();
  });

  it('converts a browser file to base64 data', async () => {
    class FileReaderMock {
      readAsDataURL() {
        this.result = 'data:image/png;base64,abc';
        queueMicrotask(() => this.onload());
      }
    }
    vi.stubGlobal('FileReader', FileReaderMock);
    await expect(getBase64({})).resolves.toBe('data:image/png;base64,abc');
  });
});
