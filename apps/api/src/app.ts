import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import { Type } from '@sinclair/typebox';
import {
  AnalyticsSchema, DeviceSchema, EnvironmentSchema, ErrorSchema, PeriodQuerySchema,
  ReadingSchema, SummaryQuerySchema, SummarySchema,
  type PeriodQuery, type Summary, type SummaryQuery,
} from '@ecogrid/contracts';
import { analyticsService, type AnalyticsService } from '@ecogrid/analytics';
import { Store } from './database.ts';

export async function buildApp(options: { store?: Store; analytics?: AnalyticsService; logger?: boolean } = {}) {
  const store = options.store ?? new Store(process.env.DATABASE_PATH ?? './data/ecogrid.sqlite');
  const analytics = options.analytics ?? analyticsService;
  const app = Fastify({ logger: options.logger ?? false, ajv: { customOptions: { removeAdditional: false } } });
  app.addHook('onClose', async () => store.close());
  await app.register(helmet);
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  await app.register(swagger, { openapi: { info: { title: 'Eco Grid — dados simulados', version: '0.1.0' } } });
  app.setErrorHandler((error, request, reply) => {
    const candidate = error as { statusCode?: number; validation?: unknown; code?: string };
    const status = candidate.statusCode ?? 500;
    if (status >= 500) request.log.error(error);
    reply.code(status).send({
      code: candidate.validation ? 'INVALID_INPUT' : status === 429 ? 'RATE_LIMITED' : status >= 500 ? 'INTERNAL_ERROR' : 'INVALID_INPUT',
      message: status >= 500 ? 'Não foi possível processar a solicitação.' : status === 429 ? 'Aguarde antes de tentar novamente.' : 'Parâmetros inválidos.',
      details: [],
    });
  });
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ code: 'NOT_FOUND', message: 'Recurso não encontrado.', details: [] }));
  const errors = { 400: ErrorSchema, 404: ErrorSchema, 429: ErrorSchema, 500: ErrorSchema };
  function period(query: PeriodQuery): PeriodQuery {
    const from = Date.parse(query.from), to = Date.parse(query.to);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to || from % 3600000 || to % 3600000 || to - from > 31 * 86400000) {
      throw Object.assign(new Error('Invalid period'), { statusCode: 400 });
    }
    if (query.environmentId && !store.environments().some(item => item.id === query.environmentId)) {
      throw Object.assign(new Error('Unknown environment'), { statusCode: 404 });
    }
    return { ...query, from: new Date(from).toISOString(), to: new Date(to).toISOString() };
  }
  app.get('/api/v1/health', { schema: { response: { 200: Type.Object({ status: Type.Literal('ok'), source: Type.Literal('simulated') }) } } },
    async () => ({ status: 'ok', source: 'simulated' }));
  app.get('/api/v1/environments', { schema: { response: { 200: Type.Array(EnvironmentSchema), ...errors } } }, async () => store.environments());
  app.get<{ Querystring: { environmentId?: string } }>('/api/v1/devices', {
    schema: { querystring: Type.Object({ environmentId: PeriodQuerySchema.properties.environmentId }, { additionalProperties: false }), response: { 200: Type.Array(DeviceSchema), ...errors } },
  }, async request => {
    if (request.query.environmentId && !store.environments().some(item => item.id === request.query.environmentId)) {
      throw Object.assign(new Error('Unknown environment'), { statusCode: 404 });
    }
    return store.devices(request.query.environmentId);
  });
  app.get<{ Querystring: PeriodQuery }>('/api/v1/readings', {
    schema: { querystring: PeriodQuerySchema, response: { 200: Type.Array(ReadingSchema), ...errors } },
  }, async request => store.readings(period(request.query)));
  app.get<{ Querystring: SummaryQuery }>('/api/v1/summary', {
    schema: { querystring: SummaryQuerySchema, response: { 200: SummarySchema, ...errors } },
  }, async (request): Promise<Summary> => {
    const query = period(request.query);
    const readings = store.readings(query);
    const tariff = request.query.tariffBrlPerKWh ?? 0.8;
    const expected = store.devices(query.environmentId).length * (Date.parse(query.to) - Date.parse(query.from)) / 3600000;
    const energy = readings.length ? readings.reduce((sum, item) => sum + Math.round(item.energyKWh * 1000), 0) / 1000 : null;
    return {
      source: 'simulated', from: query.from, to: query.to, energyKWh: energy,
      estimatedCostBrl: energy === null ? null : Math.round(energy * tariff * 100) / 100,
      tariffBrlPerKWh: tariff, readingCount: readings.length, expectedReadingCount: expected,
      coveragePercent: expected ? Math.round(readings.length / expected * 10000) / 100 : 0,
    };
  });
  const unavailable = { code: 'MODULE_NOT_IMPLEMENTED', message: 'Parte 3: análises e relatórios aguardam implementação.', details: [] };
  app.get<{ Querystring: SummaryQuery }>('/api/v1/analytics', {
    schema: { querystring: SummaryQuerySchema, response: { 200: AnalyticsSchema, 501: ErrorSchema, ...errors } },
  }, async (request, reply) => {
    const query = period(request.query);
    if (!analytics) return reply.code(501).send(unavailable);
    return analytics.analyze({ readings: store.readings(query), devices: store.devices(query.environmentId), tariffBrlPerKWh: request.query.tariffBrlPerKWh ?? 0.8 });
  });
  app.get<{ Querystring: SummaryQuery }>('/api/v1/reports/consumption.csv', {
    schema: { querystring: SummaryQuerySchema, response: { 200: Type.String(), 501: ErrorSchema, ...errors } },
  }, async (request, reply) => {
    const query = period(request.query);
    if (!analytics) return reply.code(501).send(unavailable);
    const csv = analytics.exportCsv({ readings: store.readings(query), devices: store.devices(query.environmentId), tariffBrlPerKWh: request.query.tariffBrlPerKWh ?? 0.8 });
    return reply.header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="ecogrid-consumo-simulado.csv"').send(csv);
  });
  app.get('/api/openapi.json', async () => app.swagger());
  await app.ready();
  return app;
}
