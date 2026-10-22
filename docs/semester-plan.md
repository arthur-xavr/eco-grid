# Eco Grid — plano do semestre

## Estado verificado em 21/10/2026

Base: main, commit 0e34955 (histórico de 06/06/2026).
O repositório público continha README, index.html, css/style.css e js/main.js.
A interface usa Chart.js por CDN e arrays fixos; não há leitura de sensor,
persistência, backend ou testes na base. Percentuais de economia e rótulos
"ao vivo" do protótipo não comprovam resultados medidos.
O README anterior citava PDF ausente e fases futuras; essas alegações não são
evidência de implementação. O protótipo raiz foi preservado byte a byte.

## Escopo atual

MVP acadêmico para PIE ADS, 4º período: dados simulados, histórico energético,
ambientes e equipamentos fictícios, consumo em kWh, estimativa por tarifa,
dashboard, análises demonstrativas e relatório CSV. Sem prazo inventado.

ESP32, sensores reais, MQTT, comandos físicos, IA, SaaS/multitenancy e HubControl
são evolução futura, não entregas implementadas deste semestre.

## Três partes

| Parte | Diretórios sob responsabilidade | Entrega |
|---|---|---|
| 1 — base e dados | apps/api, packages/simulator | API, SQLite, migração, seed e testes |
| 2 — dashboard | apps/web/src/features/dashboard | filtros finais, gráficos, estados de tela e fuso local |
| 3 — análises | packages/analytics, apps/web/src/features/analytics | regras, comparações, alertas e CSV |

Os nomes dos integrantes e datas devem ser confirmados pelo grupo.
Cada parte deve funcionar com fixtures/contratos antes da integração.

## Arquitetura

React/Vite → HTTP /api/v1 → Fastify → SQLite local.
Simulador puro → seed → SQLite.
API → AnalyticsService (sem acesso ao banco).
A interface usa proxy local para /api. SQLite é acessado somente pelo servidor.
O banco local e node_modules não são versionados.

## Contratos

OpenAPI gerado: GET /api/openapi.json, com schemas do pacote contracts.
GET /api/v1/health e /environments não recebem filtros.
GET /devices aceita environmentId opcional.
GET /readings exige from e to; environmentId é opcional.
GET /summary, /analytics e /reports/consumption.csv aceitam os mesmos filtros
e tariffBrlPerKWh opcional (padrão 0,80, intervalo 0..100).

Datas ISO 8601 com offset são normalizadas em UTC antes da consulta.
Intervalo [from, to), alinhado a horas completas, máximo de 31 dias.
Cada leitura é energia do intervalo de uma hora, em kWh; não potência em kW.
Banco armazena Wh inteiros; soma convertida para kWh evita erro acumulado.
O simulador usa potência nominal fictícia × fração de carga × 1 hora.
IDs de dispositivo + hora são estáveis; UNIQUE impede duplicidade.
seed fixo 42 reproduz o cenário de 12/10/2026 a 19/10/2026 UTC.
A seed é idempotente e não sobrescreve registros existentes.

Resumo inclui quantidade recebida, esperada e cobertura.
Sem leituras: energyKWh e estimatedCostBrl são null; não zero.
Cobertura parcial: custo calculado somente para leituras disponíveis.
Estimativa = soma de kWh × tarifa; arredondamento monetário no final.
Não contempla bandeiras, impostos, demanda ou outros componentes de uma conta.

Erros: { code, message, details: [] }.
400: entrada/período inválido; 404: recurso/ambiente ausente; 429: limite;
501: módulo ainda não implementado; 500: falha interna sem detalhes sensíveis.
Módulo 3 retorna 501 até haver implementação, nunca dados inventados.
Mudança incompatível de contrato exige PR discutido com os três integrantes.

## Aceite e integração

1. Instalar com npm ci usando Node 24; npm run db:seed cria a base.
2. Repetir seed mantém 672 leituras, sem duplicação.
3. npm run dev inicia API e tela de integração.
4. Filtros alteram a consulta; período vazio informa ausência de leituras.
5. Testes verificam isolamento por ambiente, UTC/limites, soma e tarifa,
   persistência e reprodução do simulador.
6. Parte 2: gráficos e filtros corretos; estados vazio/erro/carregando acessíveis.
7. Parte 3: regra de alerta documentada e testada; CSV corresponde ao filtro.
8. Cada PR registra evidência, limitações e roteiro de demonstração.

## Branches

main: versão revisada. codex/bootstrap: base inicial.
codex/dashboard e codex/analytics: partir do bootstrap depois de revisado/mesclado.
Durante revisão podem partir da mesma branch-base, sem mudanças concorrentes.
PRs pequenos por funcionalidade; revisão por outro integrante; sem merge automático.
Contratos, package-lock, dependências, migrações e App.tsx são compartilhados:
combinar mudanças antes. Cada parte possui pastas separadas; não renomear
arquivos de colegas sem acordo. Não há proteção de branch configurada por esta entrega.

## Limite de segurança

API demonstrativa, pública apenas no computador local (127.0.0.1), sem login,
sem dados pessoais e sem operações de escrita via HTTP. Não há serviço hospedado
nem mudança no GitHub Pages nesta branch.
Consultas parametrizadas, schemas com campos extras rejeitados, limites de período,
rate limit, headers e erros genéricos são as proteções básicas.
Não habilitar exposição externa antes de projetar autenticação/autorização e TLS.
