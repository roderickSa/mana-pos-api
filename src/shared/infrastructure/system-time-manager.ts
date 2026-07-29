import type { TimeManager } from '#shared/ports/time-manager.js';

export class SystemTimeManager implements TimeManager {
  now(): Date {
    return new Date();
  }
}
