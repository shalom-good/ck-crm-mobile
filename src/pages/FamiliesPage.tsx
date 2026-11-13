import { memo, useEffect, useMemo, useState, type CSSProperties } from "react";
import { IonPage, IonContent, IonRefresher, IonRefresherContent, useIonRouter, type RefresherEventDetail } from "@ionic/react";
import { useRole } from "@/lib/roles";
import { useAppData } from "@/lib/appData";
import { useUI } from "@/lib/ui";
import { syncedAgo } from "@/lib/time";
import { money } from "@/lib/format";
import type { Family } from "@/lib/types";
import {
  buildLanes, matchRank, ownerOf, statusChip, activityText, needsAttention, isQuiet, crossBadges,
  stageLabel, stageOf, ownerRoleLabel, type Lane,
} from "@/lib/orchardBoard";
import {
  ActivityLine, Badge, BrandTile, Icon, Initials, LaneDots, SearchBar, Sheet, StageTabs,
  initialsOf, useLaneIndex, useLongPress,
} from "@/components/orchard/Orchard";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard } from "@/components/Skeleton";

/**
 * Families, in ORCHARD (2026-11-02). One strong search field, three real
 * stat tiles that double as filters, then the caseload as a kanban: stage
 * tabs with full names + counts over swipeable pastel lanes, one lane per
 * stage (CK = new_clients.ck_client_flow, KDH = kdh_clients.mordy_view).
 *
 * Tap a card → the family profile. Press and hold → a quick-actions
 * sheet (Call / Text / WhatsApp / Email / Note / Open). There is no stage
 * write path in the app API yet, so the sheet does not offer a move.
 *
 * Lens: the roster is scoped server-side by the bearer token (own
 * caseload for case managers / debt experts, everyone for directors).
 * Directors get "Group by owner" inside each lane, on by default.
 */

type Filter = "all" | "attention" | "quiet" | "behind";

export function FamiliesPage() {
  const router = useIonRouter();
  const { role, me, provider, viewAsEmail } = useRole();
  const { familiesForRole, lastSync, loading } = useAppData();
  const { openCapture } = useUI();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const wholeTeam = role.key === "director" || role.key === "coordinator";
  const [grouped, setGrouped] = useState(role.key === "director");
  const [held, setHeld] = useState<Family | null>(null);
  // The list leads (as the CRM does at phone width); the stage board is the
  // other view, never both stacked. The choice is remembered on the phone.
  const [view, setView] = useState<"list" | "board">(() => { try { return localStorage.getItem("ck_fam_view") === "board" ? "board" : "list"; } catch { return "list"; } });
  const pickView = (v: "list" | "board") => { setView(v); try { localStorage.setItem("ck_fam_view", v); } catch { /* private mode */ } };
  const [limit, setLimit] = useState(40);

  const all = familiesForRole(role.key, me.name);
  const kinds = useMemo(() => {
    const ck = all.filter((f) => f.kind === "ck").length;
    const kdh = all.filter((f) => f.kind === "kdh").length;
    return { ck, kdh };
  }, [all]);
  const [program, setProgram] = useState<"ck" | "kdh">("ck");
  // Follow the data: a KDH-only caseload opens on KDH.
  useEffect(() => {
    if (kinds.ck === 0 && kinds.kdh > 0) setProgram("kdh");
    if (kinds.kdh === 0 && kinds.ck > 0) setProgram("ck");
  }, [kinds.ck, kinds.kdh]);

  const inProgram = useMemo(() => all.filter((f) => f.kind === program), [all, program]);
  const term = q.trim().toLowerCase();

  const counts = useMemo(() => ({
    all: inProgram.length,
    attention: inProgram.filter(needsAttention).length,
    quiet: inProgram.filter(isQuiet).length,
    behind: inProgram.filter((f) => f.paymentStatus === "behind").length,
  }), [inProgram]);

  const visible = useMemo(() => {
    const list = filter === "attention" ? inProgram.filter(needsAttention)
      : filter === "quiet" ? inProgram.filter(isQuiet)
      : filter === "behind" ? inProgram.filter((f) => f.paymentStatus === "behind")
      : inProgram;
    if (!term) return list;
    return list
      .map((f, k) => ({ f, r: matchRank(f, term), k }))
      .filter((x): x is { f: Family; r: number; k: number } => x.r != null)
      .sort((a, b) => a.r - b.r || a.k - b.k)
      .map((x) => x.f);
  }, [inProgram, filter, term]);

  const lanes = useMemo(() => buildLanes(program, visible), [program, visible]);
  const { ref: lanesRef, index: laneIdx, scrollTo } = useLaneIndex();
  const activeLane = lanes[Math.min(laneIdx, Math.max(0, lanes.length - 1))]?.key ?? "";
  // Back to the first lane whenever the board itself changes.
  useEffect(() => { scrollTo(0, false); setLimit(40); }, [program, filter, term, scrollTo]);
  // List order: whoever needs attention first, then by the quietest.
  const listed = useMemo(() => {
    if (term) return { hot: [] as Family[], rest: visible };
    const hot = visible.filter(needsAttention).sort((a, b) => (b.daysSinceLastNote ?? -1) - (a.daysSinceLastNote ?? -1));
    const rest = visible.filter((f) => !needsAttention(f)).sort((a, b) => a.name.localeCompare(b.name));
    return { hot, rest };
  }, [visible, term]);

  const refresh = (e: CustomEvent<RefresherEventDetail>) => setTimeout(() => e.detail.complete(), 700);
  const open = (f: Family) => router.push(`/family/${f.id}`);

  const lensLine = viewAsEmail ? `Viewing as ${provider.name}` : wholeTeam ? `${role.label} · whole team` : `${role.label} · my families`;
  const tiles: { key: Filter; label: string; count: number; bg: string }[] = [
    { key: "all", label: program === "kdh" ? "KDH clients" : "Families", count: counts.all, bg: "var(--oc-mint)" },
    { key: "attention", label: "Need attention", count: counts.attention, bg: "var(--oc-butter)" },
    { key: "quiet", label: "Quiet 14+ days", count: counts.quiet, bg: "var(--oc-lilac)" },
  ];

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--oc-ground)" } as CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>
        <div className="oc-root" style={{ padding: "calc(var(--ion-safe-area-top, 0px) + 14px) 16px 0", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <BrandTile program={program} sub={lensLine} />
            </div>
            <button type="button" className="oc-round" aria-label="Settings" onClick={() => router.push("/tabs/settings")}
              style={{ background: "var(--oc-lilac)", color: "#4A3566", fontSize: 13, fontWeight: 800 }}>
              {initialsOf(me.name)}
            </button>
          </div>

        </div>

        <div className="oc-root ofa-pin">
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <h1 className="oc-title">{wholeTeam ? "Families" : "Your families"}</h1>
              <span className="oc-sub" style={{ flex: "none" }}>{loading ? "Loading" : `${all.length} · ${syncedAgo(lastSync)}`}</span>
            </div>
            <SearchBar value={q} onChange={setQ} count={term ? visible.length : undefined}
              placeholder="Search by name, city or phone" label="Search families" />
            {!loading && inProgram.length > 0 && (
              <div className="ofa-bar">
                <div className="oc-seg ofa-view" role="group" aria-label="View">
                  <button type="button" aria-pressed={view === "list"} onClick={() => pickView("list")}>List</button>
                  <button type="button" aria-pressed={view === "board"} onClick={() => pickView("board")}>Stages</button>
                </div>
                {kinds.ck > 0 && kinds.kdh > 0 && (
                  <div className="oc-seg ofa-view" role="group" aria-label="Program">
                    <button type="button" aria-pressed={program === "ck"} onClick={() => setProgram("ck")}>CK · {kinds.ck}</button>
                    <button type="button" aria-pressed={program === "kdh"} onClick={() => setProgram("kdh")}>KDH · {kinds.kdh}</button>
                  </div>
                )}
              </div>
            )}
            {!loading && view === "board" && lanes.length > 0 && (
              <StageTabs
                stages={lanes.map((l) => ({ key: l.key, label: l.label, count: l.families.length, color: l.dot }))}
                active={activeLane}
                onPick={(k) => scrollTo(lanes.findIndex((l) => l.key === k))}
              />
            )}
        </div>

        <div className="oc-root" style={{ padding: "4px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
          {!loading && inProgram.length > 0 && (
            <div className="oc-tiles ofa-tiles">
              {tiles.map((t) => (
                <button key={t.key} type="button" className="oc-tile" aria-pressed={filter === t.key}
                  onClick={() => setFilter(filter === t.key && t.key !== "all" ? "all" : t.key)}
                  style={{ background: t.bg }}>
                  <b>{t.count}</b><span>{t.label}</span>
                </button>
              ))}
            </div>
          )}

          {!loading && inProgram.length > 0 && (counts.behind > 0 || (wholeTeam && view === "board")) && (
            <div className="oc-chips">
              {counts.behind > 0 && (
                <button type="button" className="oc-chip" aria-pressed={filter === "behind"} onClick={() => setFilter(filter === "behind" ? "all" : "behind")}>
                  Behind on payments · {counts.behind}
                </button>
              )}
              {wholeTeam && view === "board" && (
                <button type="button" className="oc-chip" aria-pressed={grouped} onClick={() => setGrouped((g) => !g)}>
                  Group by {program === "kdh" ? "debt expert" : "case manager"}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="oc-root" style={{ padding: "12px 16px 0" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 130 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
          ) : visible.length === 0 && term ? (
            <div className="oc-panel" style={{ alignItems: "flex-start", marginBottom: 130 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>No family matches "{q.trim()}".</span>
              <button type="button" className="oc-btn" onClick={() => setQ("")}>Clear search</button>
            </div>
          ) : visible.length === 0 ? (
            <div style={{ paddingBottom: 130 }}>
              <EmptyState
                stageColor={role.accent}
                message={`No families assigned to you as ${role.label}${filter !== "all" ? " match this filter" : " yet"}.`}
                buttonLabel="Add a note"
                onAdd={() => openCapture("add")}
              />
            </div>
          ) : view === "list" ? (
            <div className="ofa-list" style={{ paddingBottom: 130 }}>
              {listed.hot.length > 0 && <div className="ofa-lab">Needs attention · {listed.hot.length}</div>}
              {listed.hot.slice(0, limit).map((f) => <FamRow key={f.id} f={f} showOwner={wholeTeam} onOpen={open} onHold={setHeld} />)}
              {listed.rest.length > 0 && listed.hot.length < limit && (
                <>
                  {listed.hot.length > 0 && <div className="ofa-lab">{term ? "Matches" : "Everyone else"} · {listed.rest.length}</div>}
                  {listed.rest.slice(0, Math.max(0, limit - listed.hot.length)).map((f) => <FamRow key={f.id} f={f} showOwner={wholeTeam} onOpen={open} onHold={setHeld} />)}
                </>
              )}
              {visible.length > limit && (
                <button type="button" className="ofa-more" onClick={() => setLimit((n) => n + 60)}>Show more · {visible.length - limit} left</button>
              )}
            </div>
          ) : (
            <>
              {lanes.length > 1 && <LaneDots count={lanes.length} index={laneIdx} onGo={(i) => scrollTo(i)} />}
              <div ref={lanesRef} className="oc-lanes" tabIndex={0} aria-label="Stages. Swipe, drag or use the arrow keys." style={{ paddingTop: 10, paddingBottom: 130, alignItems: "flex-start" }}>
                {lanes.map((lane) => (
                  <LaneColumn key={lane.key} lane={lane} grouped={grouped && wholeTeam} single={lanes.length === 1}
                    onOpen={open} onHold={setHeld} />
                ))}
              </div>
            </>
          )}
        </div>

        <QuickSheet family={held} onClose={() => setHeld(null)} onOpen={(f) => { setHeld(null); open(f); }}
          onNote={(f) => { setHeld(null); openCapture("add", { id: f.id, name: f.name }); }} />
      </IonContent>
    </IonPage>
  );
}

/** One family in the list: the name never gives way; one status pill; a
 *  quiet line under it. Tap opens, press and hold for quick actions. */
const FamRow = memo(function FamRow({ f, showOwner, onOpen, onHold }: { f: Family; showOwner: boolean; onOpen: (f: Family) => void; onHold: (f: Family) => void }) {
  const { held, bind } = useLongPress(() => onHold(f), () => onOpen(f));
  const chip = statusChip(f);
  const owner = showOwner ? ownerOf(f) : null;
  const sub = [stageLabel(f.kind, stageOf(f)), owner, activityText(f) ?? "No notes yet"].filter(Boolean).join(" · ");
  return (
    <button type="button" className={`ofa-row${held ? " is-held" : ""}`} aria-label={`${f.name}. Tap to open, press and hold for quick actions`} {...bind}>
      <span className="ofa-av" aria-hidden="true">{initialsOf(f.name)}</span>
      <span className="ofa-t"><b>{f.name}</b><small>{sub}</small></span>
      {chip && <Badge tone={chip.tone}>{chip.text}</Badge>}
    </button>
  );
});

function LaneColumn({ lane, grouped, single, onOpen, onHold }: {
  lane: Lane; grouped: boolean; single: boolean; onOpen: (f: Family) => void; onHold: (f: Family) => void;
}) {
  const groups = useMemo(() => {
    if (!grouped) return [{ owner: null as string | null, families: lane.families }];
    const m = new Map<string, Family[]>();
    for (const f of lane.families) {
      const o = ownerOf(f) ?? "Unassigned";
      if (!m.has(o)) m.set(o, []);
      m.get(o)!.push(f);
    }
    return [...m.entries()]
      .sort(([a], [b]) => (a === "Unassigned" ? 1 : b === "Unassigned" ? -1 : a.localeCompare(b)))
      .map(([owner, families]) => ({ owner, families }));
  }, [grouped, lane.families]);

  return (
    <section className="oc-lane" aria-label={`${lane.label}, ${lane.families.length}`}
      style={{ background: lane.bg, ...(single ? { flexBasis: "100%", maxWidth: "none" } : null) }}>
      <div className="oc-lane-head">
        <b><i style={{ background: lane.dot }} />{lane.label}</b>
        <em>{lane.families.length}</em>
      </div>
      {groups.map((g) => (
        <div key={g.owner ?? "all"} style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {g.owner && (
            <div className="oc-group"><Initials name={g.owner === "Unassigned" ? "?" : g.owner} /><span className="ofa-gname">{g.owner}</span><span>· {g.families.length}</span></div>
          )}
          {g.families.map((f) => <OrchardCard key={f.id} family={f} onOpen={onOpen} onHold={onHold} />)}
        </div>
      ))}
    </section>
  );
}

const OrchardCard = memo(function OrchardCard({ family: f, onOpen, onHold }: { family: Family; onOpen: (f: Family) => void; onHold: (f: Family) => void }) {
  const { held, bind } = useLongPress(() => onHold(f), () => onOpen(f));
  const place = [f.city, f.state].filter(Boolean).join(", ");
  const showProgram = f.programLabel && !/^(collective kindness|kosher debt help)$/i.test(f.programLabel) ? f.programLabel : null;
  const meta = [place, showProgram].filter(Boolean).join(" · ");
  const owner = ownerOf(f);
  const chip = statusChip(f);
  const badges = crossBadges(f);
  // Amount only when the row carries a real figure: debt on KDH, the
  // monthly net on CK.
  const debt = (f.estimatedDebt ?? 0) > 0 ? f.estimatedDebt! : null;
  const net = typeof f.currentMonthlyNet === "number" ? f.currentMonthlyNet : null;

  return (
    <button type="button" className={`oc-card${held ? " is-held" : ""}`} aria-label={`${f.name}. Tap to open, press and hold for quick actions`} {...bind}>
      <div className="oc-card-top">
        <div style={{ minWidth: 0 }}>
          <div className="oc-card-name">{f.name}</div>
          {meta && <div className="oc-card-meta" style={{ marginTop: 2 }}>{meta}</div>}
        </div>
        {debt != null ? (
          <span className="oc-card-amt">{money(debt)}</span>
        ) : net != null ? (
          <span className="oc-card-amt" style={{ color: net < 0 ? "var(--oc-bad)" : "var(--oc-ok)", textAlign: "right" }}>
            {net < 0 ? "-" : "+"}{money(Math.abs(net))}
            <span style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "var(--oc-mid)", letterSpacing: 0 }}>a month</span>
          </span>
        ) : null}
      </div>
      {(badges.length > 0 || chip) && (
        <div className="oc-badges">
          {badges.map((b) => <Badge key={b.text} tone={b.tone}>{b.text}</Badge>)}
          {chip && <Badge tone={chip.tone}>{chip.text}</Badge>}
        </div>
      )}
      <div className="oc-card-foot">
        <span className="oc-who">
          {owner ? <><Initials name={owner} />{owner}</> : <span style={{ color: "var(--oc-bad)" }}>No {ownerRoleLabel(f).toLowerCase()}</span>}
        </span>
      </div>
      <ActivityLine kind="note" text={activityText(f) ?? "No notes yet"} />
    </button>
  );
});

function QuickSheet({ family: f, onClose, onOpen, onNote }: {
  family: Family | null; onClose: () => void; onOpen: (f: Family) => void; onNote: (f: Family) => void;
}) {
  const tel = (f?.phone || "").replace(/[^0-9+]/g, "");
  const wa = tel.replace(/^\+/, "").replace(/^0+/, "");
  const email = (f?.email || "").trim();
  const off = (on: boolean) => (on ? undefined : ("true" as const));
  return (
    <Sheet open={!!f} onClose={onClose} title={f?.name ?? ""}
      aside={f ? <button type="button" className="oc-link" onClick={() => onOpen(f)} style={{ color: "var(--oc-forest)", background: "transparent", padding: "0 4px" }}>Open profile</button> : null}>
      {f && (
        <>
          <span style={{ fontSize: 13, color: "var(--oc-mid)", fontWeight: 600, marginTop: -6 }}>
            {stageLabel(f.kind, stageOf(f))}{ownerOf(f) ? ` · ${ownerOf(f)}` : ""}
          </span>
          <div className="oc-actions">
            <a className="is-primary" href={tel ? `tel:${tel}` : undefined} aria-disabled={off(!!tel)}><Icon name="call" size={18} color="currentColor" />Call</a>
            <a href={tel ? `sms:${tel}` : undefined} aria-disabled={off(!!tel)}><Icon name="text" size={18} />Text</a>
            <a href={wa ? `https://wa.me/${wa}` : undefined} target="_blank" rel="noreferrer" aria-disabled={off(!!wa)}><Icon name="whatsapp" size={18} />WhatsApp</a>
            <a href={email ? `mailto:${email}` : undefined} aria-disabled={off(!!email)}><Icon name="email" size={18} />Email</a>
            <button type="button" onClick={() => onNote(f)}><Icon name="note" size={18} />Add a note</button>
            <button type="button" onClick={() => onOpen(f)}><Icon name="open" size={18} color="var(--oc-forest)" />Open profile</button>
          </div>
          <span style={{ fontSize: 12, color: "var(--oc-mid)", textAlign: "center", fontWeight: 600 }}>
            Stage moves happen in the CRM for now. Tap a card to open it.
          </span>
        </>
      )}
    </Sheet>
  );
}
