# Rascunho de brag document — Helison Dias

> **DADOS FICTÍCIOS / SYNTHETIC FIXTURES. Estas entradas, evidências e rascunhos NÃO descrevem realizações reais de Helison Dias. São material de demonstração rotulado para o MVP.**
>
> Revisão humana obrigatória antes de qualquer compartilhamento. Nada é enviado ou publicado automaticamente.

## Metadados

- Sujeito do rascunho: Helison Dias (dados fictícios)
- Período: `2026-02-02T00:00:00-03:00` ≤ evento < `2026-02-09T00:00:00-03:00` (America/Sao_Paulo)
- Evento qualificável: PR=`mergedAt`, commit=`committedAt`, tarefa=`completedAt`, anotação=`createdAt`. `updatedAt` fora/dentro da janela não prova entrega.
- Fontes: fixtures sintéticas rotuladas `synthetic-fixture`. Adaptadores GitHub/ClickUp desligados (sem live).
- Gerado em: `2026-02-09T12:00:00.000Z` (relógio determinístico de pipeline)
- Publicação automática: não
- Revisão humana: obrigatória

## Como ler

- **fato**: afirmação com IDs de evidência da fixture.
- **incerteza**: falta evidência; não é conquista.
- **sugestão editorial**: texto para o revisor; não é fato.

## Contribuições candidatas

### Entrega compartilhada de documentação

- id: `contrib-clickup_task-T-300`
- atribuição: **team_outcome** — tarefa sintética com múltiplos assignees; resultado da equipe, não autoria individual exclusiva _(evidência: ev-0021)_
- membros do cluster: clickup_task:synthetic-space/sprint-board:task:T-300

Fatos:

- [fact] Tarefa sintética T-300 em synthetic-space/sprint-board consta complete com completedAt na janela. _(evidência: ev-0019, ev-0020; fonte: synthetic-fixture)_

Sugestões editoriais:

- [suggestion] Revisor humano deve decidir se descreve participação versus resultado de equipe. Não inflar autoria individual. _(evidência: ev-0021; fonte: synthetic-fixture)_

### Commit órfão sem ticket/PR

- id: `contrib-github_commit-orphan99`
- atribuição: **individual_author** — login do sujeito aparece como author/committer do commit sintético _(evidência: ev-0030)_
- membros do cluster: github_commit:synthetic-org/app:commit:orphan99

Fatos:

- [fact] Commit sintético orphan99 em synthetic-org/app tem committedAt na janela. Isolado, não prova impacto de produto. _(evidência: ev-0029; fonte: synthetic-fixture)_

Sugestões editoriais:

- [suggestion] Commit sintético sem PR/tarefa associada não prova entrega de produto; revisor decide se descreve o trabalho. _(evidência: ev-0028, ev-0029, ev-0030; fonte: synthetic-fixture)_

### Corrige timeout da API de pedidos

- id: `contrib-github_pr-12`
- atribuição: **individual_author** — login do sujeito é author do PR sintético _(evidência: ev-0036)_
- membros do cluster: annotation:synthetic-org/app:annotation:L-01; clickup_task:synthetic-space/sprint-board:task:T-100; github_commit:synthetic-org/app:commit:a1b2c3d; github_commit:synthetic-org/app:commit:e4f5g6h; github_pr:synthetic-org/app:pr:12

Fatos:

- [fact] Tarefa sintética T-100 em synthetic-space/sprint-board consta complete com completedAt na janela. _(evidência: ev-0008, ev-0010; fonte: synthetic-fixture)_
- [fact] Commit sintético a1b2c3d em synthetic-org/app tem committedAt na janela. Isolado, não prova impacto de produto. _(evidência: ev-0023; fonte: synthetic-fixture)_
- [fact] Commit sintético e4f5g6h em synthetic-org/app tem committedAt na janela. Isolado, não prova impacto de produto. _(evidência: ev-0026; fonte: synthetic-fixture)_
- [fact] PR sintético 12 em synthetic-org/app consta como merged no timestamp qualificável (não é realização real). _(evidência: ev-0032, ev-0035; fonte: synthetic-fixture)_

Sugestões editoriais:

- [suggestion] Commits associados ao mesmo PR sintético são evidência do mesmo item; não contabilizar impacto separado (evitar squash/duplicata). _(evidência: ev-0022, ev-0023, ev-0024, ev-0025, ev-0026, ev-0027; fonte: synthetic-fixture)_

### Corrige timeout da API de pedidos

- id: `contrib-github_pr-13`
- atribuição: **individual_author** — login do sujeito é author do PR sintético _(evidência: ev-0041)_
- membros do cluster: github_pr:synthetic-org/app:pr:13

Fatos:

- [fact] PR sintético 13 em synthetic-org/app consta como merged no timestamp qualificável (não é realização real). _(evidência: ev-0038, ev-0040; fonte: synthetic-fixture)_

### Infra de observabilidade compartilhada

- id: `contrib-github_pr-14`
- atribuição: **team_outcome** — PR sintético merged em que o sujeito não é author; merge é resultado da equipe _(evidência: ev-0046)_
- membros do cluster: github_pr:synthetic-org/app:pr:14

Fatos:

- [fact] PR sintético 14 em synthetic-org/app consta como merged no timestamp qualificável (não é realização real). _(evidência: ev-0043, ev-0045; fonte: synthetic-fixture)_

Sugestões editoriais:

- [suggestion] Revisor humano deve decidir se descreve participação versus resultado de equipe. Não inflar autoria individual. _(evidência: ev-0046; fonte: synthetic-fixture)_

### Fronteira: merge exatamente no início da janela

- id: `contrib-github_pr-17`
- atribuição: **individual_author** — login do sujeito é author do PR sintético _(evidência: ev-0061)_
- membros do cluster: github_pr:synthetic-org/app:pr:17

Fatos:

- [fact] PR sintético 17 em synthetic-org/app consta como merged no timestamp qualificável (não é realização real). _(evidência: ev-0059, ev-0060; fonte: synthetic-fixture)_

### Credenciais na URL

- id: `contrib-github_pr-20`
- atribuição: **individual_author** — login do sujeito é author do PR sintético _(evidência: ev-0072)_
- membros do cluster: github_pr:synthetic-org/app:pr:20

Fatos:

- [fact] PR sintético 20 em synthetic-org/app consta como merged no timestamp qualificável (não é realização real). _(evidência: ev-0070, ev-0071; fonte: synthetic-fixture)_

## Aprendizados (somente anotação explícita)

- Anotação explícita: retries com jitter reduziram timeouts na fixture (não inferido do título do PR). _(evidência: ev-0001, ev-0002; annotation:synthetic-org/app:annotation:L-01)_

## Itens que não viraram conquista

- `clickup_task:synthetic-space/sprint-board:task:T-200`: sem timestamp de evento qualificável (completedAt); updatedAt não prova entrega na janela
- `github_pr:synthetic-org/app:pr:15`: sem timestamp de evento qualificável (mergedAt); updatedAt não prova entrega na janela
- `github_pr:synthetic-org/app:pr:16`: evento mergedAt=2026-01-28T10:00:00 America/Sao_Paulo fora de \[2026-02-02T00:00:00-03:00, 2026-02-09T00:00:00-03:00)
- `github_pr:synthetic-org/app:pr:18`: evento mergedAt=2026-02-09T00:00:00 America/Sao_Paulo fora de \[2026-02-02T00:00:00-03:00, 2026-02-09T00:00:00-03:00)
- `github_pr:synthetic-org/app:pr:19`: mergedAt: formato inválido (exige ISO-8601 com offset ou Z): not-a-date

## Proveniência e clusters

- cluster `annotation:synthetic-org/app:annotation:L-01|clickup_task:synthetic-space/sprint-board:task:T-100|github_commit:synthetic-org/app:commit:a1b2c3d|github_commit:synthetic-org/app:commit:e4f5g6h|github_pr:synthetic-org/app:pr:12` ← `annotation:synthetic-org/app:annotation:L-01`, `clickup_task:synthetic-space/sprint-board:task:T-100`, `github_commit:synthetic-org/app:commit:a1b2c3d`, `github_commit:synthetic-org/app:commit:e4f5g6h`, `github_pr:synthetic-org/app:pr:12`
- cluster `annotation:synthetic-org/app:annotation:L-02` ← `annotation:synthetic-org/app:annotation:L-02`
- cluster `annotation:synthetic-org/app:annotation:N-01` ← `annotation:synthetic-org/app:annotation:N-01`
- cluster `clickup_task:synthetic-space/sprint-board:task:T-200` ← `clickup_task:synthetic-space/sprint-board:task:T-200`
- cluster `clickup_task:synthetic-space/sprint-board:task:T-300` ← `clickup_task:synthetic-space/sprint-board:task:T-300`
- cluster `github_commit:synthetic-org/app:commit:orphan99` ← `github_commit:synthetic-org/app:commit:orphan99`
- cluster `github_pr:synthetic-org/app:pr:13` ← `github_pr:synthetic-org/app:pr:13`
- cluster `github_pr:synthetic-org/app:pr:14` ← `github_pr:synthetic-org/app:pr:14`
- cluster `github_pr:synthetic-org/app:pr:15` ← `github_pr:synthetic-org/app:pr:15`
- cluster `github_pr:synthetic-org/app:pr:16` ← `github_pr:synthetic-org/app:pr:16`
- cluster `github_pr:synthetic-org/app:pr:17` ← `github_pr:synthetic-org/app:pr:17`
- cluster `github_pr:synthetic-org/app:pr:18` ← `github_pr:synthetic-org/app:pr:18`
- cluster `github_pr:synthetic-org/app:pr:19` ← `github_pr:synthetic-org/app:pr:19`
- cluster `github_pr:synthetic-org/app:pr:20` ← `github_pr:synthetic-org/app:pr:20`

## Log de redação (sanitização)

- $.body: bearer
- $.body: github_token,password_assignment,email
- $.url: rejected_protocol:javascript:
- $.url: url_sanitized
- $.url: url_sanitized
