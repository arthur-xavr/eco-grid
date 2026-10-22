import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { demoDevices, demoEnvironments, type Device, type PeriodQuery, type Reading } from '@ecogrid/contracts';
import { simulate } from '@ecogrid/simulator';

export class Store {
  readonly db: DatabaseSync;
  constructor(path = ':memory:') {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA foreign_keys = ON');
    const version = (this.db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
    if (version === 0) this.db.exec(readFileSync(new URL('../migrations/001_initial.sql', import.meta.url), 'utf8'));
    else if (version !== 1) throw new Error(`Unsupported database version: ${version}`);
  }
  seed() {
    const before = (this.db.prepare('SELECT COUNT(*) AS count FROM readings').get() as { count: number }).count;
    this.db.exec('BEGIN');
    try {
      const environment = this.db.prepare('INSERT OR IGNORE INTO environments VALUES (?, ?)');
      for (const item of demoEnvironments) environment.run(item.id, item.name);
      const device = this.db.prepare('INSERT OR IGNORE INTO devices VALUES (?, ?, ?, ?)');
      for (const item of demoDevices) device.run(item.id, item.environmentId, item.name, item.nominalPowerW);
      const reading = this.db.prepare('INSERT OR IGNORE INTO readings VALUES (?, ?, ?, ?, ?, ?)');
      for (const item of simulate()) reading.run(item.id, item.deviceId, item.intervalStart, item.intervalEnd,
        Math.round(item.energyKWh * 1000), item.source);
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    const after = (this.db.prepare('SELECT COUNT(*) AS count FROM readings').get() as { count: number }).count;
    return { inserted: after - before, total: after, seed: 42 };
  }
  environments() {
    return this.db.prepare('SELECT id, name FROM environments ORDER BY id').all();
  }
  devices(environmentId?: string): Device[] {
    return this.db.prepare(`SELECT id, environment_id AS environmentId, name, nominal_power_w AS nominalPowerW
      FROM devices WHERE (? IS NULL OR environment_id = ?) ORDER BY id`)
      .all(environmentId ?? null, environmentId ?? null) as unknown as Device[];
  }
  readings(query: PeriodQuery): Reading[] {
    return this.db.prepare(`SELECT r.id, r.device_id AS deviceId, r.interval_start AS intervalStart,
      r.interval_end AS intervalEnd, r.energy_wh / 1000.0 AS energyKWh, r.source
      FROM readings r JOIN devices d ON d.id = r.device_id
      WHERE r.interval_start >= ? AND r.interval_end <= ? AND (? IS NULL OR d.environment_id = ?)
      ORDER BY r.interval_start, r.device_id`)
      .all(query.from, query.to, query.environmentId ?? null, query.environmentId ?? null) as unknown as Reading[];
  }
  close() { this.db.close(); }
}
