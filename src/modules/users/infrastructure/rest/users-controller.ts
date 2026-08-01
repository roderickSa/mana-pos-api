import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { exhaustive } from '#shared/domain/exhaustive.js';
import type { User } from '#modules/users/domain/user.js';
import {
  CreateUser,
  CreateUserInput,
  PinAlreadyInUse,
  WeakPin,
  UserCreated,
} from '#modules/users/use-cases/create-user/create-user.js';
import { ListUsers } from '#modules/users/use-cases/list-users/list-users.js';
import {
  InvalidPin,
  LoginSucceeded,
  LoginWithPin,
  LoginWithPinInput,
} from '#modules/users/use-cases/login-with-pin/login-with-pin.js';
import {
  UpdateUser,
  UpdateUserInput,
  UserNotFoundById,
  UserUpdated,
} from '#modules/users/use-cases/update-user/update-user.js';
import {
  ManagerPinVerified,
  NotAManagerPin,
  VerifyManagerPin,
  VerifyManagerPinInput,
} from '#modules/users/use-cases/verify-manager-pin/verify-manager-pin.js';

const pinDto = z.object({ pin: z.string().regex(/^\d{4,6}$/) });

const createUserDto = z.object({
  name: z.string().min(1),
  pin: z.string().regex(/^\d{4,6}$/),
  role: z.enum(['manager', 'cashier']),
});

const updateUserDto = z.object({
  name: z.string().min(1),
  role: z.enum(['manager', 'cashier']),
  active: z.boolean(),
  newPin: z.string().regex(/^\d{4,6}$/).nullish(),
});

function toUserResponse(user: User): Record<string, unknown> {
  return { id: user.id, name: user.name, role: user.role, active: user.active };
}

function idParam(request: FastifyRequest): string {
  const params = request.params;
  if (typeof params === 'object' && params !== null && 'id' in params && typeof params.id === 'string') {
    return params.id;
  }
  throw new Error('Missing id param');
}

export class UsersController {
  constructor(
    private readonly loginWithPin: LoginWithPin,
    private readonly verifyManagerPin: VerifyManagerPin,
    private readonly createUser: CreateUser,
    private readonly updateUser: UpdateUser,
    private readonly listUsers: ListUsers,
  ) {}

  async login(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = pinDto.parse(request.body);
    const result = await this.loginWithPin.execute(new LoginWithPinInput(body.pin));
    if (result instanceof LoginSucceeded) {
      await reply.status(200).send(toUserResponse(result.user));
      return;
    }
    if (result instanceof InvalidPin) {
      await reply.status(401).send({
        code: 'INVALID_PIN',
        message: 'PIN incorrecto. Vuelve a intentarlo.',
      });
      return;
    }
    exhaustive(result);
  }

  async verifyManager(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = pinDto.parse(request.body);
    const result = await this.verifyManagerPin.execute(new VerifyManagerPinInput(body.pin));
    if (result instanceof ManagerPinVerified) {
      await reply.status(200).send({ ok: true, managerName: result.manager.name });
      return;
    }
    if (result instanceof NotAManagerPin) {
      await reply.status(403).send({
        code: 'NOT_MANAGER_PIN',
        message: 'Ese PIN no es de un encargado. Pide autorización al encargado.',
      });
      return;
    }
    exhaustive(result);
  }

  async list(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const all = await this.listUsers.execute();
    await reply.status(200).send(all.map(toUserResponse));
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = createUserDto.parse(request.body);
    const result = await this.createUser.execute(new CreateUserInput(body.name, body.pin, body.role));
    if (result instanceof UserCreated) {
      await reply.status(201).send(toUserResponse(result.user));
      return;
    }
    if (result instanceof PinAlreadyInUse) {
      await reply.status(409).send({
        code: 'PIN_ALREADY_IN_USE',
        message: 'Ese PIN ya lo usa otra persona. Elige uno distinto.',
      });
      return;
    }
    if (result instanceof WeakPin) {
      await reply.status(400).send({
        code: 'WEAK_PIN',
        message:
          'Ese PIN es muy fácil de adivinar (dígitos repetidos o en secuencia). Elige otro.',
      });
      return;
    }
    exhaustive(result);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = updateUserDto.parse(request.body);
    const result = await this.updateUser.execute(
      new UpdateUserInput(idParam(request), body.name, body.role, body.active, body.newPin ?? null),
    );
    if (result instanceof UserUpdated) {
      await reply.status(200).send(toUserResponse(result.user));
      return;
    }
    if (result instanceof UserNotFoundById) {
      await reply.status(404).send({ code: 'USER_NOT_FOUND', userId: result.userId });
      return;
    }
    if (result instanceof PinAlreadyInUse) {
      await reply.status(409).send({
        code: 'PIN_ALREADY_IN_USE',
        message: 'Ese PIN ya lo usa otra persona. Elige uno distinto.',
      });
      return;
    }
    if (result instanceof WeakPin) {
      await reply.status(400).send({
        code: 'WEAK_PIN',
        message:
          'Ese PIN es muy fácil de adivinar (dígitos repetidos o en secuencia). Elige otro.',
      });
      return;
    }
    exhaustive(result);
  }
}
