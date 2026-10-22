# Parte 2 — Dashboard Eco Grid (PIE, 4º período)

## Responsabilidade e limites
Esta entrega altera somente o frontend do dashboard. API, SQLite, simulador, contratos e módulo Analytics permanecem sob responsabilidade dos outros integrantes. A landing page estática foi preservada.

## Funcionalidades entregues
- Visão geral com consumo (kWh), custo estimado (R$), cobertura e quantidade de dispositivos.
- Filtros de ambiente, datas UTC (fim exclusivo) e tarifa fictícia.
- Inventário ilustrativo com potência nominal por dispositivo e ambiente.
- Tratamento de carregamento, erros, período vazio e tentativa de reconexão.
- Indicador visual acessível de cobertura dos dados.
- Identificação explícita dos dados simulados.

## Fontes de dados
- `GET /api/v1/environments` e `GET /api/v1/summary`: dados da API local já existente.
- `demoDevices` e `demoEnvironments` de `@ecogrid/contracts`: catálogo fictício, sem telemetria em tempo real.
- Tarifa de R$ 0,80/kWh: valor ilustrativo editável, não tarifa oficial.
- Nenhum cálculo de economia real foi implementado, pois não existe medição antes/depois validada.

## Execução
Requer Node.js 24.
```bash
npm ci
npm run db:seed
npm run dev
```
Acesse http://localhost:5173. Para validação: `npm run check`, `npm test` e `npm run build`.

## Roteiro de demonstração
1. Mostrar o aviso de dados simulados.
2. Explicar os quatro indicadores e sua origem.
3. Alterar o filtro para laboratório e aplicar.
4. Alterar a tarifa e demonstrar a estimativa financeira.
5. Mostrar a lista de dispositivos e diferenciar potência nominal (W) de energia (kWh).
6. Selecionar período sem leituras e explicar o estado vazio.
7. Explicar que hardware, economia pós-implantação e automações são evolução futura.

## Critérios de aceite para revisão
- Filtros alteram a consulta à API, não valores fictícios inseridos no componente.
- Estados de carregamento, erro e ausência de dados são legíveis.
- Não há alterações em `apps/api`, `packages/contracts`, `packages/simulator` ou `packages/analytics`.
- Os três comandos de validação passam em ambiente local.
- Revisão humana antes do merge.

## Pendências fora do escopo
- Gráfico histórico real: exige endpoint de séries temporais/leituras.
- Relatórios e exportação CSV: Parte 3.
- Integração física de IoT: roadmap futuro.
- Resultados de economia: somente após linha de base e medições reais.
