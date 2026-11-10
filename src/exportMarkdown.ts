import { escapeMarkdown } from "./escape.ts";
import { redactText } from "./redact.ts";
import type { Claim, ReviewableDraft, ReviewState } from "./types.ts";
import { SYNTHETIC_DISCLAIMER } from "./types.ts";

function claimBlock(c: Claim, indent = ""): string {
  const ids = c.evidenceIds.length ? c.evidenceIds.join(", ") : "sem-evidencia";
  return `${indent}- [${c.kind}] ${escapeMarkdown(c.text)} _(evidência: ${escapeMarkdown(ids)}; fonte: synthetic-fixture)_`;
}

export function applyReview(draft: ReviewableDraft, review?: ReviewState): ReviewableDraft {
  if (!review) return draft;
  const map = new Map(review.decisions.map((d) => [d.targetId, d]));
  const contributions = draft.contributions.filter((c) => map.get(c.id)?.status !== "exclude");
  const learnings = draft.learnings.filter((l) => map.get(l.id)?.status !== "exclude");
  return { ...draft, contributions, learnings };
}

export function exportMarkdown(draft: ReviewableDraft, review?: ReviewState): string {
  const d = applyReview(draft, review);
  const lines: string[] = [];
  lines.push(`# Rascunho de brag document — ${escapeMarkdown(d.subject)}`);
  lines.push("");
  lines.push(`> **${SYNTHETIC_DISCLAIMER}**`);
  lines.push(">");
  lines.push("> Revisão humana obrigatória antes de qualquer compartilhamento. Nada é enviado ou publicado automaticamente.");
  lines.push("");
  lines.push("## Metadados");
  lines.push("");
  lines.push(`- Sujeito do rascunho: ${escapeMarkdown(d.subject)} (dados fictícios)`);
  lines.push(`- Período: \`${d.period.startInclusive}\` ≤ evento < \`${d.period.endExclusive}\` (${d.period.timeZone})`);
  lines.push("- Evento qualificável: PR=`mergedAt`, commit=`committedAt`, tarefa=`completedAt`, anotação=`createdAt`. `updatedAt` fora/dentro da janela não prova entrega.");
  lines.push("- Fontes: fixtures sintéticas rotuladas `synthetic-fixture`. Adaptadores GitHub/ClickUp desligados (sem live).");
  lines.push(`- Gerado em: \`${d.generatedAt}\` (relógio determinístico de pipeline)`);
  lines.push(`- Publicação automática: ${d.autoPublish ? "sim" : "não"}`);
  lines.push(`- Revisão humana: ${d.humanReviewRequired ? "obrigatória" : "não"}`);
  lines.push("");
  lines.push("## Como ler");
  lines.push("");
  lines.push("- **fato**: afirmação com IDs de evidência da fixture.");
  lines.push("- **incerteza**: falta evidência; não é conquista.");
  lines.push("- **sugestão editorial**: texto para o revisor; não é fato.");
  lines.push("");
  lines.push("## Contribuições candidatas");
  lines.push("");
  if (!d.contributions.length) {
    lines.push("_Nenhuma contribuição sustentada por evidência qualificável neste período. Ausência de evidência não vira conquista._");
    lines.push("");
  }
  for (const c of d.contributions) {
    const decision = review?.decisions.find((x) => x.targetId === c.id);
    lines.push(`### ${escapeMarkdown(c.title)}`);
    lines.push("");
    lines.push(`- id: \`${escapeMarkdown(c.id)}\``);
    lines.push(`- atribuição: **${c.attribution.kind}** — ${escapeMarkdown(c.attribution.reason)} _(evidência: ${c.attribution.evidenceIds.join(", ") || "n/d"})_`);
    lines.push(`- membros do cluster: ${c.memberIdentities.map(escapeMarkdown).join("; ")}`);
    if (decision) {
      lines.push(`- decisão local de revisão: **${decision.status}**${decision.note ? ` — ${escapeMarkdown(decision.note)}` : ""}`);
    }
    lines.push("");
    lines.push("Fatos:");
    lines.push("");
    for (const f of c.facts) lines.push(claimBlock(f));
    if (c.uncertainties.length) {
      lines.push("");
      lines.push("Incertezas:");
      lines.push("");
      for (const u of c.uncertainties) lines.push(claimBlock(u));
    }
    if (c.suggestions.length) {
      lines.push("");
      lines.push("Sugestões editoriais:");
      lines.push("");
      for (const s of c.suggestions) lines.push(claimBlock(s));
    }
    lines.push("");
  }
  lines.push("## Aprendizados (somente anotação explícita)");
  lines.push("");
  if (!d.learnings.length) {
    lines.push("_Nenhum aprendizado: tecnologia no título não é inferida como aprendizado._");
    lines.push("");
  }
  for (const l of d.learnings) {
    lines.push(`- ${escapeMarkdown(l.text)} _(evidência: ${l.evidenceIds.join(", ")}; ${escapeMarkdown(l.annotationIdentity)})_`);
  }
  lines.push("");
  lines.push("## Itens que não viraram conquista");
  lines.push("");
  if (!d.rejectedAsAchievement.length) {
    lines.push("_Nenhum._");
  }
  for (const r of d.rejectedAsAchievement) {
    lines.push(`- \`${escapeMarkdown(r.identity)}\`: ${escapeMarkdown(r.reason)}`);
  }
  lines.push("");
  lines.push("## Proveniência e clusters");
  lines.push("");
  for (const cl of d.clusters) {
    lines.push(`- cluster \`${escapeMarkdown(cl.clusterId)}\` ← ${cl.memberIdentities.map((m) => "`" + escapeMarkdown(m) + "`").join(", ")}`);
  }
  lines.push("");
  lines.push("## Log de redação (sanitização)");
  lines.push("");
  if (!d.redactionLog.length) {
    lines.push("_Nenhum segredo detectado nas fixtures após varredura._");
  } else {
    for (const line of d.redactionLog) {
      lines.push(`- ${escapeMarkdown(redactText(line).text)}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value), null, 2) + "\n";
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as object).sort()) {
      out[key] = sortValue((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}
