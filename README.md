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
npm install
npm run typecheck
npm test
npm run build
npm run generate
npm run smoke
npm run demo
```

- `generate` escreve `artifacts/examples/draft.md` e `draft.json`.
- `demo` sobe `http://127.0.0.1:43141` (só local, sem publicação).
- `npx playwright install chromium` uma vez, depois `npm run capture` para screenshots reais.

## Limites

- Adaptadores GitHub/ClickUp **inativos**. Ver `docs/INTEGRATIONS.md`.
- Sem Notion, sem contas, sem tokens, sem deploy, sem GitHub público.
- Revisor humano precisa incluir/excluir antes de qualquer uso. A UI não envia nada.
- Período: `America/Sao_Paulo`, início inclusivo, fim exclusivo; evento qualificável por tipo (não use `updatedAt` como entrega).

## Arquitetura

Ver `docs/ARCHITECTURE.md` e o case em `docs/CASE.md`.

## Licença de uso do rascunho

O Markdown exportado carrega o aviso de dados fictícios. Não compartilhe como histórico profissional.
