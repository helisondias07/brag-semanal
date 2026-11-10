import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import type {
  Claim,
  Contribution,
  DraftResponse,
  EvidenceRecord,
  ReviewDecision,
  ReviewState,
  ReviewStatus,
} from "./types";

const LS_KEY = "brag-semanal-review-v1";
const PANELS = [
  { id: "contrib", label: "Contribuições" },
  { id: "learn", label: "Aprendizados" },
  { id: "reject", label: "Não-conquistas" },
  { id: "evidence", label: "Evidências" },
  { id: "export", label: "Exportar Markdown" },
] as const;

type Panel = (typeof PANELS)[number]["id"];

const ATTR: Record<string, { cls: string; label: string }> = {
  individual_author: { cls: "individual", label: "Autoria individual (evidência)" },
  participated: { cls: "participated", label: "Participação comprovada" },
  team_outcome: { cls: "team", label: "Resultado da equipe" },
  unknown: { cls: "suggestion", label: "Sem atribuição" },
};

function evidenceIndex(data: DraftResponse): Map<string, EvidenceRecord> {
  const map = new Map<string, EvidenceRecord>();
  for (const item of data.draft.items) {
    for (const ev of item.evidence) map.set(ev.id, ev);
  }
  return map;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function App() {
  const [data, setData] = useState<DraftResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>("contrib");
  const [selected, setSelected] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewState>({
    disclaimer: "",
    persistence: "local-only",
    networkPublish: false,
    decisions: [],
  });
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [saveMsg, setSaveMsg] = useState("Decisões ficam neste navegador (localStorage) e, se a API local responder, em .local/review-state.json. Sem rede externa, sem publicação.");
  const [exportPreview, setExportPreview] = useState<string>("");

  useEffect(() => {
    const local = localStorage.getItem(LS_KEY);
    if (local) {
      try {
        setReview(JSON.parse(local) as ReviewState);
      } catch {
        /* ignore */
      }
    }
    fetch("/api/draft")
      .then(async (r) => {
        if (!r.ok) throw new Error(`falha ao carregar rascunho (${r.status})`);
        return r.json() as Promise<DraftResponse>;
      })
      .then((json) => {
        setData(json);
        setSelected(json.draft.contributions[0]?.id ?? json.draft.learnings[0]?.id ?? null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const evMap = useMemo(() => (data ? evidenceIndex(data) : new Map()), [data]);

  function decisionFor(id: string): ReviewDecision | undefined {
    return review.decisions.find((d) => d.targetId === id);
  }

  function setStatus(targetId: string, targetKind: ReviewDecision["targetKind"], status: ReviewStatus) {
    setReview((prev) => {
      const rest = prev.decisions.filter((d) => d.targetId !== targetId);
      const next: ReviewState = {
        ...prev,
        persistence: "local-only",
        networkPublish: false,
        decisions: [
          ...rest,
          {
            targetId,
            targetKind,
            status,
            note: noteDraft[targetId] ?? decisionFor(targetId)?.note ?? "",
            updatedAt: nowIso(),
          },
        ].sort((a, b) => a.targetId.localeCompare(b.targetId)),
      };
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function persist(): Promise<ReviewState> {
    const next: ReviewState = {
      ...review,
      persistence: "local-only",
      networkPublish: false,
      decisions: review.decisions.map((d) => ({
        ...d,
        note: noteDraft[d.targetId] ?? d.note,
      })),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    setReview(next);
    try {
      const r = await fetch("/api/review-state", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!r.ok) throw new Error(String(r.status));
      setSaveMsg("Salvo localmente (arquivo .local/review-state.json + localStorage). Nada foi publicado.");
    } catch {
      setSaveMsg("Salvo só no localStorage deste navegador (API local indisponível). Nada foi publicado.");
    }
    return next;
  }

  async function loadExportPreview(): Promise<string> {
    await persist();
    const text = await fetch("/api/export.md").then((r) => r.text());
    setExportPreview(text);
    return text;
  }

  async function downloadMd() {
    const text = await loadExportPreview();
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "brag-semanal-sintetico.md";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function onTabKey(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") {
      return;
    }
    event.preventDefault();
    const idx = PANELS.findIndex((p) => p.id === panel);
    let next = idx;
    if (event.key === "ArrowRight") next = (idx + 1) % PANELS.length;
    if (event.key === "ArrowLeft") next = (idx - 1 + PANELS.length) % PANELS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = PANELS.length - 1;
    const id = PANELS[next].id;
    setPanel(id);
    document.getElementById(`tab-${id}`)?.focus();
  }

  if (error) {
    return (
      <>
        <div className="banner" role="alert">
          DADOS FICTÍCIOS — esta demo não usa contas reais. Falha: {error}
        </div>
        <main id="conteudo" className="shell">
          <div className="status error">Não foi possível carregar o rascunho sintético.</div>
        </main>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <div className="banner">DADOS FICTÍCIOS — carregando rascunho sintético…</div>
        <main id="conteudo" className="shell" aria-busy="true">
          <p>Carregando fixtures rotuladas. Nenhuma conexão GitHub/ClickUp.</p>
        </main>
      </>
    );
  }

  const { draft } = data;
  const selectedContribution = draft.contributions.find((c) => c.id === selected);
  const selectedLearning = draft.learnings.find((l) => l.id === selected);
  const selectedItem = draft.items.find((i) => i.identity === selected);

  return (
    <>
      <div className="banner" role="note">
        DADOS FICTÍCIOS / SYNTHETIC FIXTURES — este rascunho não descreve realizações reais de Helison
        Dias. Fontes: arquivos locais rotulados synthetic-fixture. Adaptadores GitHub e ClickUp:
        desligados, sem conta e sem live. Nada é enviado ou publicado.
      </div>
      <div className="shell">
        <header className="masthead">
          <div>
            <p className="kicker">Caderno de evidências · slug sugerido brag-semanal</p>
            <h1>Rascunho revisável</h1>
            <p className="lede">
              Sujeito do documento: <strong>{draft.subject}</strong>. Afirmações só com IDs de
              evidência. Ausência de evidência não vira conquista. Um revisor humano precisa
              incluir/excluir antes de qualquer uso futuro — esta UI não publica.
            </p>
          </div>
          <div className="meta" aria-label="Metadados da demo">
            <span className="chip">Período {draft.period.startInclusive} → {draft.period.endExclusive}</span>
            <span className="chip">{draft.period.timeZone}</span>
            <span className="chip off">GitHub desligado</span>
            <span className="chip off">ClickUp desligado</span>
            <span className="chip off">Sem Notion</span>
            <span className="chip">Revisão humana obrigatória</span>
          </div>
        </header>

        <nav className="tabs" role="tablist" aria-label="Seções do rascunho" onKeyDown={onTabKey}>
          {PANELS.map((p) => (
            <button
              key={p.id}
              role="tab"
              type="button"
              aria-selected={panel === p.id}
              id={`tab-${p.id}`}
              aria-controls={`panel-${p.id}`}
              tabIndex={panel === p.id ? 0 : -1}
              onClick={() => {
                setPanel(p.id);
                if (p.id === "export") void loadExportPreview();
              }}
            >
              {p.label}
            </button>
          ))}
        </nav>

        <div className="layout">
          <main id="conteudo">
            <section
              id={`panel-${panel}`}
              role="tabpanel"
              aria-labelledby={`tab-${panel}`}
              hidden={panel !== "contrib"}
            >
              {draft.contributions.length === 0 ? (
                <div className="status">Nenhuma contribuição sustentada por evidência qualificável.</div>
              ) : (
                draft.contributions.map((c) => (
                  <ContributionCard
                    key={c.id}
                    item={c}
                    selected={selected === c.id}
                    decision={decisionFor(c.id)}
                    note={noteDraft[c.id] ?? decisionFor(c.id)?.note ?? ""}
                    onSelect={() => setSelected(c.id)}
                    onStatus={(s) => setStatus(c.id, "contribution", s)}
                    onNote={(v) => setNoteDraft((n) => ({ ...n, [c.id]: v }))}
                    evMap={evMap}
                  />
                ))
              )}
            </section>

            <section role="tabpanel" hidden={panel !== "learn"} aria-labelledby="tab-learn">
              {draft.learnings.length === 0 ? (
                <div className="status">
                  Nenhum aprendizado. Tecnologia em título de PR/tarefa não é inferida.
                </div>
              ) : (
                draft.learnings.map((l) => (
                  <article key={l.id} className="card" aria-labelledby={`learn-${l.id}`}>
                    <span className="badge synthetic">anotação explícita · sintético</span>
                    <h3 id={`learn-${l.id}`}>{l.text}</h3>
                    <p className="identity">{l.annotationIdentity}</p>
                    <EvidenceLine ids={l.evidenceIds} evMap={evMap} />
                    <ReviewControls
                      name={l.id}
                      status={decisionFor(l.id)?.status ?? "needs_review"}
                      note={noteDraft[l.id] ?? decisionFor(l.id)?.note ?? ""}
                      onStatus={(s) => setStatus(l.id, "learning", s)}
                      onNote={(v) => setNoteDraft((n) => ({ ...n, [l.id]: v }))}
                    />
                  </article>
                ))
              )}
            </section>

            <section role="tabpanel" hidden={panel !== "reject"} aria-labelledby="tab-reject">
              <article className="card">
                <h2>Itens que não viraram conquista</h2>
                <p>Assigned, título ou update fora do evento qualificável não provam entrega.</p>
                <ul>
                  {draft.rejectedAsAchievement.map((r) => (
                    <li key={r.identity}>
                      <code>{r.identity}</code> — {r.reason}
                    </li>
                  ))}
                </ul>
              </article>
            </section>

            <section role="tabpanel" hidden={panel !== "evidence"} aria-labelledby="tab-evidence">
              {draft.items.map((item) => (
                <article key={item.identity} className="card">
                  <span className="badge synthetic">{item.sourceLabel}</span>
                  <h3>{item.title || item.identity}</h3>
                  <p className="identity">{item.identity}</p>
                  <p>
                    {item.period.inWindow ? "Na janela" : "Fora da janela"} · {item.period.qualifyingEvent} ·{" "}
                    {item.period.reason}
                  </p>
                  {item.urlRejected ? <p>URL rejeitada: {item.urlRejected}</p> : null}
                  {item.canonicalUrl ? <p>URL sanitizada: {item.canonicalUrl}</p> : null}
                  {item.validationIssues.map((v) => (
                    <p key={v}>{v}</p>
                  ))}
                  {item.evidence.map((ev) => (
                    <p key={ev.id} className="ev">
                      {ev.id} · {ev.field} = {ev.value} · {ev.sourceKind}/{ev.scope}#{ev.nativeId}
                    </p>
                  ))}
                </article>
              ))}
            </section>

            <section role="tabpanel" hidden={panel !== "export"} aria-labelledby="tab-export">
              <article className="card export-box">
                <h2>Exportação Markdown local</h2>
                <p>
                  Download no seu computador. Esta demo não envia e-mail, não abre PR e não publica.
                  Um humano ainda precisa aprovar o texto.
                </p>
                <div className="actions">
                  <button className="btn" type="button" onClick={downloadMd}>
                    Baixar Markdown
                  </button>
                  <a className="btn secondary" href="/api/export.md">
                    Abrir /api/export.md
                  </a>
                </div>
                <pre data-testid="export-preview">{exportPreview || draft.disclaimer + "\n\n" + data.markdown}</pre>
              </article>
            </section>
          </main>

          <aside className="inspector card" aria-label="Inspetor de evidência">
            <h2>Fonte por afirmação</h2>
            {!selectedContribution && !selectedLearning && !selectedItem ? (
              <p className="empty">Selecione uma contribuição para ver evidências e atribuição.</p>
            ) : (
              <>
                {selectedContribution ? <AttributionBlock item={selectedContribution} evMap={evMap} /> : null}
                {selectedLearning ? (
                  <>
                    <p>{selectedLearning.text}</p>
                    <EvidenceLine ids={selectedLearning.evidenceIds} evMap={evMap} />
                  </>
                ) : null}
              </>
            )}
            <div className="review">
              <p>
                Persistência: só local. Chave <code>{LS_KEY}</code>. {saveMsg}
              </p>
              <div className="actions">
                <button className="btn" type="button" onClick={() => void persist()}>
                  Salvar decisões localmente
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function ContributionCard(props: {
  item: Contribution;
  selected: boolean;
  decision?: ReviewDecision;
  note: string;
  onSelect: () => void;
  onStatus: (s: ReviewStatus) => void;
  onNote: (v: string) => void;
  evMap: Map<string, EvidenceRecord>;
}) {
  const attr = ATTR[props.item.attribution.kind];
  return (
    <article className="card" aria-labelledby={`c-${props.item.id}`}>
      <div>
        <span className="badge synthetic">fixture sintética</span>
        <span className={`badge ${attr.cls}`}>{attr.label}</span>
      </div>
      <h3 id={`c-${props.item.id}`}>{props.item.title}</h3>
      <div className="actions">
        <button type="button" className="btn secondary" onClick={props.onSelect} aria-pressed={props.selected}>
          {props.selected ? "Evidências visíveis à direita" : "Inspecionar evidências"}
        </button>
      </div>
      <p>{props.item.attribution.reason}</p>
      <p className="identity">{props.item.memberIdentities.join(" · ")}</p>
      <ClaimList title="Fatos" items={props.item.facts} evMap={props.evMap} />
      <ClaimList title="Incertezas" items={props.item.uncertainties} evMap={props.evMap} />
      <ClaimList title="Sugestões editoriais" items={props.item.suggestions} evMap={props.evMap} />
      <ReviewControls
        name={props.item.id}
        status={props.decision?.status ?? "needs_review"}
        note={props.note}
        onStatus={props.onStatus}
        onNote={props.onNote}
      />
    </article>
  );
}

function ClaimList({ title, items, evMap }: { title: string; items: Claim[]; evMap: Map<string, EvidenceRecord> }) {
  if (!items.length) return null;
  return (
    <div>
      <h4>{title}</h4>
      {items.map((c) => (
        <div key={c.id} className={`claim ${c.kind}`}>
          <span className={`badge ${c.kind}`}>{c.kind}</span>
          <p>{c.text}</p>
          <EvidenceLine ids={c.evidenceIds} evMap={evMap} />
        </div>
      ))}
    </div>
  );
}

function EvidenceLine({ ids, evMap }: { ids: string[]; evMap: Map<string, EvidenceRecord> }) {
  if (!ids.length) return <p className="ev">sem evidência — não promover a fato</p>;
  return (
    <ul className="ev">
      {ids.map((id) => {
        const ev = evMap.get(id);
        return (
          <li key={id}>
            {id}
            {ev
              ? ` · ${ev.sourceLabel} · ${ev.sourceKind} ${ev.scope}#${ev.nativeId} · ${ev.field}=${ev.value}`
              : " · evidência não resolvida"}
          </li>
        );
      })}
    </ul>
  );
}

function AttributionBlock({ item, evMap }: { item: Contribution; evMap: Map<string, EvidenceRecord> }) {
  const attr = ATTR[item.attribution.kind];
  return (
    <div>
      <span className={`badge ${attr.cls}`}>{attr.label}</span>
      <p>{item.attribution.reason}</p>
      <EvidenceLine ids={item.attribution.evidenceIds} evMap={evMap} />
    </div>
  );
}

function ReviewControls(props: {
  name: string;
  status: ReviewStatus;
  note: string;
  onStatus: (s: ReviewStatus) => void;
  onNote: (v: string) => void;
}) {
  return (
    <div className="review">
      <fieldset>
        <legend>Decisão do revisor (local)</legend>
        {(
          [
            ["include", "Incluir"],
            ["exclude", "Excluir"],
            ["needs_review", "Precisa revisar"],
          ] as const
        ).map(([value, label]) => (
          <label key={value}>
            <input
              type="radio"
              name={`rev-${props.name}`}
              value={value}
              checked={props.status === value}
              onChange={() => props.onStatus(value)}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <label htmlFor={`note-${props.name}`}>Nota (obrigatória para contexto; não publica)</label>
      <textarea
        id={`note-${props.name}`}
        value={props.note}
        onChange={(e) => props.onNote(e.target.value)}
        placeholder="Por que incluir ou excluir…"
      />
    </div>
  );
}
