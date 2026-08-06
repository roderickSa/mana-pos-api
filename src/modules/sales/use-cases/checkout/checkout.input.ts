import type { Nullable } from '#shared/domain/nullable.js';
import type { WeightSource } from '#modules/sales/domain/ticket-line.js';

export class UnitLineOrder {
  constructor(
    readonly productId: string,
    readonly quantity: number,
    readonly discountCents: number = 0,
  ) {}
}

export class WeightLineOrder {
  constructor(
    readonly productId: string,
    readonly grams: number,
    readonly weightSource: WeightSource,
    readonly discountCents: number = 0,
  ) {}
}

export type LineOrder = UnitLineOrder | WeightLineOrder;

export class CashPaymentOrder {
  constructor(
    readonly amountCents: number,
    // Lo que entregó el cliente; null = pago exacto.
    readonly receivedCents: Nullable<number>,
  ) {}
}

export class YapePaymentOrder {
  constructor(readonly amountCents: number) {}
}

export class CardPaymentOrder {
  constructor(readonly amountCents: number) {}
}

export class CreditPaymentOrder {
  constructor(
    readonly amountCents: number,
    readonly customerId: string,
  ) {}
}

export type PaymentOrder = CashPaymentOrder | YapePaymentOrder | CardPaymentOrder | CreditPaymentOrder;

// ticketId lo genera el cliente: un retry con el mismo id NO crea otra venta.
export class CheckoutInput {
  constructor(
    readonly ticketId: string,
    readonly lines: LineOrder[],
    readonly payments: PaymentOrder[],
    readonly userId: string,
    // Descuento sobre el ticket completo (aparte de los descuentos por línea).
    readonly ticketDiscountCents: number = 0,
    // Encargado que autorizó los descuentos (verificado por PIN en el front,
    // mismo modelo que la anulación). null = la cajera operó dentro de su margen.
    readonly discountAuthorizedBy: Nullable<string> = null,
    // true cuando quien vende ya es encargado/dueño: se autoautoriza.
    readonly sellerCanApproveDiscounts: boolean = false,
    // Cliente opcional de la venta; si se paga fiado y viene null, se toma
    // el cliente del fiado.
    readonly customerId: Nullable<string> = null,
  ) {}
}
