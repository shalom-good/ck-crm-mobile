import { useRef, useState, type ReactNode } from "react";
import { Phone, ChatCircle, Archive, Check } from "@phosphor-icons/react";
import { springCSS, touch } from "@/theme/tokens";
import { tapLight, success } from "@/lib/haptics";

interface Props {
  children: ReactNode;
  /** Label of the stage a right-swipe advances to. Hidden if null (terminal). */
  advanceLabel?: string | null;
  advanceColor?: string;
  onAdvance?: () => void;
  onCall?: () => void;
  onMessage?: () => void;
  onArchive?: () => void;
}

const ACTION_W = touch.swipeAction; // 56dp per action
const LEFT_REVEAL = ACTION_W * 3; // Call + Message + Archive
const COMMIT = 96; // right-swipe distance that commits an advance

/**
 * One card row with two gestures:
 *  - swipe right  → reveals a green check + stage name, commits an advance on release past threshold (haptic)
 *  - swipe left   → snaps open to three tap targets: Call, Message, Archive
 * Both gestures have a kebab-menu fallback elsewhere, per the commandments.
 */
export function SwipeRow({
  children,
  advanceLabel,
  advanceColor = "#3F7355",
  onAdvance,
  onCall,
  onMessage,
  onArchive,
}: Props) {
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef(0);
  const startX = useRef(0);
  const axisLock = useRef<"h" | "v" | null>(null);
  const committed = useRef(false);
  const didDrag = useRef(false);

  const canAdvance = !!advanceLabel && !!onAdvance;

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = e.clientX;
    startX.current = x;
    axisLock.current = null;
    committed.current = false;
    didDrag.current = false;
    // Keep receiving move/up even when the finger leaves the card bounds.
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* unsupported */ }
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - start.current;
    if (Math.abs(dx) > 6) didDrag.current = true;
    let next = startX.current + dx;
    // clamp: left reveal to -LEFT_REVEAL, right drag a touch past COMMIT
    if (next < -LEFT_REVEAL) next = -LEFT_REVEAL - (next + LEFT_REVEAL) * 0.2;
    if (next > 0 && !canAdvance) next = next * 0.2; // rubber-band if no advance
    if (next > COMMIT + 24) next = COMMIT + 24 + (next - COMMIT - 24) * 0.2;
    setX(next);
  };

  const settle = async () => {
    setDragging(false);
    if (x >= COMMIT && canAdvance && !committed.current) {
      committed.current = true;
      await success();
      // fling the card out, then reset position for the next stage's list
      setX(window.innerWidth);
      setTimeout(() => {
        onAdvance?.();
        setX(0);
      }, 220);
      return;
    }
    if (x <= -LEFT_REVEAL / 2) {
      setX(-LEFT_REVEAL); // snap open
      tapLight();
      return;
    }
    setX(0); // spring closed
  };

  const close = () => setX(0);

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 16 }}>
      {/* right-swipe advance affordance */}
      {canAdvance && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            paddingLeft: 20,
            gap: 10,
            backgroundColor: advanceColor,
            color: "#fff",
            opacity: x > 8 ? 1 : 0,
          }}
        >
          <Check size={22} weight="bold" />
          <span style={{ fontWeight: 600, fontSize: 15 }}>{advanceLabel}</span>
        </div>
      )}

      {/* left-swipe action rail */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: 0,
          width: LEFT_REVEAL,
          display: "flex",
        }}
      >
        <SwipeAction color="var(--ck-tint)" label="Call" onClick={() => { onCall?.(); close(); }}>
          <Phone size={20} weight="regular" color="#fff" />
        </SwipeAction>
        <SwipeAction color="#6B6B70" label="Message" onClick={() => { onMessage?.(); close(); }}>
          <ChatCircle size={20} weight="regular" color="#fff" />
        </SwipeAction>
        <SwipeAction color="var(--ck-danger)" label="Archive" onClick={() => { onArchive?.(); close(); }}>
          <Archive size={20} weight="regular" color="#fff" />
        </SwipeAction>
      </div>

      {/* the card itself */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={settle}
        onPointerCancel={settle}
        onClickCapture={(e) => {
          // Swallow the tap that ends a swipe so the card doesn't also navigate.
          if (didDrag.current) {
            e.stopPropagation();
            e.preventDefault();
            didDrag.current = false;
          }
        }}
        style={{
          transform: `translateX(${x}px)`,
          transition: dragging ? "none" : `transform ${springCSS.duration}ms ${springCSS.easing}`,
          touchAction: "pan-y",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function SwipeAction({
  color,
  label,
  onClick,
  children,
}: {
  color: string;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      style={{
        width: ACTION_W,
        flex: 1,
        backgroundColor: color,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        border: "none",
        cursor: "pointer",
      }}
    >
      {children}
      <span style={{ color: "#fff", fontSize: 11, fontWeight: 600 }}>{label}</span>
    </button>
  );
}
