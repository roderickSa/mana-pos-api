import type { Nullable } from '#shared/domain/nullable.js';

// Lo que la tienda puede personalizar del voucher.
export class ReceiptConfig {
  constructor(
    readonly storeName: string,
    // Línea extra bajo el nombre: dirección, RUC, teléfono…
    readonly headerExtra: Nullable<string>,
    readonly footerMessage: string,
  ) {}

  static defaults(): ReceiptConfig {
    return new ReceiptConfig('Minimarket Mana', null, 'Gracias por su compra');
  }
}
