import type { Nullable } from '#shared/domain/nullable.js';

// Vista mínima del producto que necesita una venta: el precio SIEMPRE sale de acá,
// nunca del cliente.
export class ForSaleProduct {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly saleType: 'unit' | 'weight',
    readonly priceCents: number,
    readonly active: boolean,
  ) {}
}

export interface ProductCatalog {
  findForSale(productId: string): Promise<Nullable<ForSaleProduct>>;
}
