import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { exhaustive } from '#shared/domain/exhaustive.js';
import type { CustomerAccount } from '#modules/credit/domain/customer.js';
import type { CreditEntry } from '#modules/credit/domain/credit-entry.js';
import { CreateCustomer, CreateCustomerInput } from '#modules/credit/use-cases/create-customer/create-customer.js';
import {
  CustomerNotFoundById,
  CustomerUpdated,
  UpdateCustomer,
  UpdateCustomerInput,
} from '#modules/credit/use-cases/update-customer/update-customer.js';
import {
  ListCustomerAccounts,
  ListCustomerAccountsInput,
} from '#modules/credit/use-cases/list-customer-accounts/list-customer-accounts.js';
import {
  CustomerNotFoundForStatement,
  GetStatement,
  GetStatementInput,
  Statement,
} from '#modules/credit/use-cases/get-statement/get-statement.js';
import { RegisterAbono } from '#modules/credit/use-cases/register-abono/register-abono.js';
import { RegisterAbonoInput } from '#modules/credit/use-cases/register-abono/register-abono.input.js';
import {
  AbonoExceedsDebt,
  AbonoRegistered,
  CustomerNotFoundForAbono,
} from '#modules/credit/use-cases/register-abono/register-abono.output.js';

const customerBodyDto = z.object({
  name: z.string().min(1),
  phone: z.string().min(1).nullish(),
  document: z.string().min(1).nullish(),
  creditLimitCents: z.number().int().nonnegative(),
});

const listQueryDto = z.object({
  query: z.string().optional(),
  onlyDebtors: z.enum(['true', 'false']).optional(),
});

const abonoDto = z.object({
  amountCents: z.number().int().positive(),
  paymentMethod: z.enum(['cash', 'yape']),
  userId: z.string().min(1).default('encargado'),
});

export class CreditController {
  constructor(
    private readonly createCustomer: CreateCustomer,
    private readonly updateCustomer: UpdateCustomer,
    private readonly listCustomerAccounts: ListCustomerAccounts,
    private readonly getStatement: GetStatement,
    private readonly registerAbono: RegisterAbono,
  ) {}

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = customerBodyDto.parse(request.body);
    const customer = await this.createCustomer.execute(
      new CreateCustomerInput(body.name, body.phone ?? null, body.document ?? null, body.creditLimitCents),
    );
    await reply.status(201).send({ id: customer.id, name: customer.name });
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = customerBodyDto.parse(request.body);
    const result = await this.updateCustomer.execute(
      new UpdateCustomerInput(
        idParam(request),
        body.name,
        body.phone ?? null,
        body.document ?? null,
        body.creditLimitCents,
      ),
    );
    if (result instanceof CustomerUpdated) {
      await reply.status(200).send({ id: result.customer.id, name: result.customer.name });
      return;
    }
    if (result instanceof CustomerNotFoundById) {
      await reply.status(404).send({ code: 'CUSTOMER_NOT_FOUND', customerId: result.customerId });
      return;
    }
    exhaustive(result);
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = listQueryDto.parse(request.query);
    const accounts = await this.listCustomerAccounts.execute(
      new ListCustomerAccountsInput(query.query ?? null, query.onlyDebtors === 'true'),
    );
    await reply.status(200).send(accounts.map(toAccountResponse));
  }

  async statement(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = await this.getStatement.execute(new GetStatementInput(idParam(request)));
    if (result instanceof Statement) {
      await reply.status(200).send({
        account: toAccountResponse(result.account),
        entries: result.entries.map(toEntryResponse),
      });
      return;
    }
    if (result instanceof CustomerNotFoundForStatement) {
      await reply.status(404).send({ code: 'CUSTOMER_NOT_FOUND', customerId: result.customerId });
      return;
    }
    exhaustive(result);
  }

  async abono(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = abonoDto.parse(request.body);
    const result = await this.registerAbono.execute(
      new RegisterAbonoInput(idParam(request), body.amountCents, body.paymentMethod, body.userId),
    );
    if (result instanceof AbonoRegistered) {
      await reply.status(201).send({
        entry: toEntryResponse(result.entry),
        newBalanceCents: result.newBalanceCents,
      });
      return;
    }
    if (result instanceof AbonoExceedsDebt) {
      await reply.status(409).send({
        code: 'ABONO_EXCEEDS_DEBT',
        debtCents: result.debtCents,
        message: `El abono supera la deuda actual (S/ ${(result.debtCents / 100).toFixed(2)}).`,
      });
      return;
    }
    if (result instanceof CustomerNotFoundForAbono) {
      await reply.status(404).send({ code: 'CUSTOMER_NOT_FOUND', customerId: result.customerId });
      return;
    }
    exhaustive(result);
  }
}

function toAccountResponse(account: CustomerAccount): Record<string, unknown> {
  return {
    id: account.customer.id,
    name: account.customer.name,
    phone: account.customer.phone,
    document: account.customer.document,
    creditLimitCents: account.customer.creditLimitCents,
    balanceCents: account.balanceCents,
    availableCents: account.availableCents,
  };
}

function toEntryResponse(entry: CreditEntry): Record<string, unknown> {
  return {
    id: entry.id,
    kind: entry.kind,
    amountCents: entry.amountCents,
    ticketId: entry.ticketId,
    paymentMethod: entry.paymentMethod,
    userId: entry.userId,
    createdAt: entry.createdAt.toISOString(),
  };
}

function idParam(request: FastifyRequest): string {
  const params = request.params;
  if (typeof params === 'object' && params !== null && 'id' in params && typeof params.id === 'string') {
    return params.id;
  }
  throw new Error('Missing id param');
}
