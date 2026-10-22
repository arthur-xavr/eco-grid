import { Type, type Static } from '@sinclair/typebox';

const Id = Type.String({ minLength: 1, maxLength: 80, pattern: '^[a-zA-Z0-9_-]+$' });
const Timestamp = Type.String({ format: 'date-time' });
const options = { additionalProperties: false } as const;
export const EnvironmentSchema = Type.Object({ id: Id, name: Type.String() }, options);
export const DeviceSchema = Type.Object({
  id: Id, environmentId: Id, name: Type.String(), nominalPowerW: Type.Number({ minimum: 0 }),
}, options);
export const ReadingSchema = Type.Object({
  id: Id, deviceId: Id, intervalStart: Timestamp, intervalEnd: Timestamp,
  energyKWh: Type.Number({ minimum: 0 }), source: Type.Literal('simulated'),
}, options);
export const ErrorSchema = Type.Object({
  code: Type.String(), message: Type.String(), details: Type.Array(Type.String()),
}, options);
export const PeriodQuerySchema = Type.Object({
  environmentId: Type.Optional(Id), from: Timestamp, to: Timestamp,
}, options);
export const SummaryQuerySchema = Type.Object({
  ...PeriodQuerySchema.properties,
  tariffBrlPerKWh: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
}, options);
export const SummarySchema = Type.Object({
  source: Type.Literal('simulated'), from: Timestamp, to: Timestamp,
  energyKWh: Type.Union([Type.Number(), Type.Null()]),
  estimatedCostBrl: Type.Union([Type.Number(), Type.Null()]),
  tariffBrlPerKWh: Type.Number(), readingCount: Type.Integer(),
  expectedReadingCount: Type.Integer(), coveragePercent: Type.Number(),
}, options);
export const AnalyticsSchema = Type.Object({
  source: Type.Literal('simulated'),
  alerts: Type.Array(Type.Object({ deviceId: Id, message: Type.String() }, options)),
  notes: Type.Array(Type.String()),
}, options);
export type Environment = Static<typeof EnvironmentSchema>;
export type Device = Static<typeof DeviceSchema>;
export type Reading = Static<typeof ReadingSchema>;
export type PeriodQuery = Static<typeof PeriodQuerySchema>;
export type SummaryQuery = Static<typeof SummaryQuerySchema>;
export type Summary = Static<typeof SummarySchema>;
export type AnalyticsResult = Static<typeof AnalyticsSchema>;

export const DEMO_PERIOD = { from: '2026-10-12T00:00:00.000Z', to: '2026-10-19T00:00:00.000Z' };
export const demoEnvironments: Environment[] = [
  { id: 'lab', name: 'Laboratório de informática' },
  { id: 'classroom', name: 'Sala de aula' },
];
export const demoDevices: Device[] = [
  { id: 'computers', environmentId: 'lab', name: 'Computadores', nominalPowerW: 1200 },
  { id: 'lab-lights', environmentId: 'lab', name: 'Iluminação do laboratório', nominalPowerW: 180 },
  { id: 'air-conditioner', environmentId: 'classroom', name: 'Ar-condicionado', nominalPowerW: 1800 },
  { id: 'classroom-lights', environmentId: 'classroom', name: 'Iluminação da sala', nominalPowerW: 120 },
];
// These examples are fixtures for independent frontend development, not sensor readings.
export const demoReadings: Reading[] = [{
  id: 'example-1', deviceId: 'computers', intervalStart: DEMO_PERIOD.from,
  intervalEnd: '2026-10-12T01:00:00.000Z', energyKWh: 0.25, source: 'simulated',
}];
