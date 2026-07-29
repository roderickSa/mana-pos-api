import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Dinero siempre en céntimos de sol (enteros). Peso siempre en gramos (enteros).
// Para productos por unidad, stock/cantidades son unidades; por peso, gramos.

export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  notes: text('notes'),
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
    supplierId: text('supplier_id').references(() => suppliers.id),
    imagePath: text('image_path'),
    saleType: text('sale_type', { enum: ['unit', 'weight'] }).notNull(),
    priceCents: integer('price_cents').notNull(),
    costCents: integer('cost_cents').notNull(),
    stockQuantity: integer('stock_quantity').notNull().default(0),
    stockMinimum: integer('stock_minimum').notNull().default(0),
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
  role: text('role', { enum: ['manager', 'cashier'] }).notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
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
    type: text('type', { enum: ['withdrawal', 'expense'] }).notNull(),
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
