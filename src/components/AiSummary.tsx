// AiSummary — auto-running thorough AI rundown for a family / JF client.
// Fires the moment the detail page mounts (mirrors the CRM side panel).
// Renders strict Markdown (## headers, bullets, **bold**) with bold,
// easy-to-scan section headers.
import { useEffect, useRef, useState } from "react";
import { Sparkle, ArrowClockwise } from "@phosphor-icons/react";
import { fetchFamilyAiSummary } from "@/lib/api";

type State =
  | { kind: "loading" }
  | { kind: "ok"; markdown: string }
  | { kind: "not-configured" }
  | { kind: "error"; message: string };

export function AiSummary({ id }: { id: string }) {
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

  const card: React.CSSProperties = {
    background: "var(--ck-card)", border: "1px solid var(--ck-hairline)",
    borderRadius: 16, padding: 16, boxShadow: "0 1px 2px rgba(17,17,26,0.04)",
  };

  // Not configured is an ops state, not a user state: show nothing.
  if (state.kind === "not-configured") return null;

  return (
    <div style={{ ...card, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: state.kind === "ok" ? 10 : 0 }}>
        <Sparkle size={15} weight="fill" color="var(--ck-tint)" />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--ck-muted)" }}>AI summary</span>
        {state.kind === "ok" && (
          <button type="button" onClick={run} aria-label="Regenerate"
            style={{ marginLeft: "auto", background: "none", border: 0, color: "var(--ck-muted)", display: "inline-flex", padding: 4 }}>
            <ArrowClockwise size={15} />
          </button>
        )}
      </div>

      {state.kind === "loading" && (
        <div style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--ck-muted)", fontSize: 13 }}>
          <span className="ai-spin" /> Reading the record and writing the rundown…
        </div>
      )}
      {state.kind === "not-configured" && (
        <div style={{ fontSize: 12.5, color: "var(--ck-muted)", lineHeight: 1.5 }}>
          AI summary isn’t turned on yet. The <code>ANTHROPIC_API_KEY</code> edge secret needs to be set on Supabase.
        </div>
      )}
      {state.kind === "error" && (
        <div style={{ fontSize: 12.5, color: "var(--ck-danger)" }}>
          Couldn’t generate. <button type="button" onClick={run} style={{ background: "none", border: 0, color: "var(--ck-tint)", fontWeight: 600 }}>Try again</button>
        </div>
      )}
      {state.kind === "ok" && <Markdown text={state.markdown} />}

      <style>{`
        .ai-spin { width: 13px; height: 13px; border: 2px solid var(--ck-hairline); border-top-color: var(--ck-tint); border-radius: 999px; animation: ai-spin 0.7s linear infinite; display: inline-block; }
        @keyframes ai-spin { to { transform: rotate(360deg); } }
        .ai-md { font-size: 13.5px; line-height: 1.55; color: var(--ck-body); }
        .ai-md h2 { font-size: 14.5px; font-weight: 800; letter-spacing: -0.01em; color: var(--ck-title); margin: 16px 0 7px; padding-bottom: 5px; border-bottom: 1.5px solid var(--ck-hairline); }
        .ai-md h2:first-child { margin-top: 0; }
        .ai-md p { margin: 0 0 8px; }
        .ai-md ul { margin: 4px 0 8px; padding-left: 18px; }
        .ai-md li { margin-bottom: 4px; }
        .ai-md strong { font-weight: 700; color: var(--ck-title); }
        .ai-md table { width: 100%; border-collapse: collapse; margin: 6px 0 8px; font-size: 12px; }
        .ai-md th, .ai-md td { padding: 4px 6px; border-bottom: 1px solid var(--ck-hairline); text-align: left; }
        .ai-md code { font-size: 11.5px; background: var(--ck-bg); padding: 1px 5px; border-radius: 4px; }
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
