import type { FastifyReply, FastifyRequest } from 'fastify';

import { exhaustive } from '#shared/domain/exhaustive.js';
import type { Nullable } from '#shared/domain/nullable.js';
import type { User } from '#modules/users/domain/user.js';

// El guard cuelga el usuario autenticado del request: los controllers que
// necesitan saber QUIÉN ejecuta (p. ej. administrar usuarios) lo leen de aquí.
declare module 'fastify' {
  interface FastifyRequest {
    authUser: Nullable<User>;
  }
}
import {
  SessionInvalid,
  SessionValid,
  ValidateSession,
  ValidateSessionInput,
} from '#modules/users/use-cases/validate-session/validate-session.js';
import { resolveAccess } from '#modules/users/infrastructure/rest/route-policy.js';

// Hook global de Fastify: el API deja de confiar en el front. Cada request a
// un endpoint de API valida el Bearer y el rol mínimo de la ruta.
export class AuthGuard {
  constructor(private readonly validateSession: ValidateSession) {}

  async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const access = resolveAccess(request.method, request.url);
    if (access === 'public') {
      return;
    }
    const header = request.headers.authorization;
    const token =
      typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : '';
    const result = await this.validateSession.execute(new ValidateSessionInput(token));
    if (result instanceof SessionInvalid) {
      // Diagnóstico de auth: con QUÉ credencial se rechazó (nunca el token entero).
      request.log.warn({
        event: 'auth_rejected',
        msg: 'Request sin sesión válida',
        data: { path: request.url, tokenPrefix: token.slice(0, 8), tokenLength: token.length },
      });
      await reply.status(401).send({
        code: 'SESSION_INVALID',
        message: 'Tu sesión expiró — vuelve a entrar con tu PIN.',
      });
      return;
    }
    if (result instanceof SessionValid) {
      request.authUser = result.user;
      if (!result.user.hasAtLeast(access)) {
        await reply.status(403).send({
          code: 'FORBIDDEN',
          message: 'Tu perfil no tiene permiso para esta operación.',
        });
      }
      return;
    }
    exhaustive(result);
  }
}
