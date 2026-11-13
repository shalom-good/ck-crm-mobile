// AiSummary — auto-running thorough AI rundown for a family / JF client.
// Fires the moment the detail page mounts (mirrors the CRM side panel).
// Renders strict Markdown (## headers, bullets, **bold**) in a white
// Grove card: "AI rundown" + a lime "auto" pill, ink headers, quiet body.
import { useEffect, useRef, useState } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import { fetchFamilyAiSummary } from "@/lib/api";
import { Pill } from "@/components/gv";

type State =
  | { kind: "loading" }
  | { kind: "ok"; markdown: string }
  | { kind: "not-configured" }
  | { kind: "error"; message: string };

export function AiSummary({ id, title = "AI rundown", className = "gv-card" }: { id: string; title?: string; className?: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const ran = useRef<string | null>(null);

  async function run() {
    setState({ kind: "loading" });
    const res = await fetchFamilyAiSummary(id);
    if (res.error === "not_configured" || (!res.summaryMarkdown && res.message?.includes("ANTHROPIC"))) {
      setState({ kind: "not-configured" });
    } else if (res.summaryMarkdown) {
      setState({ kind: "ok", markdown: res.summaryMarkdown });
    } else {
      setState({ kind: "error", message: res.message || res.error || "Could not generate." });
    }
  }

  useEffect(() => {
    if (ran.current === id) return;
    ran.current = id;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Not configured is an ops state, not a user state: show nothing.
  if (state.kind === "not-configured") return null;

  return (
    <div className={className}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: state.kind === "ok" ? 10 : 8, minWidth: 0 }}>
        <h3 className="gv-h2" style={{ fontSize: 15.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</h3>
        <Pill tint="lime" sm>auto</Pill>
        {state.kind === "ok" && (
          <button type="button" onClick={run} aria-label="Regenerate"
            style={{ marginLeft: "auto", background: "none", border: 0, color: "var(--gv-quiet)", display: "inline-flex", padding: 4, cursor: "pointer", flex: "none" }}>
            <ArrowClockwise size={16} weight="bold" />
          </button>
        )}
      </div>

      {state.kind === "loading" && (
        <div style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--gv-mid)", fontSize: 13.5, lineHeight: 1.45 }}>
          <span className="ck-spin" style={{ width: 14, height: 14, flex: "none" }} /> Reading the record and writing the rundown…
        </div>
      )}
      {state.kind === "error" && (
        <div style={{ fontSize: 13.5, color: "var(--gv-mid)", lineHeight: 1.45 }}>
          Couldn’t generate. <button type="button" className="gv-link" onClick={run}>Try again</button>
        </div>
      )}
      {state.kind === "ok" && <Markdown text={state.markdown} />}

      <style>{`
        .ai-md { font-size: 13.5px; line-height: 1.55; color: var(--gv-text); overflow-wrap: anywhere; }
        .ai-md h2 { font-size: 14px; font-weight: 700; letter-spacing: -0.01em; color: var(--gv-ink); margin: 16px 0 6px; }
        .ai-md h2:first-child { margin-top: 0; }
        .ai-md p { margin: 0 0 8px; }
        .ai-md ul { margin: 4px 0 8px; padding-left: 18px; }
        .ai-md li { margin-bottom: 4px; }
        .ai-md strong { font-weight: 700; color: var(--gv-ink); }
        .ai-md table { width: 100%; border-collapse: collapse; margin: 6px 0 8px; font-size: 12.5px; }
        .ai-md th { font-weight: 700; color: var(--gv-ink); }
        .ai-md th, .ai-md td { padding: 5px 6px; border-bottom: 1px solid var(--gv-hair); text-align: left; vertical-align: top; }
        .ai-md code { font-size: 12px; background: var(--gv-inset); padding: 1px 5px; border-radius: 6px; }
      `}</style>
    </div>
  );
}

function inlineMd(text: string): string {
  const esc = String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
}

function Markdown({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("## ")) { out.push(<h2 key={key++}>{line.slice(3).trim()}</h2>); i++; continue; }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) { items.push(lines[i].slice(2)); i++; }
      out.push(<ul key={key++}>{items.map((it, j) => <li key={j} dangerouslySetInnerHTML={{ __html: inlineMd(it) }} />)}</ul>);
      continue;
    }
    if (line.startsWith("|") && i + 1 < lines.length && /^\s*\|[-:\s|]+\|/.test(lines[i + 1])) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i].split("|").slice(1, -1).map((c) => c.trim());
        if (!/^[-:\s]+$/.test(cells.join(""))) rows.push(cells);
        i++;
      }
      const [head, ...bodyRows] = rows;
      out.push(
        <table key={key++}>
          {head && <thead><tr>{head.map((c, j) => <th key={j}>{c}</th>)}</tr></thead>}
          <tbody>{bodyRows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k} dangerouslySetInnerHTML={{ __html: inlineMd(c) }} />)}</tr>)}</tbody>
        </table>,
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith("## ") && !lines[i].startsWith("- ") && !lines[i].startsWith("* ") && !lines[i].startsWith("|")) { para.push(lines[i]); i++; }
    if (para.length) out.push(<p key={key++} dangerouslySetInnerHTML={{ __html: inlineMd(para.join(" ")) }} />);
  }
  return <div className="ai-md">{out}</div>;
}
