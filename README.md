# Eco Grid — PIE ADS · 4º período

Monitoramento energético acadêmico **com dados simulados**.

Este repositório contém dois artefatos:
- **Protótipo anterior:** index.html, css/ e js/, preservados nesta evolução.
  Os gráficos usam arrays fixos. Rótulos "ao vivo" e percentuais são ilustrativos.
- **Sistema deste semestre:** apps/ e packages/, com API, SQLite e tela inicial
  de integração. Dashboard completo e análises serão contribuídos pelos colegas.

HubControl, sensores, ESP32, MQTT, automação e IA são visão futura.
Nenhuma economia energética real foi medida por esta base.

## Executar a base deste semestre

Requisito: Node.js 24 (inclui SQLite embutido; pode emitir aviso experimental).

```sh
git clone https://github.com/castrokenedy/eco-grid.git
cd eco-grid
git switch codex/bootstrap
npm ci
npm run db:seed
npm run dev
```

Abra http://localhost:5173. API: http://127.0.0.1:3001/api/v1/health.
Contrato OpenAPI: http://127.0.0.1:3001/api/openapi.json.
Se a branch inicial já tiver sido mesclada, use main.
A API é local e sem autenticação; não foi publicada como serviço.

A seed cria 2 ambientes, 4 equipamentos e 672 leituras horárias, com semente 42,
de **12/10/2026 00:00 UTC a 19/10/2026 00:00 UTC (fim exclusivo)**.
Repetir a seed não duplica os registros.
Sem executar a seed, a API sobe vazia e a tela informa ausência de dados.
Tarifa padrão fictícia: R$ 0,80/kWh, ajustável na consulta.
Filtros aceitam horas completas e no máximo 31 dias.
O banco local é apps/api/data/ecogrid.sqlite e fica fora do Git.

```sh
npm run check
npm test
npm run build
```

O build gera a interface em apps/web/dist. Uma implantação futura precisa
configurar proxy para a API; GitHub Pages sozinho não executa Node/SQLite.
O protótipo estático na raiz continua independente desse build.

## Divisão da equipe

| Parte | Entrega | Estado desta branch |
|---|---|---|
| 1 | API, banco, simulação e contratos | Base inicial |
| 2 | Dashboard e gráficos | Tela de integração e espaço para contribuição |
| 3 | Análises, alertas e CSV | Interface definida; rotas retornam 501 |

Nomes e distribuição pessoal: confirmar com o grupo.
Detalhes: [plano e critérios de aceite](docs/semester-plan.md),
[contribuição](CONTRIBUTING.md), [Parte 3](packages/analytics/README.md).

## Estrutura

```text
index.html, css/, js/      protótipo público preservado
apps/api/                 Fastify, SQLite, migrações e testes
apps/web/                 React + Vite, tela inicial
packages/contracts/       tipos, schemas e exemplos comuns
packages/simulator/       gerador determinístico
packages/analytics/       contrato a implementar pelo integrante 3
docs/                     diagnóstico, arquitetura e escopo
```

Os dados são fictícios. Estimativas de custo não equivalem a faturas.
O escopo técnico atual está documentado; não há integração com hardware.
