import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DEMO_PERIOD, demoDevices } from '@ecogrid/contracts';
import { simulate } from '@ecogrid/simulator';
import { Store } from './database.ts';
import { buildApp } from './app.ts';
import type { FastifyInstance } from 'fastify';
const query = new URLSearchParams(DEMO_PERIOD).toString();
const running: FastifyInstance[] = [];
afterEach(async () => { for (const app of running.splice(0)) await app.close(); });
async function setup(seed = true) {
  const store = new Store();
  if (seed) store.seed();
  const app = await buildApp({ store });
  running.push(app);
  return { app, store };
}
describe('simulation and persistence', () => {
  it('reproduces each device/hour including overlapping simulation runs', () => {
    const all = simulate();
    expect(all).toHaveLength(672);
    expect(simulate()).toEqual(all);
    expect(simulate(43)).not.toEqual(all);
    const subset = simulate(42, demoDevices, DEMO_PERIOD.from, '2026-10-13T00:00:00.000Z');
    expect(subset).toEqual(all.filter(item => item.intervalEnd <= '2026-10-13T00:00:00.000Z'));
    expect(all.every(item => item.energyKWh >= 0 && item.source === 'simulated')).toBe(true);
    expect(() => simulate(42, demoDevices, 'invalid')).toThrow();
  });
  it('persists after reopening and does not duplicate seed rows', () => {
    const directory = mkdtempSync(join(tmpdir(), 'ecogrid-test-'));
    const path = join(directory, 'demo.sqlite');
    let store = new Store(path);
    try {
      expect(store.seed()).toEqual({ inserted: 672, total: 672, seed: 42 });
      store.close(); store = new Store(path);
      expect(store.seed()).toEqual({ inserted: 0, total: 672, seed: 42 });
      expect(store.readings(DEMO_PERIOD)).toHaveLength(672);
      expect(() => store.db.prepare('INSERT INTO readings VALUES (?, ?, ?, ?, ?, ?)')
        .run('duplicate', 'computers', DEMO_PERIOD.from, '2026-10-12T01:00:00.000Z', 1, 'simulated')).toThrow();
    } finally { store.close(); rmSync(directory, { recursive: true }); }
  });
});
describe('API integration', () => {
  it('lists environments, isolates devices and readings, and includes the last complete interval', async () => {
    const { app } = await setup();
    expect((await app.inject('/api/v1/environments')).json()).toHaveLength(2);
    const devices = (await app.inject('/api/v1/devices?environmentId=lab')).json();
    expect(devices).toHaveLength(2);
    const readings = (await app.inject('/api/v1/readings?' + query + '&environmentId=lab')).json();
    expect(readings).toHaveLength(336);
    expect(readings.every((item: { deviceId: string }) => devices.some((device: { id: string }) => device.id === item.deviceId))).toBe(true);
    expect(readings.at(-1).intervalEnd).toBe(DEMO_PERIOD.to);
  });
  it('normalizes offsets and honors the exclusive end', async () => {
    const { app } = await setup();
    const offsetQuery = new URLSearchParams({ from: '2026-10-11T21:00:00-03:00', to: '2026-10-11T22:00:00-03:00' });
    const response = await app.inject('/api/v1/readings?' + offsetQuery);
    expect(response.statusCode).toBe(200);
    const rows = response.json();
    expect(rows).toHaveLength(4);
    expect(rows.every((item: { intervalStart: string }) => item.intervalStart === DEMO_PERIOD.from)).toBe(true);
  });
  it('rejects invalid ranges, extra fields and invalid tariffs', async () => {
    const { app } = await setup();
    for (const path of [
      '/api/v1/readings?from=invalid&to=invalid',
      '/api/v1/readings?' + query + '&extra=1',
      '/api/v1/summary?' + query + '&tariffBrlPerKWh=-1',
      '/api/v1/summary?' + query + '&tariffBrlPerKWh=abc',
      '/api/v1/readings?' + new URLSearchParams({ from: DEMO_PERIOD.to, to: DEMO_PERIOD.from }),
      '/api/v1/readings?' + new URLSearchParams({ from: '2026-10-12T00:30:00Z', to: DEMO_PERIOD.to }),
      '/api/v1/readings?' + new URLSearchParams({ from: DEMO_PERIOD.from, to: '2026-12-01T00:00:00Z' }),
    ]) {
      const response = await app.inject(path);
      expect(response.statusCode, path).toBe(400);
      expect(response.json()).toMatchObject({ code: 'INVALID_INPUT', details: [] });
    }
  });
  it('returns 404 for an unknown environment without exposing internals', async () => {
    const { app } = await setup();
    const response = await app.inject('/api/v1/summary?' + query + '&environmentId=missing');
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ code: 'INVALID_INPUT', message: 'Parâmetros inválidos.', details: [] });
  });
  it('computes 10 kWh at R$ 0.80 as R$ 8.00 and exposes partial coverage', async () => {
    const { app, store } = await setup();
    store.db.exec('DELETE FROM readings');
    const insert = store.db.prepare('INSERT INTO readings VALUES (?, ?, ?, ?, ?, ?)');
    insert.run('known-1', 'computers', DEMO_PERIOD.from, '2026-10-12T01:00:00.000Z', 4000, 'simulated');
    insert.run('known-2', 'lab-lights', DEMO_PERIOD.from, '2026-10-12T01:00:00.000Z', 6000, 'simulated');
    const response = await app.inject('/api/v1/summary?' + query + '&environmentId=lab&tariffBrlPerKWh=0.8');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ energyKWh: 10, estimatedCostBrl: 8, readingCount: 2, expectedReadingCount: 336 });
    expect(response.json().coveragePercent).toBeLessThan(100);
    const free = await app.inject('/api/v1/summary?' + query + '&tariffBrlPerKWh=0');
    expect(free.json().estimatedCostBrl).toBe(0);
  });
  it('represents missing readings as null, not zero', async () => {
    const { app } = await setup();
    const response = await app.inject('/api/v1/summary?' + new URLSearchParams({ from: '2027-01-01T00:00:00Z', to: '2027-01-02T00:00:00Z' }));
    expect(response.json()).toMatchObject({ energyKWh: null, estimatedCostBrl: null, coveragePercent: 0, expectedReadingCount: 96 });
  });
  it('starts with an empty database and documents future modules as unavailable', async () => {
    const { app } = await setup(false);
    expect((await app.inject('/api/v1/health')).json()).toEqual({ status: 'ok', source: 'simulated' });
    expect((await app.inject('/api/v1/environments')).json()).toEqual([]);
    for (const path of ['/api/v1/analytics?', '/api/v1/reports/consumption.csv?']) {
      const response = await app.inject(path + query);
      expect(response.statusCode).toBe(501);
      expect(response.json().code).toBe('MODULE_NOT_IMPLEMENTED');
    }
    const openapi = (await app.inject('/api/openapi.json')).json();
    expect(openapi.paths['/api/v1/readings']).toBeDefined();
    expect(openapi.paths['/api/v1/summary'].get.parameters.some((item: { name: string }) => item.name === 'from')).toBe(true);
  });
  it('connects the analytics extension without database access', async () => {
    const store = new Store(); store.seed();
    const app = await buildApp({ store, analytics: {
      analyze: ({ readings }) => ({ source: 'simulated', alerts: [], notes: [String(readings.length)] }),
      exportCsv: ({ readings }) => 'source,count\nsimulated,' + readings.length + '\n',
    } });
    running.push(app);
    expect((await app.inject('/api/v1/analytics?' + query + '&environmentId=lab')).json().notes).toEqual(['336']);
    const csv = await app.inject('/api/v1/reports/consumption.csv?' + query);
    expect(csv.statusCode).toBe(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.body).toContain('simulated,672');
  });
});
