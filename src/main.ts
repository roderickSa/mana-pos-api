import { bootstrap } from '#bootstrap/bootstrap.js';

const app = bootstrap(process.env);

app.server
  .listen({ port: app.config.httpPort, host: '0.0.0.0' })
  .catch((error: unknown) => {
    app.server.log.error({ event: 'startup_failed', msg: String(error) });
    process.exit(1);
  });
