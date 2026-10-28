import type { AnalyticsResult, Device, Reading } from '@ecogrid/contracts';

export interface AnalyticsService {
  analyze(input: { readings: Reading[]; devices: Device[]; tariffBrlPerKWh: number }): AnalyticsResult;
  exportCsv(input: { readings: Reading[]; devices: Device[]; tariffBrlPerKWh: number }): string;
}

const DEMO_ALERT_MULTIPLIER = 1.25;

function formatNumber(value: number): number {
  return Number(value.toFixed(3));
}

function escapeCsvValue(value: string | number | null | undefined): string {
  const text = String(value ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/"/g, '""');
  const sanitized = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n]/.test(sanitized) ? `"${sanitized}"` : sanitized;
}

class AnalyticsServiceImpl implements AnalyticsService {
  analyze({ readings, devices, tariffBrlPerKWh }: { readings: Reading[]; devices: Device[]; tariffBrlPerKWh: number }): AnalyticsResult {
    const deviceMap = new Map(devices.map(device => [device.id, device]));
    const totalsByDevice = new Map<string, number>();
    const totalsByEnvironment = new Map<string, number>();

    for (const reading of readings) {
      if (!deviceMap.has(reading.deviceId)) continue;
      const previous = totalsByDevice.get(reading.deviceId) ?? 0;
      const energy = previous + reading.energyKWh;
      totalsByDevice.set(reading.deviceId, energy);
      const environmentId = deviceMap.get(reading.deviceId)!.environmentId;
      totalsByEnvironment.set(environmentId, (totalsByEnvironment.get(environmentId) ?? 0) + reading.energyKWh);
    }

    const allDeviceTotals = [...totalsByDevice.values()];
    const environmentTotals = [...totalsByEnvironment.entries()].sort((left, right) => right[1] - left[1]);
    const averageDeviceTotal = allDeviceTotals.length ? allDeviceTotals.reduce((sum, value) => sum + value, 0) / allDeviceTotals.length : 0;

    const alerts = [...totalsByDevice.entries()]
      .filter(([_, total]) => averageDeviceTotal > 0 && total > averageDeviceTotal * DEMO_ALERT_MULTIPLIER)
      .map(([deviceId, total]) => ({
        deviceId,
        message: `Limite demonstrativo: consumo de ${formatNumber(total)} kWh excede 1.25x da média do período (${formatNumber(averageDeviceTotal)} kWh).`,
      }));

    const notes: string[] = [];

    if (!readings.length) {
      notes.push('Sem dados no período selecionado. Nenhuma comparação de consumo ou economia é válida.');
      return { source: 'simulated', alerts: [], notes };
    }

    if (environmentTotals.length > 1) {
      const [highestEnvironmentId, highestEnvironmentValue] = environmentTotals[0];
      const lowestEnvironmentValue = environmentTotals.at(-1)?.[1] ?? highestEnvironmentValue;
      const difference = highestEnvironmentValue - lowestEnvironmentValue;
      notes.push(`Comparação entre ambientes no período selecionado: ${environmentTotals.map(([environmentId, value]) => `${environmentId}=${formatNumber(value)} kWh`).join(' | ')}. O ambiente ${highestEnvironmentId} registrou o maior consumo.`);
      notes.push(`Diferença demonstrativa entre os ambientes: ${formatNumber(difference)} kWh. Sem referência válida de comparação, não há ganho ou perda declarada.`);
    } else {
      notes.push('Comparação entre ambientes no período selecionado: apenas um ambiente está presente neste filtro.');
    }

    notes.push(`Regra de alerta demonstrativa: o consumo de um equipamento acima de ${DEMO_ALERT_MULTIPLIER}x a média do período gera alerta; isso não representa uma melhoria operacional validada sem referência anterior.`);

    const costPreview = readings.length ? Number((allDeviceTotals.reduce((sum, value) => sum + value, 0) * tariffBrlPerKWh).toFixed(2)) : null;
    if (costPreview !== null) {
      notes.push(`Tarifa aplicada no cálculo: R$ ${Number(tariffBrlPerKWh).toFixed(2)} por kWh. Custo estimado do período: R$ ${costPreview.toFixed(2)}.`);
    }

    return { source: 'simulated', alerts, notes };
  }

  exportCsv({ readings, devices, tariffBrlPerKWh }: { readings: Reading[]; devices: Device[]; tariffBrlPerKWh: number }): string {
    const deviceMap = new Map(devices.map(device => [device.id, device]));
    const rows: string[][] = [['periodo_inicio', 'periodo_fim', 'ambiente', 'equipamento', 'consumo_kwh', 'tarifa_brl_por_kwh', 'origem_simulada']];
    const orderedReadings = [...readings].sort((left, right) => Date.parse(left.intervalStart) - Date.parse(right.intervalStart));
    const periodStart = orderedReadings[0]?.intervalStart ?? '';
    const periodEnd = orderedReadings.at(-1)?.intervalEnd ?? '';

    for (const reading of orderedReadings) {
      const device = deviceMap.get(reading.deviceId) ?? {
        id: reading.deviceId,
        environmentId: 'ambiente-desconhecido',
        name: reading.deviceId,
        nominalPowerW: 0,
      };

      rows.push([
        escapeCsvValue(periodStart),
        escapeCsvValue(periodEnd),
        escapeCsvValue(device.environmentId),
        escapeCsvValue(device.name),
        escapeCsvValue(formatNumber(reading.energyKWh)),
        escapeCsvValue(Number(tariffBrlPerKWh).toFixed(2)),
        escapeCsvValue('simulated'),
      ]);
    }

    return rows.map(row => row.join(',')).join('\n') + '\n';
  }
}

export const analyticsService: AnalyticsService = new AnalyticsServiceImpl();
