import { Checkout } from '#modules/sales/use-cases/checkout/checkout.js';
import {
  CashPaymentOrder,
  CheckoutInput,
  UnitLineOrder,
  WeightLineOrder,
  YapePaymentOrder,
} from '#modules/sales/use-cases/checkout/checkout.input.js';
import {
  CashReceivedInsufficient,
  CheckoutCompleted,
  DiscountNeedsManager,
  EmptyTicket,
  LineDiscountTooBig,
  NoCashSessionOpen,
  PaymentsDoNotMatchTotal,
  ProductNotSellable,
  TicketAlreadyCharged,
  TicketDiscountTooBig,
} from '#modules/sales/use-cases/checkout/checkout.output.js';
import { ForSaleProduct } from '#modules/sales/ports/product-catalog.js';
import { PrinterUnavailable } from '#modules/sales/ports/receipt-printer.js';
import {
  CashDrawerForTesting,
  CashSessionLookupForTesting,
  CreditGatewayForTesting,
  ProductCatalogForTesting,
  ReceiptPrinterForTesting,
  StockDiscounterForTesting,
  TicketRepositoryForTesting,
} from '../test-doubles/sales-test-doubles.js';
import { IdGeneratorForTesting } from '../../shared/test-doubles/id-generator-for-testing.js';
import { TimeManagerForTesting } from '../../shared/test-doubles/time-manager-for-testing.js';

const TICKET_ID = '00000000-0000-4000-8000-000000000001';

describe('Checkout', () => {
  let ticketRepository: TicketRepositoryForTesting;
  let catalog: ProductCatalogForTesting;
  let stockDiscounter: StockDiscounterForTesting;
  let creditGateway: CreditGatewayForTesting;
  let cashSessionLookup: CashSessionLookupForTesting;
  let printer: ReceiptPrinterForTesting;
  let drawer: CashDrawerForTesting;
  let useCase: Checkout;

  beforeEach(() => {
    ticketRepository = new TicketRepositoryForTesting();
    catalog = new ProductCatalogForTesting();
    stockDiscounter = new StockDiscounterForTesting();
    creditGateway = new CreditGatewayForTesting();
    cashSessionLookup = new CashSessionLookupForTesting();
    printer = new ReceiptPrinterForTesting();
    drawer = new CashDrawerForTesting();
    useCase = new Checkout(
      ticketRepository,
      catalog,
      stockDiscounter,
      creditGateway,
      cashSessionLookup,
      printer,
      drawer,
      new IdGeneratorForTesting(),
      new TimeManagerForTesting(),
    );
    catalog.addProduct(new ForSaleProduct('gaseosa', 'Inca Kola 600 ml', 'unit', 350, true));
    catalog.addProduct(new ForSaleProduct('papaya', 'Papaya', 'weight', 450, true));
  });

  function ordersOf990() {
    // 2 × 350 + 645g × 450/kg (290 redondeado) = 990
    return [new UnitLineOrder('gaseosa', 2), new WeightLineOrder('papaya', 645, 'scale')];
  }

  it('charges with cash computing the change from server-side prices', async () => {
    const result = await useCase.execute(
      new CheckoutInput(TICKET_ID, ordersOf990(), [new CashPaymentOrder(990, 1000)], 'cajera-rosa'),
    );

    expect(result).toBeInstanceOf(CheckoutCompleted);
    if (!(result instanceof CheckoutCompleted)) return;
    expect(result.ticket.totalCents).toBe(990);
    expect(result.changeCents).toBe(10);
    expect(result.ticket.isCharged()).toBe(true);
    expect(result.printerWarning).toBeNull();
    expect(ticketRepository.all()).toHaveLength(1);
    expect(stockDiscounter.discounts).toHaveLength(1);
    expect(stockDiscounter.discounts[0]?.items.map((item) => item.quantity)).toEqual([2, 645]);
    expect(drawer.openedTimes).toBe(1);
    expect(printer.printed).toHaveLength(1);
  });

  it('charges with yape without opening the drawer', async () => {
    const result = await useCase.execute(
      new CheckoutInput(TICKET_ID, ordersOf990(), [new YapePaymentOrder(990)], 'cajera-rosa'),
    );

    expect(result).toBeInstanceOf(CheckoutCompleted);
    if (!(result instanceof CheckoutCompleted)) return;
    expect(result.changeCents).toBe(0);
    expect(drawer.openedTimes).toBe(0);
  });

  it('is idempotent: a retry with the same ticketId does not charge twice', async () => {
    const input = new CheckoutInput(
      TICKET_ID,
      ordersOf990(),
      [new CashPaymentOrder(990, null)],
      'cajera-rosa',
    );

    await useCase.execute(input);
    const replay = await useCase.execute(input);

    expect(replay).toBeInstanceOf(TicketAlreadyCharged);
    expect(ticketRepository.all()).toHaveLength(1);
    expect(stockDiscounter.discounts).toHaveLength(1);
  });

  it('rejects payments that do not match the total', async () => {
    const result = await useCase.execute(
      new CheckoutInput(TICKET_ID, ordersOf990(), [new CashPaymentOrder(900, null)], 'cajera-rosa'),
    );

    expect(result).toBeInstanceOf(PaymentsDoNotMatchTotal);
    expect(ticketRepository.all()).toHaveLength(0);
    expect(stockDiscounter.discounts).toHaveLength(0);
  });

  it('rejects cash received below the amount to pay', async () => {
    const result = await useCase.execute(
      new CheckoutInput(TICKET_ID, ordersOf990(), [new CashPaymentOrder(990, 900)], 'cajera-rosa'),
    );

    expect(result).toBeInstanceOf(CashReceivedInsufficient);
    expect(ticketRepository.all()).toHaveLength(0);
  });

  it('rejects inactive or unknown products', async () => {
    catalog.addProduct(new ForSaleProduct('cerveza', 'Pilsen', 'unit', 750, false));

    const inactive = await useCase.execute(
      new CheckoutInput(TICKET_ID, [new UnitLineOrder('cerveza', 1)], [new CashPaymentOrder(750, null)], 'cajera'),
    );
    const unknown = await useCase.execute(
      new CheckoutInput(TICKET_ID, [new UnitLineOrder('fantasma', 1)], [new CashPaymentOrder(100, null)], 'cajera'),
    );

    expect(inactive).toBeInstanceOf(ProductNotSellable);
    expect(unknown).toBeInstanceOf(ProductNotSellable);
  });

  it('rejects the sale when no cash session is open', async () => {
    cashSessionLookup.closeSession();

    const result = await useCase.execute(
      new CheckoutInput(TICKET_ID, ordersOf990(), [new CashPaymentOrder(990, null)], 'cajera'),
    );

    expect(result).toBeInstanceOf(NoCashSessionOpen);
    expect(ticketRepository.all()).toHaveLength(0);
  });

  it('rejects an empty ticket', async () => {
    const result = await useCase.execute(
      new CheckoutInput(TICKET_ID, [], [new CashPaymentOrder(100, null)], 'cajera'),
    );

    expect(result).toBeInstanceOf(EmptyTicket);
  });

  it('rounds ONLY the ticket total to 10 cents, never per line', async () => {
    // 100 g × 4.50/kg = 45 céntimos exactos (la línea NO se redondea);
    // 350 + 45 = 395 → el total sube a 400 con redondeo visible de +5.
    const result = await useCase.execute(
      new CheckoutInput(
        TICKET_ID,
        [new UnitLineOrder('gaseosa', 1), new WeightLineOrder('papaya', 100, 'scale')],
        [new CashPaymentOrder(400, null)],
        'cajera-rosa',
      ),
    );

    expect(result).toBeInstanceOf(CheckoutCompleted);
    if (!(result instanceof CheckoutCompleted)) return;
    expect(result.ticket.lines[1]?.totalCents).toBe(45);
    expect(result.ticket.subtotalCents).toBe(395);
    expect(result.ticket.totalCents).toBe(400);
    expect(result.ticket.roundingCents).toBe(5);
  });

  it('applies a small line discount without manager approval', async () => {
    // 2 × 350 − 50 de descuento (7%, dentro del margen de la cajera) = 650
    const result = await useCase.execute(
      new CheckoutInput(
        TICKET_ID,
        [new UnitLineOrder('gaseosa', 2, 50)],
        [new CashPaymentOrder(650, null)],
        'cajera-rosa',
      ),
    );

    expect(result).toBeInstanceOf(CheckoutCompleted);
    if (!(result instanceof CheckoutCompleted)) return;
    expect(result.ticket.totalCents).toBe(650);
    expect(result.ticket.lineDiscountsCents).toBe(50);
    expect(result.ticket.discountAuthorizedBy).toBeNull();
  });

  it('rejects a big line discount from the cashier without manager approval', async () => {
    // 200 de 700 = 28%: supera el margen sin autorización.
    const result = await useCase.execute(
      new CheckoutInput(
        TICKET_ID,
        [new UnitLineOrder('gaseosa', 2, 200)],
        [new CashPaymentOrder(500, null)],
        'cajera-rosa',
      ),
    );

    expect(result).toBeInstanceOf(DiscountNeedsManager);
    expect(ticketRepository.all()).toHaveLength(0);
  });

  it('accepts a big discount when a manager authorized it by PIN', async () => {
    const result = await useCase.execute(
      new CheckoutInput(
        TICKET_ID,
        [new UnitLineOrder('gaseosa', 2, 200)],
        [new CashPaymentOrder(500, null)],
        'cajera-rosa',
        0,
        'Encargado',
      ),
    );

    expect(result).toBeInstanceOf(CheckoutCompleted);
    if (!(result instanceof CheckoutCompleted)) return;
    expect(result.ticket.discountAuthorizedBy).toBe('Encargado');
  });

  it('requires manager approval for any whole-ticket discount', async () => {
    const denied = await useCase.execute(
      new CheckoutInput(TICKET_ID, ordersOf990(), [new CashPaymentOrder(890, null)], 'cajera-rosa', 100),
    );
    expect(denied).toBeInstanceOf(DiscountNeedsManager);

    const approved = await useCase.execute(
      new CheckoutInput(TICKET_ID, ordersOf990(), [new CashPaymentOrder(890, null)], 'cajera-rosa', 100, 'Encargado'),
    );
    expect(approved).toBeInstanceOf(CheckoutCompleted);
    if (!(approved instanceof CheckoutCompleted)) return;
    expect(approved.ticket.totalCents).toBe(890);
    expect(approved.ticket.discountCents).toBe(100);
  });

  it('lets a manager seller apply their own discounts without extra PIN', async () => {
    const result = await useCase.execute(
      new CheckoutInput(
        TICKET_ID,
        ordersOf990(),
        [new CashPaymentOrder(890, null)],
        'Encargado',
        100,
        null,
        true,
      ),
    );

    expect(result).toBeInstanceOf(CheckoutCompleted);
    if (!(result instanceof CheckoutCompleted)) return;
    expect(result.ticket.discountAuthorizedBy).toBe('Encargado');
  });

  it('rejects discounts larger than what can be discounted', async () => {
    const lineTooBig = await useCase.execute(
      new CheckoutInput(
        TICKET_ID,
        [new UnitLineOrder('gaseosa', 1, 400)],
        [new CashPaymentOrder(100, null)],
        'cajera-rosa',
        0,
        'Encargado',
      ),
    );
    expect(lineTooBig).toBeInstanceOf(LineDiscountTooBig);

    const ticketTooBig = await useCase.execute(
      new CheckoutInput(TICKET_ID, ordersOf990(), [new CashPaymentOrder(1, null)], 'cajera-rosa', 1500, 'Encargado'),
    );
    expect(ticketTooBig).toBeInstanceOf(TicketDiscountTooBig);
    expect(ticketRepository.all()).toHaveLength(0);
  });

  it('completes the sale with a human warning when the printer is down', async () => {
    printer.failWith(new PrinterUnavailable('La impresora no responde, revisa el cable USB'));

    const result = await useCase.execute(
      new CheckoutInput(TICKET_ID, ordersOf990(), [new CashPaymentOrder(990, null)], 'cajera-rosa'),
    );

    expect(result).toBeInstanceOf(CheckoutCompleted);
    if (!(result instanceof CheckoutCompleted)) return;
    expect(result.printerWarning).toBe('La impresora no responde, revisa el cable USB');
    expect(result.ticket.isCharged()).toBe(true);
  });
});
