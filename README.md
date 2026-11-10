# Brag semanal

MVP autoral de **rascunho revisável** de brag document. Entradas **sintéticas** (PRs, commits, tarefas, anotações) → normalização → deduplicação com proveniência → candidatos só com evidência → revisão humana na UI → Markdown local.

**DADOS FICTÍCIOS.** Nada neste repositório descreve realizações reais de Helison Dias.

Inspiração de conceito (implementação independente, sem código copiado): [Automated brag document](https://joaoraul.dev/writing/automated-brag-document/) — João Raul. Aquele texto usa git/Jira/PRs/Notion e uma rotina semanal; **este** projeto não faz nenhuma dessas integrações.

Slug sugerido para um checkout futuro: `brag-semanal`. Destino eventual em disco do autor **não** é preenchido por este agente.

## Requisitos

- Node.js 20+
- Dependências: `typescript`, `tsx`, `vitest`, `vite`, `react`, `playwright` (dev). Sem chaves de LLM.

## Comandos

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run generate
npm run smoke
npm run demo
```

- `generate` escreve `artifacts/examples/draft.md` e `draft.json`.
- `demo` sobe `http://127.0.0.1:43141` com API local (`/api/draft`, `/api/review-state`, `/api/export.md`) gravando em `.local/`. Só local, sem publicação.
- `npx playwright install chromium` uma vez, depois `npm run capture` para screenshots reais.

## Build estático (hospedagem só de arquivos)

Modo demo 100% no navegador, selecionado em **build-time** com `VITE_STATIC_DEMO=true`. O mesmo núcleo (`assembleFixtures`, `runPipeline`, `exportMarkdown`, `reviewCore`) roda no browser com fixtures sintéticas embutidas. Revisão em `localStorage` (`brag-semanal-static-review-v1`). Sem `/api`, sem GitHub/ClickUp, sem coleta.

```bash
npm run build:static
```

Pasta de saída: **`web/dist-static`**.

Em um painel tipo Vercel: preset **Other** (ou Vite se o diretório de output for sobrescrito), **Output Directory** = `web/dist-static`. Sem funções serverless. Este repositório não publica nem faz deploy.

## Limites

- Adaptadores GitHub/ClickUp **inativos**. Ver `docs/INTEGRATIONS.md`.
- Sem Notion, sem contas, sem tokens, sem deploy, sem GitHub público.
- Revisor humano precisa incluir/excluir antes de qualquer uso. A UI não envia nada.
- Período: `America/Sao_Paulo`, início inclusivo, fim exclusivo; evento qualificável por tipo (não use `updatedAt` como entrega).

## Arquitetura

Ver `docs/ARCHITECTURE.md` e o case em `docs/CASE.md`.

## Licença de uso do rascunho

O Markdown exportado carrega o aviso de dados fictícios. Não compartilhe como histórico profissional.
