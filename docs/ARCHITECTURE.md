# Arquitetura

Implementação independente inspirada no *conceito* de brag document automatizado descrito por João Raul em [Automated brag document](https://joaoraul.dev/writing/automated-brag-document/). Não há código-fonte público verificado daquele projeto; nada foi copiado. Notion, Jira e rotinas semanais **não** existem aqui.

```
fixtures sintéticas (PR, commit, tarefa, anotação)
        │  redaction na ingestão (não persiste bruto)
        ▼
   normalize (identidade source+scope+id, evidências, período)
        ▼
   dedup (união só por identidade estável + associações explícitas)
        ▼
   candidatos (contribuição / aprendizado) — sem evidência ⇒ sem conquista
        ▼
   rascunho revisável (fato | incerteza | sugestão editorial)
        ▼
   UI local + export Markdown (download local)
```

Decisões:

- Evento qualificável por tipo: PR `mergedAt`, commit `committedAt`, tarefa `completedAt`, anotação `createdAt`. `updatedAt` nunca prova entrega na janela.
- Período em `America/Sao_Paulo`, início inclusivo, fim exclusivo.
- Dedup nunca usa similaridade de título.
- Commits ligados a um PR não geram impacto separado.
- Aprendizado só com anotação explícita e evidência.
- Adaptadores GitHub/ClickUp: contratos somente leitura, inativos, testes com fixtures. Live HTTP não implementado.
- Persistência de revisão: `localStorage` e, no `npm run demo`, `.local/review-state.json`. Sem publicação.
- Modo estático (`VITE_STATIC_DEMO=true`, saída `web/dist-static`): pipeline no browser, fixtures embutidas, só `localStorage` versionado. Sem `/api`.

Slug sugerido para um futuro diretório de source (não clonado por este agente): `brag-semanal`.
