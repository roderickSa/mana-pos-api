import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Dinero siempre en céntimos de sol (enteros). Peso siempre en gramos (enteros).
// Para productos por unidad, stock/cantidades son unidades; por peso, gramos.

export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  notes: text('notes'),
  // CSV de días ('lun,mar'): alimenta la sugerencia de órdenes.
  visitDays: text('visit_days'),
  contactName: text('contact_name'),
  paymentTerms: text('payment_terms'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const categories = sqliteTable('categories', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const products = sqliteTable(
  'products',
  {
    id: text('id').primaryKey(),
    barcode: text('barcode').unique(),
    // Código corto tecleable (1-3 dígitos) para lo de mostrador sin barcode.
    shortCode: text('short_code').unique(),
    name: text('name').notNull(),
    normalizedName: text('normalized_name').notNull(),
    category: text('category').notNull(),
    imagePath: text('image_path'),
    saleType: text('sale_type', { enum: ['unit', 'weight'] }).notNull(),
    priceCents: integer('price_cents').notNull(),
    costCents: integer('cost_cents').notNull(),
    stockQuantity: integer('stock_quantity').notNull().default(0),
    stockMinimum: integer('stock_minimum').notNull().default(0),
    // Fecha de vencimiento del stock actual (una por producto, no por lote).
    expiryDate: integer('expiry_date', { mode: 'timestamp_ms' }),
    // Compra por empaque (solo productos por unidad): 1 caja/paquete = packSize
    // unidades a packCostCents; costCents guarda siempre el costo por unidad.
    packSize: integer('pack_size'),
    packCostCents: integer('pack_cost_cents'),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    quickAccess: integer('quick_access', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('products_normalized_name_idx').on(table.normalizedName),
    index('products_category_idx').on(table.category),
  ],
);

// Códigos de barras ADICIONALES (alias): el principal vive en products.barcode.
// Un mismo producto puede venir con varios EAN según el lote o presentación.
export const productBarcodes = sqliteTable(
  'product_barcodes',
  {
    barcode: text('barcode').primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('product_barcodes_product_idx').on(table.productId)],
);

// Un producto puede comprarse a varios proveedores (o a ninguno: costo directo).
export const productSuppliers = sqliteTable(
  'product_suppliers',
  {
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    supplierId: text('supplier_id')
      .notNull()
      .references(() => suppliers.id),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.supplierId] }),
    index('product_suppliers_supplier_idx').on(table.supplierId),
  ],
);

export const purchaseOrders = sqliteTable(
  'purchase_orders',
  {
    id: text('id').primaryKey(),
    // Correlativo humano: la orden se nombra "Orden #4", no por fecha.
    number: integer('number').notNull().default(0),
    supplierId: text('supplier_id')
      .notNull()
      .references(() => suppliers.id),
    status: text('status', { enum: ['open', 'partial', 'received', 'cancelled'] }).notNull(),
    notes: text('notes'),
    createdBy: text('created_by').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('purchase_orders_status_idx').on(table.status)],
);

export const purchaseOrderLines = sqliteTable(
  'purchase_order_lines',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id')
      .notNull()
      .references(() => purchaseOrders.id),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    description: text('description').notNull(),
    saleType: text('sale_type', { enum: ['unit', 'weight'] }).notNull(),
    // Unidades para productos por unidad, gramos para pesables (como el resto).
    quantityOrdered: integer('quantity_ordered').notNull(),
    quantityReceived: integer('quantity_received').notNull().default(0),
    // Costo pactado por unidad o por kg según el tipo de venta.
    unitCostCents: integer('unit_cost_cents').notNull(),
    packSize: integer('pack_size'),
    packCostCents: integer('pack_cost_cents'),
  },
  (table) => [index('purchase_order_lines_order_idx').on(table.orderId)],
);

// Historia tanda a tanda de las recepciones: la orden guarda el acumulado,
// aquí queda cada entrega (fecha, quién recibió, cantidades y costo real).
export const purchaseReceptions = sqliteTable('purchase_receptions', {
  id: text('id').primaryKey(),
  orderId: text('order_id')
    .notNull()
    .references(() => purchaseOrders.id),
  receivedAt: integer('received_at', { mode: 'timestamp_ms' }).notNull(),
  receivedBy: text('received_by').notNull(),
});

export const purchaseReceptionLines = sqliteTable('purchase_reception_lines', {
  id: text('id').primaryKey(),
  receptionId: text('reception_id')
    .notNull()
    .references(() => purchaseReceptions.id),
  productId: text('product_id')
    .notNull()
    .references(() => products.id),
  quantity: integer('quantity').notNull(),
  unitCostCents: integer('unit_cost_cents').notNull(),
  expiryDate: integer('expiry_date', { mode: 'timestamp_ms' }),
});

// Lotes: cada entrada con fecha de vencimiento crea uno. El stock del
// producto sigue siendo un contador único; los lotes recuerdan qué parte
// vence cuándo (products.expiry_date queda como columna legacy sin uso).
export const productLots = sqliteTable(
  'product_lots',
  {
    id: text('id').primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    quantity: integer('quantity').notNull(),
    expiryDate: integer('expiry_date', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('product_lots_product_idx').on(table.productId)],
);

export const stockMovements = sqliteTable(
  'stock_movements',
  {
    id: text('id').primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    type: text('type', {
      enum: ['sale', 'sale_reversal', 'purchase', 'waste', 'expiry', 'theft', 'count'],
    }).notNull(),
    quantity: integer('quantity').notNull(),
    // Valor del movimiento en céntimos: ventas al precio vendido, resto al costo.
    valueCents: integer('value_cents'),
    reason: text('reason'),
    ticketId: text('ticket_id'),
    userId: text('user_id').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('stock_movements_product_idx').on(table.productId),
    index('stock_movements_ticket_idx').on(table.ticketId),
  ],
);

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  pinHash: text('pin_hash').notNull(),
  role: text('role', { enum: ['owner', 'manager', 'cashier'] }).notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp_ms' }),
});

// Sesiones de login por token opaco: el API valida el Bearer en cada request.
export const sessions = sqliteTable('sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
});

export const cashSessions = sqliteTable(
  'cash_sessions',
  {
    id: text('id').primaryKey(),
    shift: text('shift', { enum: ['morning', 'afternoon'] }).notNull(),
    status: text('status', { enum: ['open', 'closed'] }).notNull(),
    openedBy: text('opened_by').notNull(),
    openedAt: integer('opened_at', { mode: 'timestamp_ms' }).notNull(),
    openingAmountCents: integer('opening_amount_cents').notNull(),
    closedBy: text('closed_by'),
    closedAt: integer('closed_at', { mode: 'timestamp_ms' }),
    expectedCashCents: integer('expected_cash_cents'),
    countedCashCents: integer('counted_cash_cents'),
    closingNote: text('closing_note'),
  },
  (table) => [index('cash_sessions_status_idx').on(table.status)],
);

export const cashMovements = sqliteTable(
  'cash_movements',
  {
    id: text('id').primaryKey(),
    cashSessionId: text('cash_session_id')
      .notNull()
      .references(() => cashSessions.id),
    type: text('type', { enum: ['withdrawal', 'expense', 'deposit'] }).notNull(),
    amountCents: integer('amount_cents').notNull(),
    concept: text('concept').notNull(),
    userId: text('user_id').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('cash_movements_session_idx').on(table.cashSessionId)],
);

export const tickets = sqliteTable(
  'tickets',
  {
    id: text('id').primaryKey(),
    number: integer('number').notNull(),
    status: text('status', { enum: ['open', 'charged', 'voided'] }).notNull(),
    // Nullable hasta que exista el módulo cash (tarea 7): ahí se exige caja abierta.
    cashSessionId: text('cash_session_id').references(() => cashSessions.id),
    userId: text('user_id').notNull(),
    totalCents: integer('total_cents').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    chargedAt: integer('charged_at', { mode: 'timestamp_ms' }),
    voidedAt: integer('voided_at', { mode: 'timestamp_ms' }),
    voidedBy: text('voided_by'),
    voidReason: text('void_reason'),
  },
  (table) => [
    index('tickets_status_idx').on(table.status),
    index('tickets_session_idx').on(table.cashSessionId),
  ],
);

export const ticketLines = sqliteTable(
  'ticket_lines',
  {
    id: text('id').primaryKey(),
    ticketId: text('ticket_id')
      .notNull()
      .references(() => tickets.id),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    description: text('description').notNull(),
    saleType: text('sale_type', { enum: ['unit', 'weight'] }).notNull(),
    quantity: integer('quantity').notNull(),
    weightSource: text('weight_source', { enum: ['scale', 'manual'] }),
    unitPriceCents: integer('unit_price_cents').notNull(),
    discountCents: integer('discount_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull(),
  },
  (table) => [index('ticket_lines_ticket_idx').on(table.ticketId)],
);

export const payments = sqliteTable(
  'payments',
  {
    id: text('id').primaryKey(),
    ticketId: text('ticket_id')
      .notNull()
      .references(() => tickets.id),
    method: text('method', { enum: ['cash', 'yape', 'card', 'credit'] }).notNull(),
    amountCents: integer('amount_cents').notNull(),
    customerId: text('customer_id').references(() => customers.id),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('payments_ticket_idx').on(table.ticketId)],
);

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  document: text('document'),
  creditLimitCents: integer('credit_limit_cents').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const creditEntries = sqliteTable(
  'credit_entries',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id),
    type: text('type', { enum: ['charge', 'payment'] }).notNull(),
    amountCents: integer('amount_cents').notNull(),
    // Referencia blanda: el cargo se registra antes de persistir el ticket.
    ticketId: text('ticket_id'),
    paymentMethod: text('payment_method', { enum: ['cash', 'yape'] }),
    userId: text('user_id').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('credit_entries_customer_idx').on(table.customerId)],
);

export const auditLog = sqliteTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id').notNull(),
    data: text('data'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('audit_log_entity_idx').on(table.entity, table.entityId)],
);

// Configuración clave-valor (voucher, etc.).
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
