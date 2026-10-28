import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { DEMO_PERIOD, demoDevices, demoEnvironments, type AnalyticsResult, type Environment } from '@ecogrid/contracts';
import { api } from '../../lib/api';

const inputStyle = 'mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm';
const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';

export function Analytics() {
  const [environments, setEnvironments] = useState<Environment[]>(demoEnvironments);
  const [environmentId, setEnvironmentId] = useState('');
  const [from, setFrom] = useState(DEMO_PERIOD.from.slice(0, 10));
  const [to, setTo] = useState(DEMO_PERIOD.to.slice(0, 10));
  const [tariff, setTariff] = useState('0.80');
  const [result, setResult] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');

    const query = new URLSearchParams({ from: from + 'T00:00:00.000Z', to: to + 'T00:00:00.000Z', tariffBrlPerKWh: tariff });
    if (environmentId) query.set('environmentId', environmentId);

    Promise.all([api.environments(controller.signal), api.analytics(query, controller.signal)])
      .then(([items, response]) => {
        if (!controller.signal.aborted) {
          setEnvironments(items);
          setResult(response);
        }
      })
      .catch((failure: Error) => {
        if (!controller.signal.aborted) setError(failure.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [environmentId, from, to, tariff]);

  const selectedDevices = useMemo(
    () => demoDevices.filter(device => !environmentId || device.environmentId === environmentId),
    [environmentId],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextFrom = String(data.get('from'));
    const nextTo = String(data.get('to'));
    const nextTariff = String(data.get('tariff'));
    const nextEnvironment = String(data.get('environmentId'));
    const days = (Date.parse(nextTo + 'T00:00:00Z') - Date.parse(nextFrom + 'T00:00:00Z')) / 86400000;

    if (!(days > 0 && days <= 31) || !Number.isFinite(Number(nextTariff)) || Number(nextTariff) < 0 || Number(nextTariff) > 100) {
      setError('Escolha um período maior que zero e de até 31 dias, com tarifa entre 0 e 100.');
      return;
    }

    setEnvironmentId(nextEnvironment);
    setFrom(nextFrom);
    setTo(nextTo);
    setTariff(nextTariff);
  };

  const handleDownload = () => {
    const query = new URLSearchParams({ from: from + 'T00:00:00.000Z', to: to + 'T00:00:00.000Z', tariffBrlPerKWh: tariff });
    if (environmentId) query.set('environmentId', environmentId);
    api.downloadCsv(query);
  };

  return <section aria-labelledby="analytics-heading" className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Análises e relatórios</p>
        <h2 id="analytics-heading" className="mt-1 text-3xl font-bold">Comparação e alertas</h2>
      </div>
      <button type="button" onClick={handleDownload} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white">Baixar relatório CSV</button>
    </div>

    <form className={card} onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-semibold">Ambiente<select className={inputStyle} name="environmentId" defaultValue={environmentId}><option value="">Todos os ambientes</option>{environments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Data inicial (UTC)<input className={inputStyle} type="date" name="from" defaultValue={from} required/></label>
        <label className="text-sm font-semibold">Data final exclusiva (UTC)<input className={inputStyle} type="date" name="to" defaultValue={to} required/></label>
        <label className="text-sm font-semibold">Tarifa fictícia (R$/kWh)<input className={inputStyle} type="number" min="0" max="100" step="0.01" name="tariff" defaultValue={tariff} required/></label>
      </div>
      <div className="mt-4 flex justify-end">
        <button type="submit" className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">Atualizar análise</button>
      </div>
    </form>

    {loading && <p role="status" className={card}>Carregando análise do período…</p>}
    {error && <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm">{error}</div>}

    {result && <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
      <section className={card}>
        <h3 className="text-lg font-bold">Notas da análise</h3>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
          {result.notes.map((note, index) => <li key={index} className="rounded-xl bg-slate-50 p-3">{note}</li>)}
        </ul>
      </section>
      <aside className={card}>
        <h3 className="text-lg font-bold">Alertas demonstrativos</h3>
        {result.alerts.length === 0 ? <p className="mt-4 text-sm text-muted">Nenhum alerta no período atual para os critérios demonstrativos.</p> : <ul className="mt-4 space-y-3 text-sm">
          {result.alerts.map(alert => <li key={alert.deviceId} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">{alert.message}</li>)}
        </ul>}
      </aside>
    </div>}

    <section className={card}>
      <h3 className="text-lg font-bold">Ambientes no filtro</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {selectedDevices.length === 0 ? <p className="text-sm text-muted">Sem equipamentos para o ambiente selecionado.</p> : selectedDevices.map(device => <div key={device.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="font-semibold">{device.name}</p>
          <p className="mt-1 text-xs text-muted">{device.environmentId}</p>
        </div>)}
      </div>
    </section>
  </section>;
}
