import fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { loadConfig, type Config } from '#config/config.js';
import {
  createDatabaseClient,
  runMigrations,
  type DatabaseClient,
} from '#shared/infrastructure/database/client.js';
import { SystemTimeManager } from '#shared/infrastructure/system-time-manager.js';
import { UuidIdGenerator } from '#shared/infrastructure/uuid-id-generator.js';
import { SqliteProductRepository } from '#modules/catalog/infrastructure/repositories/sqlite-product-repository.js';
import { CatalogController } from '#modules/catalog/infrastructure/rest/catalog-controller.js';
import { registerCatalogRoutes } from '#modules/catalog/infrastructure/rest/catalog-routes.js';
import { PricesController } from '#modules/catalog/infrastructure/rest/prices-controller.js';
import { BulkUpdatePrices } from '#modules/catalog/use-cases/bulk-update-prices/bulk-update-prices.js';
import { SuggestLowMarginPrices } from '#modules/catalog/use-cases/suggest-low-margin-prices/suggest-low-margin-prices.js';
import { ApplyPriceList } from '#modules/catalog/use-cases/apply-price-list/apply-price-list.js';
import { CreateProduct } from '#modules/catalog/use-cases/create-product/create-product.js';
import { GetProductByBarcode } from '#modules/catalog/use-cases/get-product-by-barcode/get-product-by-barcode.js';
import { SearchProducts } from '#modules/catalog/use-cases/search-products/search-products.js';
import { UpdateProduct } from '#modules/catalog/use-cases/update-product/update-product.js';
import { SqliteInventoryRepository } from '#modules/inventory/infrastructure/repositories/sqlite-inventory-repository.js';
import { InventoryController } from '#modules/inventory/infrastructure/rest/inventory-controller.js';
import { registerInventoryRoutes } from '#modules/inventory/infrastructure/rest/inventory-routes.js';
import { GetKardex } from '#modules/inventory/use-cases/get-kardex/get-kardex.js';
import { RegisterStockAdjustment } from '#modules/inventory/use-cases/register-stock-adjustment/register-stock-adjustment.js';
import { RegisterStockEntry } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.js';
import { SetStockCount } from '#modules/inventory/use-cases/set-stock-count/set-stock-count.js';
import { SqliteSupplierLookup } from '#modules/catalog/infrastructure/services/sqlite-supplier-lookup.js';
import { SqliteBarcodeAliasRepository } from '#modules/catalog/infrastructure/repositories/sqlite-barcode-alias-repository.js';
import { SqliteProductMerger } from '#modules/catalog/infrastructure/repositories/sqlite-product-merger.js';
import {
  AddProductBarcode,
  ListProductBarcodes,
  RemoveProductBarcode,
} from '#modules/catalog/use-cases/manage-barcodes/manage-barcodes.js';
import { MergeProducts } from '#modules/catalog/use-cases/merge-products/merge-products.js';
import {
  LinkProductSupplier,
  UnlinkProductSupplier,
} from '#modules/catalog/use-cases/manage-product-suppliers/manage-product-suppliers.js';
import { SqliteProductSupplierLink } from '#modules/catalog/infrastructure/repositories/sqlite-product-supplier-link.js';
import { SqliteSupplierRepository } from '#modules/suppliers/infrastructure/repositories/sqlite-supplier-repository.js';
import { registerSupplierRoutes } from '#modules/suppliers/infrastructure/rest/suppliers-routes.js';
import { CreateSupplier } from '#modules/suppliers/use-cases/create-supplier/create-supplier.js';
import { ListSuppliers } from '#modules/suppliers/use-cases/list-suppliers/list-suppliers.js';
import { UpdateSupplier } from '#modules/suppliers/use-cases/update-supplier/update-supplier.js';
import { SearchMovements } from '#modules/inventory/use-cases/search-movements/search-movements.js';
import { SearchTickets } from '#modules/sales/use-cases/search-tickets/search-tickets.js';
import { FsImageStore } from '#modules/catalog/infrastructure/services/fs-image-store.js';
import { ImportProductsController } from '#modules/catalog/infrastructure/rest/import-products-controller.js';
import { CategoriesController } from '#modules/catalog/infrastructure/rest/categories-controller.js';
import { SqliteCategoryRepository } from '#modules/catalog/infrastructure/repositories/sqlite-category-repository.js';
import {
  CreateCategory,
  DeleteCategory,
  ListCategories,
  ReorderCategories,
  UpdateCategory,
} from '#modules/catalog/use-cases/manage-categories/manage-categories.js';
import {
  RemoveProductImage,
  SetProductImage,
} from '#modules/catalog/use-cases/set-product-image/set-product-image.js';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import fastifyStatic from '@fastify/static';
import { SqliteBackupEngine } from '#modules/backups/infrastructure/sqlite-backup-engine.js';
import { SettingsExternalDirStore } from '#modules/backups/infrastructure/settings-external-dir-store.js';
import { registerBackupsRoutes } from '#modules/backups/infrastructure/rest/backups-routes.js';
import { GetBackupStatus } from '#modules/backups/use-cases/get-backup-status.js';
import { RunBackupNow } from '#modules/backups/use-cases/run-backup-now.js';
import { ExternalDirService } from '#modules/backups/use-cases/external-dir-service.js';
import { SqliteSettingsRepository } from '#modules/settings/infrastructure/repositories/sqlite-settings-repository.js';
import { registerSettingsRoutes } from '#modules/settings/infrastructure/rest/settings-routes.js';
import { ReceiptConfigService } from '#modules/settings/use-cases/receipt-config-service.js';
import { PrinterConfigService } from '#modules/settings/use-cases/printer-config-service.js';
import path from 'node:path';
import { ReverseSaleStock } from '#modules/inventory/use-cases/reverse-sale-stock/reverse-sale-stock.js';
import { ReturnRefundStock } from '#modules/inventory/use-cases/return-refund-stock/return-refund-stock.js';
import { DiscountStockForSale } from '#modules/inventory/use-cases/discount-stock-for-sale/discount-stock-for-sale.js';
import { SqliteTicketRepository } from '#modules/sales/infrastructure/repositories/sqlite-ticket-repository.js';
import { CatalogProductCatalog } from '#modules/sales/infrastructure/services/catalog-product-catalog.js';
import { InventoryStockDiscounter } from '#modules/sales/infrastructure/services/inventory-stock-discounter.js';
import {
  SimulatedCashDrawer,
  SimulatedReceiptPrinter,
} from '#modules/sales/infrastructure/devices/simulated-devices.js';
import { SalesController } from '#modules/sales/infrastructure/rest/sales-controller.js';
import { registerSalesRoutes } from '#modules/sales/infrastructure/rest/sales-routes.js';
import { Checkout } from '#modules/sales/use-cases/checkout/checkout.js';
import { VoidTicket } from '#modules/sales/use-cases/void-ticket/void-ticket.js';
import { ReprintReceipt } from '#modules/sales/use-cases/reprint-receipt/reprint-receipt.js';
import { GetTicketDetail } from '#modules/sales/use-cases/get-ticket-detail/get-ticket-detail.js';
import {
  EscPosCashDrawer,
  EscPosReceiptPrinter,
} from '#modules/sales/infrastructure/devices/escpos-receipt-printer.js';
import {
  SerialScaleReader,
  SimulatedScaleReader,
} from '#modules/devices/infrastructure/serial/serial-scale-reader.js';
import { registerDevicesRoutes } from '#modules/devices/infrastructure/rest/devices-routes.js';
import {
  SqliteCreditLedger,
  SqliteCustomerRepository,
} from '#modules/credit/infrastructure/repositories/sqlite-credit-repositories.js';
import { registerCreditRoutes } from '#modules/credit/infrastructure/rest/credit-routes.js';
import { CreditController } from '#modules/credit/infrastructure/rest/credit-controller.js';
import { ChargeCredit } from '#modules/credit/use-cases/charge-credit/charge-credit.js';
import { CreateCustomer } from '#modules/credit/use-cases/create-customer/create-customer.js';
import { GetStatement } from '#modules/credit/use-cases/get-statement/get-statement.js';
import { ListCustomerAccounts } from '#modules/credit/use-cases/list-customer-accounts/list-customer-accounts.js';
import { RegisterAbono } from '#modules/credit/use-cases/register-abono/register-abono.js';
import { ReverseCreditForTicket } from '#modules/credit/use-cases/reverse-credit-for-ticket/reverse-credit-for-ticket.js';
import { UpdateCustomer } from '#modules/credit/use-cases/update-customer/update-customer.js';
import { CreditModuleGateway } from '#modules/sales/infrastructure/services/credit-module-gateway.js';
import { CashModuleRefundCash } from '#modules/sales/infrastructure/services/cash-module-refund-cash.js';
import { SqliteRefundRepository } from '#modules/sales/infrastructure/repositories/sqlite-refund-repository.js';
import { CreditModuleCustomerNames } from '#modules/sales/infrastructure/services/credit-module-customer-names.js';
import { RefundSale } from '#modules/sales/use-cases/refund-sale/refund-sale.js';
import { RefundCreditForTicket } from '#modules/credit/use-cases/refund-credit-for-ticket/refund-credit-for-ticket.js';
import { CashModuleSessionLookup } from '#modules/sales/infrastructure/services/cash-module-session-lookup.js';
import { SqliteUserRepository } from '#modules/users/infrastructure/repositories/sqlite-user-repository.js';
import { ScryptPinHasher } from '#modules/users/infrastructure/services/scrypt-pin-hasher.js';
import { UsersController } from '#modules/users/infrastructure/rest/users-controller.js';
import { registerUsersRoutes } from '#modules/users/infrastructure/rest/users-routes.js';
import {
  CreateUser,
  CreateUserInput,
  UserCreated,
} from '#modules/users/use-cases/create-user/create-user.js';
import { Logout } from '#modules/users/use-cases/logout/logout.js';
import { ValidateSession } from '#modules/users/use-cases/validate-session/validate-session.js';
import { SqliteSessionRepository } from '#modules/users/infrastructure/repositories/sqlite-session-repository.js';
import { AuthGuard } from '#modules/users/infrastructure/rest/auth-guard.js';
import { ListUsers } from '#modules/users/use-cases/list-users/list-users.js';
import { LoginWithPin } from '#modules/users/use-cases/login-with-pin/login-with-pin.js';
import { UpdateUser } from '#modules/users/use-cases/update-user/update-user.js';
import { VerifyManagerPin } from '#modules/users/use-cases/verify-manager-pin/verify-manager-pin.js';
import { SqliteCashSessionRepository } from '#modules/cash/infrastructure/repositories/sqlite-cash-session-repository.js';
import { SqliteCashInflowSource } from '#modules/cash/infrastructure/services/sqlite-cash-inflow-source.js';
import { CashController } from '#modules/cash/infrastructure/rest/cash-controller.js';
import { PrintCloseSummary } from '#modules/cash/use-cases/print-close-summary/print-close-summary.js';
import {
  GetExpiringLots,
  RemoveLot,
  UpdateLotExpiry,
} from '#modules/inventory/use-cases/expiry/expiry.js';
import { RegisterLotWaste } from '#modules/inventory/use-cases/register-lot-waste/register-lot-waste.js';
import { SqliteLotRepository } from '#modules/inventory/infrastructure/repositories/sqlite-lot-repository.js';
import { ExpiryAlertService } from '#modules/settings/use-cases/expiry-alert-service.js';
import { IgvService } from '#modules/settings/use-cases/igv-service.js';
import { registerCashRoutes } from '#modules/cash/infrastructure/rest/cash-routes.js';
import { OpenCashSession } from '#modules/cash/use-cases/open-cash-session/open-cash-session.js';
import { SqlitePurchaseOrderRepository } from '#modules/purchases/infrastructure/repositories/sqlite-purchase-order-repository.js';
import { SqlitePurchaseReceptionRepository } from '#modules/purchases/infrastructure/repositories/sqlite-purchase-reception-repository.js';
import { SqlitePurchaseProductLookup } from '#modules/purchases/infrastructure/services/sqlite-purchase-product-lookup.js';
import { registerPurchasesRoutes } from '#modules/purchases/infrastructure/rest/purchases-routes.js';
import { CreatePurchaseOrder } from '#modules/purchases/use-cases/create-purchase-order/create-purchase-order.js';
import { ListPurchaseOrders } from '#modules/purchases/use-cases/list-purchase-orders/list-purchase-orders.js';
import { GetPurchaseOrder } from '#modules/purchases/use-cases/get-purchase-order/get-purchase-order.js';
import { CancelPurchaseOrder } from '#modules/purchases/use-cases/cancel-purchase-order/cancel-purchase-order.js';
import { ReceivePurchaseOrder } from '#modules/purchases/use-cases/receive-purchase-order/receive-purchase-order.js';
import { InventoryStockReceiver } from '#modules/purchases/infrastructure/services/inventory-stock-receiver.js';
import { GetCashStatus } from '#modules/cash/use-cases/get-cash-status/get-cash-status.js';
import { RegisterCashMovement } from '#modules/cash/use-cases/register-cash-movement/register-cash-movement.js';
import { CloseCashSession } from '#modules/cash/use-cases/close-cash-session/close-cash-session.js';

export class App {
  constructor(
    readonly server: FastifyInstance,
    readonly config: Config,
    readonly db: DatabaseClient,
  ) {}
}

export function bootstrap(env: NodeJS.ProcessEnv): App {
  const config = loadConfig(env);

  // El modo entrenamiento nunca toca la BD real.
  const databasePath = config.training ? './entrenamiento.sqlite' : config.databasePath;
  const db = createDatabaseClient(databasePath);
  runMigrations(db, './drizzle');

  const idGenerator = new UuidIdGenerator();
  const timeManager = new SystemTimeManager();

  const productRepository = new SqliteProductRepository(db);
  const supplierLookup = new SqliteSupplierLookup(db);
  const supplierRepository = new SqliteSupplierRepository(db);

  const createSupplier = new CreateSupplier(supplierRepository, idGenerator, timeManager);
  const listSuppliers = new ListSuppliers(supplierRepository);
  const updateSupplier = new UpdateSupplier(supplierRepository);

  const createProduct = new CreateProduct(productRepository, supplierLookup, idGenerator, timeManager);
  const updateProduct = new UpdateProduct(productRepository, supplierLookup, timeManager);
  const searchProducts = new SearchProducts(productRepository);
  const getProductByBarcode = new GetProductByBarcode(productRepository);
  const imageStore = new FsImageStore(config.imagesDir);
  const setProductImage = new SetProductImage(productRepository, imageStore, timeManager);
  const removeProductImage = new RemoveProductImage(productRepository, imageStore, timeManager);

  const barcodeAliasRepository = new SqliteBarcodeAliasRepository(db);
  const catalogController = new CatalogController(
    createProduct,
    updateProduct,
    searchProducts,
    getProductByBarcode,
    setProductImage,
    removeProductImage,
    new ListProductBarcodes(barcodeAliasRepository),
    new AddProductBarcode(productRepository, barcodeAliasRepository, timeManager),
    new RemoveProductBarcode(barcodeAliasRepository),
    new MergeProducts(productRepository, new SqliteProductMerger(db), timeManager),
    new LinkProductSupplier(productRepository, supplierLookup, new SqliteProductSupplierLink(db)),
    new UnlinkProductSupplier(new SqliteProductSupplierLink(db)),
  );

  const inventoryRepository = new SqliteInventoryRepository(db);
  const lotRepository = new SqliteLotRepository(db);
  const registerStockEntry = new RegisterStockEntry(
    inventoryRepository,
    lotRepository,
    idGenerator,
    timeManager,
  );
  const registerStockAdjustment = new RegisterStockAdjustment(
    inventoryRepository,
    idGenerator,
    timeManager,
  );
  const setStockCount = new SetStockCount(inventoryRepository, idGenerator, timeManager);
  const getKardex = new GetKardex(inventoryRepository);
  const searchMovements = new SearchMovements(inventoryRepository);

  const categoryRepository = new SqliteCategoryRepository(db);
  const importProductsController = new ImportProductsController(
    createProduct,
    registerStockEntry,
    createSupplier,
    listSuppliers,
    searchProducts,
    new ListCategories(categoryRepository),
  );

  const settingsRepository = new SqliteSettingsRepository(db);
  const expiryAlertService = new ExpiryAlertService(settingsRepository);
  const igvService = new IgvService(settingsRepository);
  const getExpiringLots = new GetExpiringLots(lotRepository, timeManager);

  const inventoryController = new InventoryController(
    registerStockEntry,
    registerStockAdjustment,
    setStockCount,
    getKardex,
    searchMovements,
    getExpiringLots,
    new UpdateLotExpiry(lotRepository),
    new RemoveLot(lotRepository),
    new RegisterLotWaste(lotRepository, registerStockAdjustment),
    expiryAlertService,
  );

  const server = fastify({ logger: true });

  const externalDirStore = new SettingsExternalDirStore(settingsRepository);
  const backupEngine = new SqliteBackupEngine(
    databasePath,
    config.backupsDir,
    () => externalDirStore.get(),
    server.log,
  );
  if (databasePath !== ':memory:' && !config.training) {
    backupEngine.start();
  }

  const ticketRepository = new SqliteTicketRepository(db);
  const refundRepository = new SqliteRefundRepository(db);
  const productCatalogForSales = new CatalogProductCatalog(productRepository);
  const stockDiscounter = new InventoryStockDiscounter(
    new DiscountStockForSale(inventoryRepository, idGenerator, timeManager),
    new ReverseSaleStock(inventoryRepository, idGenerator, timeManager),
    new ReturnRefundStock(inventoryRepository, idGenerator, timeManager),
  );
  const realDevices = config.devicesMode === 'real';
  const customerRepository = new SqliteCustomerRepository(db);
  const creditLedger = new SqliteCreditLedger(db);
  const createCustomer = new CreateCustomer(customerRepository, idGenerator, timeManager);
  const updateCustomer = new UpdateCustomer(customerRepository);
  const listCustomerAccounts = new ListCustomerAccounts(customerRepository, creditLedger);
  const getStatement = new GetStatement(customerRepository, creditLedger);
  const registerAbono = new RegisterAbono(customerRepository, creditLedger, idGenerator, timeManager);
  const chargeCredit = new ChargeCredit(customerRepository, creditLedger, idGenerator, timeManager);
  const reverseCreditForTicket = new ReverseCreditForTicket(creditLedger, idGenerator, timeManager);
  const refundCreditForTicket = new RefundCreditForTicket(creditLedger, idGenerator, timeManager);
  const creditGateway = new CreditModuleGateway(
    chargeCredit,
    reverseCreditForTicket,
    refundCreditForTicket,
  );
  const creditController = new CreditController(
    createCustomer,
    updateCustomer,
    listCustomerAccounts,
    getStatement,
    registerAbono,
  );

  const receiptConfigService = new ReceiptConfigService(settingsRepository);
  const printerConfigService = new PrinterConfigService(
    settingsRepository,
    config.printer.paperWidthMm,
  );
  const receiptPrinter = realDevices
    ? new EscPosReceiptPrinter(
        config.printer.interface,
        printerConfigService,
        receiptConfigService,
        server.log,
      )
    : new SimulatedReceiptPrinter(server.log);
  const cashDrawer = realDevices
    ? new EscPosCashDrawer(config.printer.interface, printerConfigService, server.log)
    : new SimulatedCashDrawer(server.log);
  const scaleReader = realDevices
    ? new SerialScaleReader(config.scale.serialPath, config.scale.baudRate, server.log)
    : new SimulatedScaleReader();
  const cashSessionRepository = new SqliteCashSessionRepository(db);
  const cashInflowSource = new SqliteCashInflowSource(db);
  const openCashSession = new OpenCashSession(cashSessionRepository, idGenerator, timeManager);
  const getCashStatus = new GetCashStatus(cashSessionRepository, cashInflowSource);
  const registerCashMovement = new RegisterCashMovement(
    cashSessionRepository,
    getCashStatus,
    idGenerator,
    timeManager,
  );
  const closeCashSession = new CloseCashSession(
    cashSessionRepository,
    cashInflowSource,
    getCashStatus,
    timeManager,
  );
  const printCloseSummary = new PrintCloseSummary(
    cashSessionRepository,
    getCashStatus,
    cashInflowSource,
    receiptPrinter,
  );
  const cashController = new CashController(
    openCashSession,
    getCashStatus,
    registerCashMovement,
    closeCashSession,
    printCloseSummary,
    cashSessionRepository,
  );
  const cashSessionLookup = new CashModuleSessionLookup(cashSessionRepository);

  const userRepository = new SqliteUserRepository(db);
  const pinHasher = new ScryptPinHasher();
  const sessionRepository = new SqliteSessionRepository(db);
  const loginWithPin = new LoginWithPin(
    userRepository,
    pinHasher,
    sessionRepository,
    idGenerator,
    timeManager,
  );
  const logout = new Logout(sessionRepository, timeManager);
  // El guard va ANTES de registrar rutas: valida Bearer + rol mínimo en todo
  // endpoint de API (la política vive en route-policy.ts).
  const authGuard = new AuthGuard(
    new ValidateSession(sessionRepository, userRepository, timeManager),
  );
  server.addHook('onRequest', (request, reply) => authGuard.handle(request, reply));
  const verifyManagerPin = new VerifyManagerPin(userRepository, pinHasher);
  const createUser = new CreateUser(userRepository, pinHasher, idGenerator, timeManager);
  const updateUser = new UpdateUser(userRepository, pinHasher);
  const listUsers = new ListUsers(userRepository);
  const usersController = new UsersController(
    loginWithPin,
    verifyManagerPin,
    createUser,
    updateUser,
    listUsers,
    logout,
  );

  const checkout = new Checkout(
    ticketRepository,
    productCatalogForSales,
    stockDiscounter,
    creditGateway,
    cashSessionLookup,
    receiptPrinter,
    cashDrawer,
    idGenerator,
    timeManager,
  );
  const voidTicket = new VoidTicket(ticketRepository, stockDiscounter, creditGateway, timeManager);
  const refundSale = new RefundSale(
    ticketRepository,
    refundRepository,
    stockDiscounter,
    creditGateway,
    new CashModuleRefundCash(registerCashMovement),
    receiptPrinter,
    idGenerator,
    timeManager,
  );
  const searchTickets = new SearchTickets(ticketRepository);
  const reprintReceipt = new ReprintReceipt(ticketRepository, refundRepository, receiptPrinter);
  const getTicketDetail = new GetTicketDetail(
    ticketRepository,
    refundRepository,
    new CreditModuleCustomerNames(customerRepository),
  );
  const salesController = new SalesController(
    checkout,
    voidTicket,
    refundSale,
    searchTickets,
    reprintReceipt,
    getTicketDetail,
    igvService,
  );

  server.setErrorHandler((error: unknown, _request, reply) => {
    if (error instanceof ZodError) {
      void reply.status(400).send({ code: 'VALIDATION_ERROR', issues: error.issues });
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    server.log.error({ event: 'unhandled_error', msg: message });
    void reply.status(500).send({ code: 'INTERNAL_ERROR' });
  });

  server.get('/health', () => ({ status: 'ok', service: 'mana-pos-api', training: config.training }));

  const imageContentTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
  };
  server.get('/images/:file', async (request, reply) => {
    const params = request.params;
    const file =
      typeof params === 'object' && params !== null && 'file' in params && typeof params.file === 'string'
        ? path.basename(params.file)
        : '';
    const contentType = imageContentTypes[path.extname(file)];
    if (file === '' || contentType === undefined) {
      await reply.status(404).send({ code: 'IMAGE_NOT_FOUND' });
      return;
    }
    try {
      const data = await readFile(path.join(config.imagesDir, file));
      await reply.status(200).header('cache-control', 'max-age=86400').type(contentType).send(data);
    } catch {
      await reply.status(404).send({ code: 'IMAGE_NOT_FOUND' });
    }
  });

  const categoriesController = new CategoriesController(
    new ListCategories(categoryRepository),
    new CreateCategory(categoryRepository, timeManager),
    new UpdateCategory(categoryRepository),
    new ReorderCategories(categoryRepository),
    new DeleteCategory(categoryRepository),
    categoryRepository,
  );
  const purchaseOrderRepository = new SqlitePurchaseOrderRepository(db);
  const purchaseReceptionRepository = new SqlitePurchaseReceptionRepository(db);
  const purchaseProductLookup = new SqlitePurchaseProductLookup(db);
  registerPurchasesRoutes(
    server,
    new CreatePurchaseOrder(purchaseOrderRepository, purchaseProductLookup, supplierLookup, idGenerator, timeManager),
    new ListPurchaseOrders(purchaseOrderRepository),
    new GetPurchaseOrder(purchaseOrderRepository, purchaseReceptionRepository),
    new CancelPurchaseOrder(purchaseOrderRepository, timeManager),
    new ReceivePurchaseOrder(
      purchaseOrderRepository,
      new InventoryStockReceiver(registerStockEntry),
      purchaseReceptionRepository,
      idGenerator,
      timeManager,
    ),
  );

  const pricesController = new PricesController(
    new BulkUpdatePrices(productRepository, timeManager),
    new SuggestLowMarginPrices(productRepository),
    new ApplyPriceList(productRepository, timeManager),
  );
  registerCatalogRoutes(
    server,
    catalogController,
    importProductsController,
    categoriesController,
    pricesController,
  );
  registerInventoryRoutes(server, inventoryController);
  registerSupplierRoutes(server, createSupplier, listSuppliers, updateSupplier);
  registerSalesRoutes(server, salesController);
  registerDevicesRoutes(server, scaleReader, receiptPrinter, cashDrawer, printerConfigService, config.devicesMode);
  registerCreditRoutes(server, creditController);
  registerCashRoutes(server, cashController);
  registerUsersRoutes(server, usersController);
  registerSettingsRoutes(server, receiptConfigService, expiryAlertService, igvService);
  registerBackupsRoutes(
    server,
    new GetBackupStatus(backupEngine),
    new RunBackupNow(backupEngine),
    new ExternalDirService(externalDirStore, backupEngine),
  );

  // Producción local: si el front está compilado, la API lo sirve en el mismo
  // puerto (un solo origen, sin Vite). Rutas no-API caen al index (SPA).
  const webDist = path.resolve(config.webDistDir);
  if (existsSync(path.join(webDist, 'index.html'))) {
    void server.register(fastifyStatic, { root: webDist, prefix: '/' });
    server.setNotFoundHandler(async (request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api')) {
        await reply.type('text/html').send(await readFile(path.join(webDist, 'index.html')));
        return;
      }
      await reply.status(404).send({ code: 'NOT_FOUND' });
    });
    server.log.info({ event: 'web_served', msg: `Front servido desde ${webDist}` });
  }

  // Primera vez: crea el encargado inicial (PIN 1234) para poder entrar.
  void userRepository.countUsers().then(async () => {
    // El dueño se siembra también en BDs existentes (iteración 4): en una BD
    // fresca es el primer usuario, y desde él se crean encargados y cajeras.
    const users = await userRepository.findAll();
    if (!users.some((user) => user.isOwner())) {
      const seeded = await createUser.execute(new CreateUserInput('Dueño', '2580', 'owner', 'owner'));
      if (seeded instanceof UserCreated) {
        server.log.warn({
          event: 'default_owner_created',
          msg: 'Usuario "Dueño" creado con PIN 2580 — cámbialo YA en Ajustes → Usuarios',
        });
      } else {
        server.log.error({
          event: 'default_owner_seed_failed',
          msg: 'No se pudo crear el usuario "Dueño" (¿PIN 2580 en uso?) — créalo a mano en Ajustes → Usuarios',
        });
      }
    }
  });

  return new App(server, config, db);
}
