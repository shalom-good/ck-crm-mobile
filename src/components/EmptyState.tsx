import { Empty } from "./gv";

interface Props {
  /** Kept for callers; the Grove empty state has one text action in forest, no accent fill. */
  stageColor: string;
  message?: string;
  buttonLabel?: string;
  onAdd: () => void;
  /** Deprecated alias kept so older callers still read well. */
  stageLabel?: string;
}

/** Quiet empty state: one sentence and one forest text link. No drawing,
 *  no button (DESIGN.md: empty states are one line + one text action). */
export function EmptyState({ message, buttonLabel, onAdd, stageLabel }: Props) {
  const copy = message ?? `Nothing here for ${stageLabel ?? "you"} right now.`;
  return <Empty action={buttonLabel ?? "Add something"} onAction={onAdd}>{copy}</Empty>;
}
