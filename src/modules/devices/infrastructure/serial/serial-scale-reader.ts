import { ReadlineParser, SerialPort } from 'serialport';
import type { FastifyBaseLogger } from 'fastify';

import type { Nullable } from '#shared/domain/nullable.js';
import { ScaleDisconnected, WeightRead, type ScaleReading } from '#modules/devices/domain/scale-reading.js';
import type { ScaleReader } from '#modules/devices/ports/scale-reader.js';
import { parseScaleLine } from '#modules/devices/infrastructure/serial/parse-scale-line.js';

const STALE_AFTER_MS = 3000;
const RECONNECT_EVERY_MS = 5000;

// Lee el protocolo de salida continua por RS-232/USB. Si la balanza se
// desconecta, reintenta solo y mientras tanto reporta el estado en humano.
export class SerialScaleReader implements ScaleReader {
  private lastGrams: Nullable<number> = null;
  private lastReadAt = 0;
  private connected = false;
  private port: Nullable<SerialPort> = null;

  constructor(
    private readonly serialPath: string,
    private readonly baudRate: number,
    private readonly logger: FastifyBaseLogger,
  ) {
    this.connect();
  }

  currentReading(): ScaleReading {
    if (!this.connected) {
      return new ScaleDisconnected(
        'La balanza no está conectada. Revisa el cable y usa el peso manual mientras tanto.',
      );
    }
    if (this.lastGrams === null || Date.now() - this.lastReadAt > STALE_AFTER_MS) {
      return new ScaleDisconnected(
        'La balanza está conectada pero no envía peso. Coloca el producto o revisa el equipo.',
      );
    }
    return new WeightRead(this.lastGrams);
  }

  private connect(): void {
    const port = new SerialPort(
      { path: this.serialPath, baudRate: this.baudRate, autoOpen: true },
      (error) => {
        if (error !== null) {
          this.connected = false;
          this.logger.warn({
            event: 'scale_connect_failed',
            msg: `No se pudo abrir la balanza en ${this.serialPath}`,
            data: { error: error.message },
          });
          setTimeout(() => this.connect(), RECONNECT_EVERY_MS);
        }
      },
    );
    this.port = port;

    port.on('open', () => {
      this.connected = true;
      this.logger.info({ event: 'scale_connected', msg: `Balanza conectada en ${this.serialPath}` });
    });

    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
    parser.on('data', (line: string) => {
      const grams = parseScaleLine(line);
      if (grams !== null) {
        this.lastGrams = grams;
        this.lastReadAt = Date.now();
      }
    });

    port.on('close', () => {
      this.connected = false;
      this.logger.warn({ event: 'scale_disconnected', msg: 'La balanza se desconectó' });
      setTimeout(() => this.connect(), RECONNECT_EVERY_MS);
    });
    port.on('error', (error) => {
      this.logger.warn({ event: 'scale_error', msg: error.message });
    });
  }
}

export class SimulatedScaleReader implements ScaleReader {
  currentReading(): ScaleReading {
    return new ScaleDisconnected('Balanza en modo simulado: ingresa el peso manualmente.');
  }
}
