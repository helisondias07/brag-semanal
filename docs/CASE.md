# Case técnico — Brag semanal (MVP)

**Status:** rascunho privado temporário para revisão. Não publicado. Não é um case de produto lançado. Os exemplos **não** são realizações de Helison Dias.

## Motivação

Manter um brag document na mão costuma falhar por falta de hábito. João Raul descreveu a automação do próprio caderno a partir de git, tickets e PRs ([texto](https://joaoraul.dev/writing/automated-brag-document/)). A inspiração aqui é só o problema: não esquecer trabalho, cruzar fontes e redigir um rascunho.

Este MVP é autoral e mais estreito: **não** conecta APIs reais, **não** agenda segunda-feira, **não** escreve no Notion. Entradas sintéticas rotuladas passam por normalização, deduplicação com rastreio, candidatos só com evidência, revisão humana na UI e export Markdown local.

## Decisões

- TypeScript, CLI (`tsx`) e UI Vite/React servida localmente na porta 43141. Sem LLM pago.
- Fato / incerteza / sugestão editorial separados. Toda afirmação factual cita IDs de evidência da fixture.
- Autoria individual ≠ participação ≠ resultado de equipe.
- Identidade estável `fonte:escopo:tipo:id`. Associação PR↔commit↔tarefa só quando o arquivo de associações diz.
- Redaction na ingestão; arquivos de saída são sanitizados.
- Revisão inclui/exclui/precisa revisar, com nota, persistida só localmente.

## Testes (executados nesta entrega)

Os testes automatizados **não** substituem revisão humana independente nem auditoria de acessibilidade.

- Vitest de pipeline/adapters/redação/smoke HTTP.
- Teste Playwright de UI: incluir/excluir/nota/revisar, consistência no Markdown exportado, Tab/setas no tablist, foco visível observado no teste, overflow horizontal em 1280×800 e 390×844.
- `tsc`, `vite build`, CLI `generate`/`smoke`.
- Capturas de viewport (não página inteira).

Não testado: leitores de tela, zoom 200%, daltonismo, contraste WCAG em toda a paleta da página, toque real em dispositivo físico, Safari/Firefox, arrastar com pointer apenas.

Contraste do chip `.off`: texto `#6a220e` sobre fundo `#f0d7c8` → **8.26:1** (rel. lum. WCAG 2.x; meta ≥ 4.5:1). Medido nos tokens, não é auditoria WCAG da página. Texto corrido `--ink #161410` sobre `--paper #f3eee3`.

Chip GitHub: o source **nunca** teve o rótulo `GitHub Ativo`. O texto era `GitHub inativo` (classe `chip off`). “inativo” contém o substring visual “ativo”, o que pode explicar a suspeita na captura mobile de página inteira. Rótulo atual: `GitHub desligado`.

## Limitações

- Sem leitura real de GitHub/ClickUp (adaptadores desligados).
- Sem consolidação histórica multi-semana além da janela da fixture.
- Sem editor rico nem colaboração.
- Persistência local não é backup cifrado.
- UI de demo usa as mesmas fixtures; nunca finge login.

## O que ainda não existe

- Allowlist em produção, OAuth, retenção operacional.
- Publicação, portfólio, deploy, rotina pessoal recorrente.
- Inferência de impacto/métricas/horas.

Destino futuro do source (após aceite humano, por outro fluxo): pasta em `C:\Users\HelisonDias\Repositorios` com slug sugerido `brag-semanal`. Este agente **não** toca nesse PC nem clona para lá.
