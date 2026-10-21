import { useState } from 'react';
import { Dashboard } from './features/dashboard';
import { Analytics } from './features/analytics';
export function App() {
  const [view, setView] = useState<'dashboard' | 'analytics'>('dashboard');
  return <div className="mx-auto min-h-screen max-w-7xl px-5 py-7 sm:px-10">
    <header className="mb-10 flex flex-wrap items-center justify-between gap-5 border-b border-slate-200 pb-6">
      <div className="flex items-center gap-3"><span aria-hidden="true" className="rounded-xl bg-primary px-3 py-2 text-xl text-white">ϟ</span>
        <div><h1 className="text-xl font-bold tracking-tight">Eco Grid</h1><p className="text-xs text-muted">PIE · ADS · 4º período</p></div></div>
      <span className="text-sm text-muted">Energia em foco. Aprendizado em prática.</span>
    </header>
    <nav aria-label="Módulos" className="mb-8 flex w-fit gap-1 rounded-full border border-slate-200 bg-white p-1">
      {([['dashboard', 'Visão geral'], ['analytics', 'Análises']] as const).map(([key, label]) =>
        <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)}
          className={'rounded-full px-5 py-2 text-sm font-semibold ' + (view === key ? 'bg-primary text-white' : 'text-muted hover:bg-surface')}>{label}</button>)}
    </nav>
    <main>{view === 'dashboard' ? <Dashboard/> : <Analytics/>}</main>
    <footer className="mt-12 border-t border-slate-200 py-6 text-xs leading-6 text-muted">Protótipo acadêmico com dados simulados. Hardware, automação e HubControl pertencem a etapas futuras.</footer>
  </div>;
}
