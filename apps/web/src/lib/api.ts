import type { AnalyticsResult, Environment, Summary } from '@ecogrid/contracts';
export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });
  if (!response.ok) throw new Error('Não foi possível consultar a API. Verifique se ela está em execução e se o período é válido.');
  return response.json() as Promise<T>;
}
export const api = {
  environments: (signal?: AbortSignal) => getJson<Environment[]>('/api/v1/environments', signal),
  summary: (query: URLSearchParams, signal?: AbortSignal) => getJson<Summary>('/api/v1/summary?' + query, signal),
  analytics: (query: URLSearchParams, signal?: AbortSignal) => getJson<AnalyticsResult>('/api/v1/analytics?' + query, signal),
  readings: (query: URLSearchParams, signal?: AbortSignal) => getJson<Reading[]>('/api/v1/readings?' + query, signal),
  downloadCsv: (query: URLSearchParams) => {
    const url = '/api/v1/reports/consumption.csv?' + query;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'ecogrid-consumo-simulado.csv';
    anchor.target = '_blank';
    anchor.rel = 'noopener';
    anchor.click();
  },
};
