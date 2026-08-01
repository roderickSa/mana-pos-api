import type { IdGenerator } from '#shared/ports/id-generator.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import { PurchaseOrder, PurchaseOrderLine } from '#modules/purchases/domain/purchase-order.js';
import type { PurchaseOrderRepository } from '#modules/purchases/ports/purchase-order-repository.js';
import type { PurchaseProductLookup } from '#modules/purchases/ports/purchase-product-lookup.js';
import type { SupplierLookup } from '#modules/purchases/ports/supplier-lookup.js';
import type { CreatePurchaseOrderInput } from '#modules/purchases/use-cases/create-purchase-order/create-purchase-order.input.js';
import {
  EmptyPurchaseOrder,
  ProductNotFoundInOrder,
  PurchaseOrderCreated,
  SupplierNotFoundForOrder,
  type CreatePurchaseOrderResult,
} from '#modules/purchases/use-cases/create-purchase-order/create-purchase-order.output.js';

export class CreatePurchaseOrder {
  constructor(
    private readonly orderRepository: PurchaseOrderRepository,
    private readonly productLookup: PurchaseProductLookup,
    private readonly supplierLookup: SupplierLookup,
    private readonly idGenerator: IdGenerator,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: CreatePurchaseOrderInput): Promise<CreatePurchaseOrderResult> {
    if (input.lines.length === 0) {
      return new EmptyPurchaseOrder();
    }

    if (!(await this.supplierLookup.exists(input.supplierId))) {
      return new SupplierNotFoundForOrder(input.supplierId);
    }

    const lines: PurchaseOrderLine[] = [];
    for (const line of input.lines) {
      const product = await this.productLookup.findById(line.productId);
      if (product === null) {
        return new ProductNotFoundInOrder(line.productId);
      }
      lines.push(
        new PurchaseOrderLine(
          this.idGenerator.generate(),
          product.id,
          product.name,
          product.saleType,
          line.quantity,
          0,
          line.unitCostCents,
          line.packSize,
          line.packCostCents,
        ),
      );
    }

    const now = this.timeManager.now();
    const order = new PurchaseOrder(
      this.idGenerator.generate(),
      await this.orderRepository.nextNumber(),
      input.supplierId,
      'open',
      input.notes,
      input.createdBy,
      now,
      now,
      lines,
    );
    await this.orderRepository.save(order);
    return new PurchaseOrderCreated(order);
  }
}
