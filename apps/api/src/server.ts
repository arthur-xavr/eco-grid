import { buildApp } from './app.ts';

const app = await buildApp({ logger: true });
try { await app.listen({ host: '127.0.0.1', port: Number(process.env.PORT ?? 3001) }); }
catch (error) { app.log.error(error); await app.close(); process.exitCode = 1; }
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => { void app.close(); });
}
