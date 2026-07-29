export interface PinHasher {
  hash(pin: string): string;
  verify(pin: string, pinHash: string): boolean;
}
