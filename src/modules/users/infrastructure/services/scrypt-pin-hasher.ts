import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import type { PinHasher } from '#modules/users/ports/pin-hasher.js';

// scrypt con salt por PIN. Formato almacenado: salt:hash (hex).
export class ScryptPinHasher implements PinHasher {
  hash(pin: string): string {
    const salt = randomBytes(16).toString('hex');
    const derived = scryptSync(pin, salt, 32).toString('hex');
    return `${salt}:${derived}`;
  }

  verify(pin: string, pinHash: string): boolean {
    const [salt, stored] = pinHash.split(':');
    if (salt === undefined || stored === undefined) {
      return false;
    }
    const derived = scryptSync(pin, salt, 32).toString('hex');
    const storedBuffer = Buffer.from(stored, 'hex');
    const derivedBuffer = Buffer.from(derived, 'hex');
    return storedBuffer.length === derivedBuffer.length && timingSafeEqual(storedBuffer, derivedBuffer);
  }
}
