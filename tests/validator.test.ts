import { DateValidator, NumberValidator, StringValidator } from '@lib/validator';

describe('validators', () => {
  it('requires a value', () => {
    expect(new StringValidator('Name', '').required().validate()).toBe('Name is a required field.');
    expect(new StringValidator('Name', 'Ada').required().validate()).toBeNull();
  });

  it('validates string length boundaries', () => {
    expect(new StringValidator('Name', 'ab').betweenLength(3, 4).validate()).toBe(
      'Name must be between 3 and 4 characters.'
    );
    expect(new StringValidator('Name', 'abc').betweenLength(3, 4).validate()).toBeNull();
    expect(new StringValidator('Name', 'abcde').maxLength(4).validate()).toBe(
      'Name must not exceed 4 characters.'
    );
    expect(new StringValidator('Name', 'ab').minLength(3).validate()).toBe(
      'Name must be at least 3 characters.'
    );
  });

  it('validates dates', () => {
    expect(new DateValidator('Date', 'not-a-date').date().validate()).toBe(
      'Date must be valid date!'
    );
    expect(new DateValidator('Date', '2026-01-01').date().validate()).toBeNull();
  });

  it('validates numeric ranges', () => {
    expect(new NumberValidator('Amount', 5).between(6, 10).validate()).toBe(
      'Amount must be between 6 and 10.'
    );
    expect(new NumberValidator('Amount', 7).between(6, 10).validate()).toBeNull();
    expect(new NumberValidator('Amount', 5).min(6).validate()).toBe('Amount must be at least 6.');
    expect(new NumberValidator('Amount', 11).max(10).validate()).toBe('Amount must not exceed 10.');
  });
});
