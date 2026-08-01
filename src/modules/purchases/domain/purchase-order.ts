import type { Nullable } from '#shared/domain/nullable.js';

export type PurchaseOrderStatus = 'open' | 'partial' | 'received' | 'cancelled';

export class PurchaseOrderLine {
  constructor(
    readonly id: string,
    readonly productId: string,
    readonly description: string,
    readonly saleType: 'unit' | 'weight',
    // Unidades para productos por unidad, gramos para pesables.
    readonly quantityOrdered: number,
    readonly quantityReceived: number,
    // Costo pactado por unidad o por kg según el tipo de venta.
    readonly unitCostCents: number,
    readonly packSize: Nullable<number>,
    readonly packCostCents: Nullable<number>,
  ) {}

  pendingQuantity(): number {
    return Math.max(0, this.quantityOrdered - this.quantityReceived);
  }

  isComplete(): boolean {
    return this.quantityReceived >= this.quantityOrdered;
  }

  // El proveedor puede mandar de más: se registra lo que llegó de verdad.
  withReceived(additionalQuantity: number): PurchaseOrderLine {
    return new PurchaseOrderLine(
      this.id,
      this.productId,
      this.description,
      this.saleType,
      this.quantityOrdered,
      this.quantityReceived + additionalQuantity,
      this.unitCostCents,
      this.packSize,
      this.packCostCents,
    );
  }

  totalCents(): number {
    return this.saleType === 'unit'
      ? this.unitCostCents * this.quantityOrdered
      : Math.round((this.unitCostCents * this.quantityOrdered) / 1000);
  }
}

export class PurchaseOrder {
  constructor(
    readonly id: string,
    readonly number: number,
    readonly supplierId: string,
    readonly status: PurchaseOrderStatus,
    readonly notes: Nullable<string>,
    readonly createdBy: string,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly lines: PurchaseOrderLine[],
  ) {}

  totalCents(): number {
    return this.lines.reduce((sum, line) => sum + line.totalCents(), 0);
  }

  canBeCancelled(): boolean {
    return this.status === 'open';
  }

  canReceive(): boolean {
    return this.status === 'open' || this.status === 'partial';
  }

  findLine(lineId: string): Nullable<PurchaseOrderLine> {
    return this.lines.find((line) => line.id === lineId) ?? null;
  }

  receive(quantitiesByLineId: ReadonlyMap<string, number>, at: Date): PurchaseOrder {
    const lines = this.lines.map((line) => {
      const quantity = quantitiesByLineId.get(line.id);
      return quantity === undefined ? line : line.withReceived(quantity);
    });
    const complete = lines.every((line) => line.isComplete());
    return new PurchaseOrder(
      this.id,
      this.number,
      this.supplierId,
      complete ? 'received' : 'partial',
      this.notes,
      this.createdBy,
      this.createdAt,
      at,
      lines,
    );
  }

  cancel(at: Date): PurchaseOrder {
    return new PurchaseOrder(
      this.id,
      this.number,
      this.supplierId,
      'cancelled',
      this.notes,
      this.createdBy,
      this.createdAt,
      at,
      this.lines,
    );
  }
}

// Resumen para el listado: incluye el nombre del proveedor y totales agregados.
export class PurchaseOrderSummary {
  constructor(
    readonly id: string,
    readonly number: number,
    readonly supplierId: string,
    readonly supplierName: string,
    readonly status: PurchaseOrderStatus,
    readonly linesCount: number,
    readonly totalCents: number,
    readonly createdAt: Date,
  ) {}
}
