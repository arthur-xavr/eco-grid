import { demoDevices, DEMO_PERIOD, type Device, type Reading } from '@ecogrid/contracts';

// A stable hash per device/hour makes overlapping simulation runs reproducible.
function unitValue(key: string): number {
  let hash = 2166136261;
  for (const character of key) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0) / 4294967296;
}
export function simulate(
  seed = 42, devices: Device[] = demoDevices,
  from = DEMO_PERIOD.from, to = DEMO_PERIOD.to,
): Reading[] {
  const start = Date.parse(from), end = Date.parse(to);
  if (!Number.isSafeInteger(seed) || !Number.isFinite(start) || !Number.isFinite(end)
    || start >= end || start % 3600000 || end % 3600000 || end - start > 31 * 86400000) {
    throw new Error('Simulation requires an integer seed and an aligned period of at most 31 days.');
  }
  return devices.flatMap(device => {
    if (!Number.isFinite(device.nominalPowerW) || device.nominalPowerW < 0) throw new Error('Invalid power.');
    const readings: Reading[] = [];
    for (let time = start; time < end; time += 3600000) {
      const date = new Date(time);
      const localHour = (date.getUTCHours() + 21) % 24; // São Paulo demo: UTC-3.
      const active = localHour >= 8 && localHour < 18;
      const load = (active ? 0.55 : 0.08) + unitValue(`${seed}:${device.id}:${time}`) * (active ? 0.35 : 0.08);
      readings.push({
        id: `sim-${device.id}-${time}`, deviceId: device.id,
        intervalStart: date.toISOString(), intervalEnd: new Date(time + 3600000).toISOString(),
        energyKWh: Math.round(device.nominalPowerW * load) / 1000, source: 'simulated',
      });
    }
    return readings;
  });
}
