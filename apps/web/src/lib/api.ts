import type { Environment, Summary } from '@ecogrid/contracts';
export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });
  if (!response.ok) throw new Error('Não foi possível consultar a API. Verifique se ela está em execução e se o período é válido.');
  return response.json() as Promise<T>;
}
export const api = {
  environments: (signal?: AbortSignal) => getJson<Environment[]>('/api/v1/environments', signal),
  summary: (query: URLSearchParams, signal?: AbortSignal) => getJson<Summary>('/api/v1/summary?' + query, signal),
};
