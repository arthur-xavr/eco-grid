# Contribuir com o Eco Grid

Leia docs/semester-plan.md e os contratos em packages/contracts/src/index.ts.
Não altere index.html, css/ ou js/ nesta evolução: são o protótipo público.
Não use dados de pessoas, credenciais ou equipamentos reais.

1. Sincronize a base revisada e crie a branch do módulo.
2. Rode npm ci e npm run db:seed.
3. Desenvolva na pasta da sua parte.
4. Rode npm run check, npm test e npm run build.
5. Abra PR com objetivo, evidência dos testes e pendências.
6. Outro integrante revisa; somente então o responsável faz merge.

Não envie banco SQLite, .env, node_modules ou arquivos de exportação sensíveis.
Adicione migrações novas numeradas; não edite a migração já aplicada.
Mudanças em contratos e dependências exigem combinação com o grupo.
Comandos oficiais partem da raiz do repositório.
