import { parseScaleLine } from '#modules/devices/infrastructure/serial/parse-scale-line.js';

describe('parseScaleLine', () => {
  it('parses continuous-output frames from common commercial scales', () => {
    expect(parseScaleLine('ST,GS,+  0.645kg')).toBe(645);
    expect(parseScaleLine('US,GS, 1.240 kg')).toBe(1240);
    expect(parseScaleLine('+0.500 kg')).toBe(500);
    expect(parseScaleLine('  645 g')).toBe(645);
    expect(parseScaleLine('ST,NT,     0.000kg')).toBe(0);
  });

  it('returns null for lines without a weight', () => {
    expect(parseScaleLine('')).toBeNull();
    expect(parseScaleLine('ERROR')).toBeNull();
    expect(parseScaleLine('ST,GS,----')).toBeNull();
  });

  it('rejects negative weights', () => {
    expect(parseScaleLine('-0.100 kg')).toBeNull();
  });
});
