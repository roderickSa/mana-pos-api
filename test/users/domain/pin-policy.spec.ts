import { isWeakPin } from '#modules/users/domain/pin-policy.js';

describe('isWeakPin', () => {
  it('rejects repeated digits', () => {
    expect(isWeakPin('0000')).toBe(true);
    expect(isWeakPin('111111')).toBe(true);
  });

  it('rejects ascending and descending runs, wrap included', () => {
    expect(isWeakPin('1234')).toBe(true);
    expect(isWeakPin('123456')).toBe(true);
    expect(isWeakPin('4321')).toBe(true);
    expect(isWeakPin('654321')).toBe(true);
    expect(isWeakPin('9012')).toBe(true);
    expect(isWeakPin('2109')).toBe(true);
  });

  it('accepts normal pins', () => {
    expect(isWeakPin('2846')).toBe(false);
    expect(isWeakPin('731905')).toBe(false);
    expect(isWeakPin('1357')).toBe(false);
  });
});
