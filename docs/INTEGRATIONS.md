# Plano de integrações (inativas)

Nenhuma conta é pedida agora. Nenhum token. Nenhum destino (Notion não é requisito).

## GitHub (somente leitura, futuro)

1. Flag `enabled=false` por padrão (`GitHubReadAdapter`).
2. Só então: allowlist explícita `account` + lista de repositórios.
3. Janela de período (`America/Sao_Paulo`) e política de retenção (`memory` ou `local_sanitized` + `maxDays`).
4. Transport live **não implementado**; testes usam `transport: "fixture"`.

## ClickUp (somente leitura, futuro)

Mesmo contrato, allowlist de **listas** em vez de repositórios (`ClickUpReadAdapter`).

## O que não existe

- OAuth, apps GitHub, webhooks, bots Slack, rotina cron semanal.
- Escrita em boards, comentários, e-mail, redes.
- Publicação, deploy, espelho GitHub/Vercel, pasta no PC do autor.

Qualquer ativação futura exige aceite humano centralizado da allowlist, da janela e do destino de retenção.
