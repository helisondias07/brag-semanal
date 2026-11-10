import type { Period, PeriodMembership, QualifyingEventKind, RawRecord, SourceKind } from "./types.ts";

export const DEFAULT_TZ = "America/Sao_Paulo" as const;

export class TimestampError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimestampError";
  }
}

export function parseInstant(iso: string, field: string): Date {
  if (!iso || typeof iso !== "string" || !iso.trim()) {
    throw new TimestampError(`${field}: timestamp vazio`);
  }
  const trimmed = iso.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(trimmed)) {
    throw new TimestampError(`${field}: formato inválido (exige ISO-8601 com offset ou Z): ${trimmed}`);
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    throw new TimestampError(`${field}: timestamp não parseável: ${trimmed}`);
  }
  const check = d.toISOString();
  if (!check) {
    throw new TimestampError(`${field}: timestamp inválido`);
  }
  return d;
}

export function validatePeriod(period: Period): { start: Date; end: Date } {
  if (period.timeZone !== DEFAULT_TZ) {
    throw new TimestampError(`timeZone deve ser ${DEFAULT_TZ}`);
  }
  const start = parseInstant(period.startInclusive, "startInclusive");
  const end = parseInstant(period.endExclusive, "endExclusive");
  if (!(start.getTime() < end.getTime())) {
    throw new TimestampError("período inválido: startInclusive deve ser anterior a endExclusive");
  }
  return { start, end };
}

/** Inclusive start, exclusive end. Instant compared in UTC after parsing offsets. */
export function isInWindow(instant: Date, start: Date, end: Date): boolean {
  const t = instant.getTime();
  return t >= start.getTime() && t < end.getTime();
}

export function formatInZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
    .format(instant)
    .replace(" ", "T");
}

/**
 * Which event proves membership in the window.
 * An update (`updatedAt`) never proves delivery/merge/completion in the window.
 */
export function qualifyingEventFor(kind: SourceKind): QualifyingEventKind {
  switch (kind) {
    case "github_pr":
      return "mergedAt";
    case "github_commit":
      return "committedAt";
    case "clickup_task":
      return "completedAt";
    case "annotation":
      return "createdAt";
  }
}

export function membership(record: RawRecord, period: Period): PeriodMembership {
  const { start, end } = validatePeriod(period);
  const q = qualifyingEventFor(record.sourceKind);
  const tsRaw =
    q === "mergedAt"
      ? record.timestamps.mergedAt
      : q === "committedAt"
        ? record.timestamps.committedAt
        : q === "completedAt"
          ? record.timestamps.completedAt
          : record.timestamps.createdAt;

  if (!tsRaw) {
    return {
      inWindow: false,
      qualifyingEvent: "none",
      reason: `sem timestamp de evento qualificável (${q}); updatedAt não prova entrega na janela`,
    };
  }

  let instant: Date;
  try {
    instant = parseInstant(tsRaw, q);
  } catch (err) {
    return {
      inWindow: false,
      qualifyingEvent: "none",
      timestamp: tsRaw,
      reason: err instanceof Error ? err.message : String(err),
    };
  }

  const inside = isInWindow(instant, start, end);
  const zoneStamp = formatInZone(instant, period.timeZone);
  if (!inside) {
    return {
      inWindow: false,
      qualifyingEvent: q,
      timestamp: tsRaw,
      reason: `evento ${q}=${zoneStamp} ${period.timeZone} fora de [${period.startInclusive}, ${period.endExclusive})`,
    };
  }
  return {
    inWindow: true,
    qualifyingEvent: q,
    timestamp: tsRaw,
    reason: `evento ${q}=${zoneStamp} ${period.timeZone} dentro de [${period.startInclusive}, ${period.endExclusive})`,
  };
}
