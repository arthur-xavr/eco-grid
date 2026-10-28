import { useEffect, useState, useMemo } from 'react';
import { 
  DEMO_PERIOD, 
  demoDevices, 
  demoEnvironments, 
  type Environment, 
  type Summary, 
  type AnalyticsResult,
  type Reading
} from '@ecogrid/contracts';
import { api } from '../../lib/api';

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const numeric = (value: number, digits = 2) => value.toLocaleString('pt-BR', { maximumFractionDigits: digits });
const inputStyle = 'mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm';
const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';

// Funções de Fuso Horário (Requisito 4)
const SAO_PAULO_TZ = 'America/Sao_Paulo';

function toUTCFromSaoPaulo(dateString: string): string {
  return new Date(`${dateString}T00:00:00-03:00`).toISOString();
}

function formatDateToSaoPaulo(utcString: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TZ,
    day: '2-digit',
    month: '2-digit'
  }).format(new Date(utcString));
}

export function Dashboard() {
  const [environments, setEnvironments] = useState<Environment[]>(demoEnvironments);
  const [environmentId, setEnvironmentId] = useState('');
  const [from, setFrom] = useState(DEMO_PERIOD.from.slice(0, 10));
  const [to, setTo] = useState(DEMO_PERIOD.to.slice(0, 10));
  const [tariff, setTariff] = useState('0.80');
  const [revision, setRevision] = useState(0);
  
  const [summary, setSummary] = useState<Summary | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setSummary(null); setReadings([]); setAnalytics(null);
    
    // REQUISITO 4: Convertendo os limites para UTC
    const fromUtc = toUTCFromSaoPaulo(from);
    const toUtc = toUTCFromSaoPaulo(to); 

    const query = new URLSearchParams({ 
      from: fromUtc, 
      to: toUtc, 
      tariffBrlPerKWh: tariff 
    });
    if (environmentId) query.set('environmentId', environmentId);

    Promise.all([
      api.environments(controller.signal), 
      api.summary(query, controller.signal),
      api.analytics(query, controller.signal),
      api.readings(query, controller.signal) // Adicionado aqui para buscar os dados brutos
    ])
      .then(([items, result, analyticsResult, readingsResult]) => { 
        if (!controller.signal.aborted) { 
          setEnvironments(items); 
          setSummary(result); 
          setAnalytics(analyticsResult); 
          setReadings(readingsResult);
        } 
      })
      .catch((failure: Error) => { 
        if (!controller.signal.aborted) setError(failure.message); 
      })
      .finally(() => { 
        if (!controller.signal.aborted) setLoading(false); 
      });
      
    return () => controller.abort();
  }, [environmentId, from, to, tariff, revision]);

  // REQUISITO 1: Processamento do Gráfico por Dia
  const dailyData = useMemo(() => {
    const grouped: Record<string, number> = {};
    readings.forEach(r => {
      // Usa a data de início do intervalo da leitura e formata para o fuso de SP
      const day = formatDateToSaoPaulo(r.intervalStart);
      grouped[day] = (grouped[day] || 0) + r.energyKWh;
    });
    return Object.entries(grouped)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [readings]);

  // REQUISITO 2: Processamento do Gráfico por Equipamento
  const deviceData = useMemo(() => {
    const grouped: Record<string, number> = {};
    readings.forEach(r => {
      const dev = demoDevices.find(d => d.id === r.deviceId);
      const name = dev ? dev.name : r.deviceId;
      grouped[name] = (grouped[name] || 0) + r.energyKWh;
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Ordena do maior para o menor
  }, [readings]);

  const selectedDevices = demoDevices.filter(device => !environmentId || device.environmentId === environmentId);
  const nominalPower = selectedDevices.reduce((total, device) => total + device.nominalPowerW, 0);
  const coverage = summary?.coveragePercent ?? 0;

  return <section aria-labelledby="dashboard-heading" className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-widest text-primary">Centro de gestão energética</p><h2 id="dashboard-heading" className="mt-1 text-3xl font-bold">Visão geral</h2><p className="mt-2 text-sm text-muted">Acompanhe consumo, custo estimado e cobertura das leituras.</p></div>
      {/* REQUISITO 6: Aviso de dados simulados */}
      <span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-bold text-amber-900">⚠️ Dados simulados para demonstração</span>
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
        <label className="text-sm font-semibold">Data inicial<input className={inputStyle} type="date" name="from" defaultValue={from} required/></label>
        <label className="text-sm font-semibold">Data final<input className={inputStyle} type="date" name="to" defaultValue={to} required/></label>
        <label className="text-sm font-semibold">Tarifa fictícia (R$/kWh)<input className={inputStyle} type="number" min="0" max="100" step="0.01" name="tariff" defaultValue={tariff} required/></label>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted">Fuso horário: São Paulo (UTC-3).</p><button type="submit" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white">Atualizar indicadores</button></div>
    </form>

    {/* REQUISITO 5: Tratamento de carregamento e erro */}
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

      {/* REQUISITO 1 e 2: Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <article className={card}>
          <h3 className="text-lg font-bold">Consumo por dia</h3>
          <p className="mt-1 text-sm text-muted">Agrupado no fuso de São Paulo.</p>
          <div className="mt-6 h-64 flex items-end gap-2 overflow-x-auto pb-2">
            {dailyData.length === 0 ? (
              <p className="text-sm text-muted w-full text-center my-auto">Sem dados para o período</p>
            ) : (
              dailyData.map((d, i) => {
                const maxVal = Math.max(...dailyData.map(x => x.value)) || 1;
                const height = (d.value / maxVal) * 100;
                return (
                  <div key={i} className="flex flex-col items-center flex-1 min-w-[40px]">
                    <div className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-all relative group" style={{ height: `${height}%` }}>
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{d.value.toFixed(1)} kWh</span>
                    </div>
                    <span className="text-[10px] text-muted mt-2 rotate-45 sm:rotate-0 origin-left">{d.date}</span>
                  </div>
                );
              })
            )}
          </div>
        </article>

        <article className={card}>
          <h3 className="text-lg font-bold">Consumo por equipamento</h3>
          <p className="mt-1 text-sm text-muted">Detalhamento do ambiente selecionado.</p>
          <div className="mt-6 h-64 flex flex-col justify-center gap-4 overflow-y-auto">
            {deviceData.length === 0 ? (
              <p className="text-sm text-muted w-full text-center">Sem dados para o período</p>
            ) : (
              deviceData.map((d, i) => {
                const maxVal = Math.max(...deviceData.map(x => x.value)) || 1;
                const width = (d.value / maxVal) * 100;
                return (
                  <div key={i} className="w-full">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold">{d.name}</span>
                      <span className="text-muted">{d.value.toFixed(2)} kWh</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className={card + ' lg:col-span-2'}>
          <h3 className="text-lg font-bold">Qualidade dos dados recebidos</h3><p className="mt-1 text-sm text-muted">Cobertura das leituras esperadas no período selecionado.</p>
          <div className="mt-8 h-5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Cobertura de leituras" aria-valuenow={Math.max(0, Math.min(100, coverage))} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-primary transition-all" style={{ width: Math.max(0, Math.min(100, coverage)) + '%' }}/></div>
          <p className="mt-5 text-sm text-muted">{summary.energyKWh === null ? 'Não há leituras neste intervalo. Nenhum consumo ou custo é estimado.' : 'Consumo calculado pela API usando apenas as leituras registradas.'}</p>
          
          {/* Exibindo as notas geradas pelo seu serviço de Analytics */}
          {analytics?.notes && analytics.notes.length > 0 && (
            <ul className="mt-4 list-disc pl-5 text-sm text-slate-600">
              {analytics.notes.map((note, i) => <li key={i}>{note}</li>)}
            </ul>
          )}
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