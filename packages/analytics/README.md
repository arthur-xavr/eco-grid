# Parte 3 — análises e relatórios

Implemente AnalyticsService em src/index.ts e exporte a instância analyticsService.
A API já seleciona as leituras, aplica filtros e chama analyze/exportCsv.
Não altere apps/api/src/database.ts nem consulte SQLite aqui.

Antes de implementar, defina nos testes a regra de alerta (limiar e período),
a comparação com o período anterior e o comportamento com cobertura incompleta.
Não anuncie economia real sem uma linha de base.
CSV: indicar origem simulada, unidades, tarifa e período; escapar aspas, quebras
de linha e células que começam com =, +, - ou @ para evitar fórmulas.
Adicione a tela em apps/web/src/features/analytics.
As rotas retornam 501 enquanto analyticsService for undefined.
