PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS environments (
  id TEXT PRIMARY KEY, name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY, environment_id TEXT NOT NULL REFERENCES environments(id),
  name TEXT NOT NULL, nominal_power_w REAL NOT NULL CHECK(nominal_power_w >= 0)
);
CREATE TABLE IF NOT EXISTS readings (
  id TEXT PRIMARY KEY, device_id TEXT NOT NULL REFERENCES devices(id),
  interval_start TEXT NOT NULL, interval_end TEXT NOT NULL,
  energy_wh INTEGER NOT NULL CHECK(energy_wh >= 0),
  source TEXT NOT NULL CHECK(source = 'simulated'),
  UNIQUE(device_id, interval_start), CHECK(interval_end > interval_start)
);
CREATE INDEX IF NOT EXISTS readings_period ON readings(interval_start, device_id);
PRAGMA user_version = 1;
