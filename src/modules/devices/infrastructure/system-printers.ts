import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

// Impresoras instaladas en el sistema, para elegirla desde Ajustes → Equipos.
// Windows (la PC de la tienda): PowerShell Get-Printer. Linux (desarrollo):
// lpstat de CUPS. Si algo falla, lista vacía — la UI lo explica.
export async function listSystemPrinters(): Promise<string[]> {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await run('powershell.exe', [
        '-NoProfile',
        '-Command',
        'Get-Printer | ForEach-Object Name',
      ]);
      return splitLines(stdout);
    }
    const { stdout } = await run('lpstat', ['-e']);
    return splitLines(stdout);
  } catch {
    return [];
  }
}

function splitLines(stdout: string): string[] {
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
}
