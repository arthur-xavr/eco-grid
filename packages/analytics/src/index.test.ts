import { describe, expect, it } from 'vitest';
import { DEMO_PERIOD, demoDevices, type Device, type Reading } from '@ecogrid/contracts';
import { simulate } from '@ecogrid/simulator';
import { analyticsService } from './index.ts';

const sampleReadings = simulate(42, demoDevices, DEMO_PERIOD.from, DEMO_PERIOD.to);
const sampleDevices = demoDevices;

describe('analytics service', () => {
  it('compares environments in the selected period and documents the demonstrative baseline', () => {
    expect(analyticsService).toBeDefined();
    const report = analyticsService!.analyze({
      readings: sampleReadings,
      devices: sampleDevices,
      tariffBrlPerKWh: 0.8,
    });

    expect(report.source).toBe('simulated');
    expect(report.notes.some(item => /ambiente|comparação|base/i.test(item))).toBe(true);
    expect(report.notes.some(item => /economia|redução/i.test(item))).toBe(false);
  });

  it('returns notes instead of zero values for empty periods', () => {
    expect(analyticsService).toBeDefined();
    const report = analyticsService!.analyze({
      readings: [],
      devices: sampleDevices,
      tariffBrlPerKWh: 0.8,
    });

    expect(report.alerts).toEqual([]);
    expect(report.notes.some(item => /sem dados|nenhuma comparação/i.test(item))).toBe(true);
  });

  it('escapes CSV cells and keeps the simulated origin and tariff', () => {
    expect(analyticsService).toBeDefined();
    const reading: Reading = {
      id: 'r-1',
      deviceId: 'computers',
      intervalStart: DEMO_PERIOD.from,
      intervalEnd: '2026-10-12T01:00:00.000Z',
      energyKWh: 0.25,
      source: 'simulated',
    };
    const label: Device = {
      id: 'computers',
      environmentId: 'lab',
      name: 'Ambiente "Laboratório"',
      nominalPowerW: 1200,
    };
    const csv = analyticsService!.exportCsv({
      readings: [reading],
      devices: [label],
      tariffBrlPerKWh: 1.23,
    });

    expect(csv).toContain('periodo');
    expect(csv).toContain('simulated');
    expect(csv).toContain('1.23');
    expect(csv).toContain('"Ambiente ""Laboratório"""');
  });
});
