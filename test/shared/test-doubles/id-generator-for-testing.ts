import type { IdGenerator } from '#shared/ports/id-generator.js';

export class IdGeneratorForTesting implements IdGenerator {
  private counter = 0;

  generate(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}
