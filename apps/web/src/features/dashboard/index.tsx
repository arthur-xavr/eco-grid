import { useEffect, useState } from 'react';
import { DEMO_PERIOD, demoDevices, demoEnvironments, type Environment, type Summary } from '@ecogrid/contracts';
import { api } from '../../lib/api';

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const numeric = (value: number, digits = 2) => value.toLocaleString('pt-BR', { maximumFractionDigits: digits });
const inputStyle = 'mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm';
const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';

export function Dashboard() {
  const [environments, setEnvironments] = useState<Environment[]>(demoEnvironments);
  const [environmentId, setEnvironmentId] = useState('');
  const [from, setFrom] = useState(DEMO_PERIOD.from.slice(0, 10));
  const [to, setTo] = useState(DEMO_PERIOD.to.slice(0, 10));
  const [tariff, setTariff] = useState('0.80');
  const [revision, setRevision] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  const selectedDevices = demoDevices.filter(device => !environmentId || device.environmentId === environmentId);
  const nominalPower = selectedDevices.reduce((total, device) => total + device.nominalPowerW, 0);
  const coverage = summary?.coveragePercent ?? 0;
  return <section aria-labelledby="dashboard-heading" className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-widest text-primary">Centro de gestão energética</p><h2 id="dashboard-heading" className="mt-1 text-3xl font-bold">Visão geral</h2><p className="mt-2 text-sm text-muted">Acompanhe consumo, custo estimado e cobertura das leituras.</p></div>
      <span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-bold text-amber-900">Ambiente demonstrativo · dados simulados</span>
    </div>
    <form className={card} onSubmit={event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const nextFrom = String(data.get('from')), nextTo = String(data.get('to'));
      const nextTariff = String(data.get('tariff'));
      const days = (Date.parse(nextTo + 'T00:00:00Z') - Date.parse(nextFrom + 'T00:00:00Z')) / 86400000;
      if (!(days > 0 && days <= 31) || !Number.isFinite(Number(nextTariff)) || Number(nextTariff) < 0 || Number(nextTariff) > 100) {
        setError('Escolha um período maior que zero e de até 31 dias, com tarifa entre 0 e 100.'); return;
      }
      setEnvironmentId(String(data.get('environmentId'))); setFrom(nextFrom); setTo(nextTo); setTariff(nextTariff); setRevision(value => value + 1);
    }}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-semibold">Ambiente<select className={inputStyle} name="environmentId" defaultValue={environmentId}><option value="">Todos os ambientes</option>{environments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Data inicial (UTC)<input className={inputStyle} type="date" name="from" defaultValue={from} required/></label>
        <label className="text-sm font-semibold">Data final exclusiva (UTC)<input className={inputStyle} type="date" name="to" defaultValue={to} required/></label>
        <label className="text-sm font-semibold">Tarifa fictícia (R$/kWh)<input className={inputStyle} type="number" min="0" max="100" step="0.01" name="tariff" defaultValue={tariff} required/></label>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted">Intervalo de demonstração: 12–19/10/2026. Fim exclusivo.</p><button type="submit" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white">Atualizar indicadores</button></div>
    </form>
    {loading && <p role="status" className={card}>Carregando indicadores da API local…</p>}
    {error && <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-5"><p>{error}</p><button type="button" className="mt-3 rounded-lg bg-primary px-4 py-2 text-white" onClick={() => setRevision(v => v + 1)}>Tentar novamente</button></div>}
    {summary && <div aria-live="polite" className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Energia registrada', value: summary.energyKWh === null ? 'Sem dados' : numeric(summary.energyKWh) + ' kWh', hint: 'Leituras disponíveis' },
          { label: 'Custo estimado', value: summary.estimatedCostBrl === null ? 'Sem dados' : money(summary.estimatedCostBrl), hint: 'Não equivale à fatura' },
          { label: 'Cobertura', value: numeric(coverage, 1) + '%', hint: summary.readingCount + ' de ' + summary.expectedReadingCount + ' leituras' },
          { label: 'Equipamentos cadastrados', value: String(selectedDevices.length), hint: 'Cadastro de demonstração' },
        ].map(item => <article className={card} key={item.label}><h3 className="text-xs font-bold uppercase tracking-wider text-muted">{item.label}</h3><p className="mt-4 text-3xl font-bold">{item.value}</p><p className="mt-2 text-xs text-muted">{item.hint}</p></article>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <article className={card + ' lg:col-span-2'}>
          <h3 className="text-lg font-bold">Qualidade dos dados recebidos</h3><p className="mt-1 text-sm text-muted">Cobertura das leituras esperadas no período selecionado.</p>
          <div className="mt-8 h-5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Cobertura de leituras" aria-valuenow={Math.max(0, Math.min(100, coverage))} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-primary transition-all" style={{ width: Math.max(0, Math.min(100, coverage)) + '%' }}/></div>
          <p className="mt-5 text-sm text-muted">{summary.energyKWh === null ? 'Não há leituras neste intervalo. Nenhum consumo ou custo é estimado.' : 'Consumo calculado pela API usando apenas as leituras registradas.'}</p>
          <p className="mt-2 text-xs text-muted">Gráficos históricos detalhados dependem da API de séries temporais, prevista para a etapa de integração.</p>
        </article>
        <article className={card}><h3 className="text-lg font-bold">Potência nominal instalada</h3><p className="mt-5 text-4xl font-bold">{numeric(nominalPower / 1000)} <span className="text-lg">kW</span></p><p className="mt-3 text-sm text-muted">Soma das potências de cadastro, não representa consumo instantâneo medido.</p></article>
      </div>
    </div>}
    <section className={card} aria-labelledby="devices-heading">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 id="devices-heading" className="text-lg font-bold">Dispositivos e ambientes</h3><p className="mt-1 text-sm text-muted">Inventário ilustrativo dos equipamentos previstos no piloto.</p></div><span className="rounded-lg bg-slate-100 px-3 py-1 text-xs text-slate-700">Sem telemetria em tempo real</span></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[540px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-muted"><th className="pb-3">Equipamento</th><th className="pb-3">Ambiente</th><th className="pb-3">Potência nominal</th><th className="pb-3">Origem</th></tr></thead><tbody>{selectedDevices.map(device => <tr key={device.id} className="border-b border-slate-100"><td className="py-4 font-semibold">{device.name}</td><td>{demoEnvironments.find(env => env.id === device.environmentId)?.name ?? device.environmentId}</td><td>{numeric(device.nominalPowerW, 0)} W</td><td><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">Simulado</span></td></tr>)}</tbody></table></div>
    </section>
    <p className="text-xs leading-5 text-muted">Este painel demonstra o conceito Eco Grid com dados fictícios. Economia pós-implantação, dispositivos online/offline e automações reais exigem sensores e uma linha de base validada; não são resultados desta etapa.</p>
  </section>;
}
