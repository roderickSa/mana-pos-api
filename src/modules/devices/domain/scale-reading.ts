export class WeightRead {
  constructor(readonly grams: number) {}
}

// humanMessage se muestra tal cual a la cajera.
export class ScaleDisconnected {
  constructor(readonly humanMessage: string) {}
}

export type ScaleReading = WeightRead | ScaleDisconnected;
