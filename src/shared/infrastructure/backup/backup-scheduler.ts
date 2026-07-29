import Database from 'better-sqlite3';
import { mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { FastifyBaseLogger } from 'fastify';

const KEEP_BACKUPS = 14;
const CHECK_EVERY_MS = 60 * 60 * 1000; // cada hora revisa si falta el backup del día

// Copia diaria del .sqlite a la carpeta de backups (y borra los antiguos).
// Usa su propia conexión de solo lectura: no toca la conexión principal.
export class BackupScheduler {
  constructor(
    private readonly databasePath: string,
    private readonly backupsDir: string,
    private readonly logger: FastifyBaseLogger,
  ) {}

  start(): void {
    void this.backupIfMissing();
    setInterval(() => void this.backupIfMissing(), CHECK_EVERY_MS).unref();
  }

  private todayFileName(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `mana-${now.getFullYear()}-${month}-${day}.sqlite`;
  }

  async backupIfMissing(): Promise<void> {
    try {
      await mkdir(this.backupsDir, { recursive: true });
      const target = path.join(this.backupsDir, this.todayFileName());
      if (existsSync(target)) {
        return;
      }
      const source = new Database(this.databasePath, { readonly: true, fileMustExist: true });
      try {
        await source.backup(target);
      } finally {
        source.close();
      }
      this.logger.info({
        event: 'backup_created',
        msg: `Backup diario creado: ${target}`,
      });
      await this.pruneOld();
    } catch (error) {
      this.logger.error({
        event: 'backup_failed',
        msg: 'No se pudo crear el backup diario — revisa espacio en disco',
        data: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  private async pruneOld(): Promise<void> {
    const files = (await readdir(this.backupsDir))
      .filter((file) => /^mana-\d{4}-\d{2}-\d{2}\.sqlite$/.test(file))
      .sort();
    const excess = files.slice(0, Math.max(0, files.length - KEEP_BACKUPS));
    for (const file of excess) {
      await rm(path.join(this.backupsDir, file), { force: true });
    }
  }
}
