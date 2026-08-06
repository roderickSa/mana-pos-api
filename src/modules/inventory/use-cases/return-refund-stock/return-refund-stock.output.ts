import type { StockMovement } from '#modules/inventory/domain/stock-movement.js';

export class RefundStockReturned {
  constructor(readonly movements: StockMovement[]) {}
}

// Replay del mismo refundId: el stock ya se devolvió, no se duplica.
export class RefundAlreadyReturned {
  constructor(readonly refundId: string) {}
}

export type ReturnRefundStockResult = RefundStockReturned | RefundAlreadyReturned;
