import type { AnalyticsResult, Device, Reading } from '@ecogrid/contracts';

export interface AnalyticsService {
  analyze(input: { readings: Reading[]; devices: Device[]; tariffBrlPerKWh: number }): AnalyticsResult;
  exportCsv(input: { readings: Reading[]; devices: Device[]; tariffBrlPerKWh: number }): string;
}
// Contributor 3 replaces undefined with an implementation of this interface.
// API handlers already load the selected readings; no database access is needed here.
export const analyticsService: AnalyticsService | undefined = undefined;
