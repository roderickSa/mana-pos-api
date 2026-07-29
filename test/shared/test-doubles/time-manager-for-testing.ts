import type { TimeManager } from '#shared/ports/time-manager.js';

export class TimeManagerForTesting implements TimeManager {
  constructor(private fixedNow: Date = new Date('2026-07-29T10:00:00.000Z')) {}

  now(): Date {
    return this.fixedNow;
  }

  travelTo(date: Date): void {
    this.fixedNow = date;
  }
}
