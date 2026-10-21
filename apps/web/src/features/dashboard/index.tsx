import { useEffect, useState } from 'react';
import { DEMO_PERIOD, type Environment, type Summary } from '@ecogrid/contracts';
import { api } from '../../lib/api';
const fieldClass = 'mt-2 block w-full rounded-xl border border-slate-200 bg-white p-3 text-sm';
const number = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
export function Dashboard() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [environmentId, setEnvironmentId] = useState('');
  const [from, setFrom] = useState(DEMO_PERIOD.from.slice(0, 10));
  const [to, setTo] = useState(DEMO_PERIOD.to.slice(0, 10));
  const [tariff, setTariff] = useState('0.80');
  const [revision, setRevision] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setSummary(null);
    const query = new URLSearchParams({ from: from + 'T00:00:00.000Z', to: to + 'T00:00:00.000Z', tariffBrlPerKWh: tariff });
    if (environmentId) query.set('environmentId', environmentId);
    Promise.all([api.environments(controller.signal), api.summary(query, controller.signal)])
      .then(([items, result]) => { if (!controller.signal.aborted) { setEnvironments(items); setSummary(result); } })
      .catch((failure: Error) => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [environmentId, from, to, tariff, revision]);
  return <section aria-labelledby="dashboard-heading">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Parte 1 · verificação da base</p>
        <h2 id="dashboard-heading" className="text-2xl font-semibold">Seu ponto de partida</h2></div>
      <span className="rounded-full bg-success-soft px-4 py-2 text-xs font-semibold text-primary">Dados simulados</span>
    </div>
    <form className="mb-6 rounded-2xl border border-slate-200 bg-white p-6" onSubmit={event => { event.preventDefault(); const fields = new FormData(event.currentTarget); setEnvironmentId(String(fields.get('environmentId'))); setFrom(String(fields.get('from'))); setTo(String(fields.get('to'))); setTariff(String(fields.get('tariff'))); setRevision(value => value + 1); }}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-semibold">Ambiente<select className={fieldClass} name="environmentId" defaultValue={environmentId}>
          <option value="">Todos os ambientes</option>{environments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        <label className="text-sm font-semibold">Início (UTC)<input className={fieldClass} type="date" name="from" required defaultValue={from}/></label>
        <label className="text-sm font-semibold">Fim exclusivo (UTC)<input className={fieldClass} type="date" name="to" required defaultValue={to}/></label>
        <label className="text-sm font-semibold">Tarifa estimada (R$/kWh)<input className={fieldClass} type="number" min="0" max="100" step="0.01" name="tariff" required defaultValue={tariff}/></label>
      </div>
      <p className="mt-4 text-xs leading-5 text-muted">Carga de exemplo: 12 a 19 de outubro de 2026, em UTC. O fim não é incluído. Esta tela técnica de integração será evoluída na Parte 2; a apresentação final usará o fuso de São Paulo.</p>
      <button type="submit" className="mt-4 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white">Aplicar filtros</button>
    </form>
    {loading && <p role="status" className="rounded-2xl border border-slate-200 bg-white p-6">Consultando a base de demonstração…</p>}
    {error && <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-6"><p>{error}</p><button className="mt-4 rounded-xl bg-primary px-4 py-2 font-semibold text-white" onClick={() => setRevision(value => value + 1)}>Tentar novamente</button></div>}
    {summary && <div aria-live="polite">
      {summary.energyKWh === null && <p className="mb-4 rounded-xl bg-amber-50 p-4">Sem leituras neste período. Não é possível estimar o consumo.</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        {[['Consumo registrado', summary.energyKWh === null ? 'Sem dados' : number(summary.energyKWh) + ' kWh'],
          ['Custo estimado', summary.estimatedCostBrl === null ? 'Sem dados' : summary.estimatedCostBrl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
          ['Cobertura do período', number(summary.coveragePercent) + '%']].map(([label, value]) =>
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</h3><p className="mt-4 text-2xl font-bold">{value}</p>
          </article>)}
      </div>
      <p className="mt-4 text-sm text-muted">{summary.readingCount} de {summary.expectedReadingCount} leituras esperadas. O custo considera apenas as leituras disponíveis e não representa uma fatura.</p>
    </div>}
    <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-6">
      <h3 className="text-sm font-semibold">Espaço da Parte 2 — dashboard</h3>
      <p className="mt-2 text-sm leading-6 text-muted">Acrescentar gráficos de histórico, comparação visual e navegação a partir dos contratos existentes. Esta entrega contém a conexão com a API, não o dashboard completo.</p>
    </div>
  </section>;
}
