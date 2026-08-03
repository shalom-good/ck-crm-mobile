import React, { createContext, useContext, useEffect, useRef, useState } from "react";

/**
 * Cross-screen UI state: the global Capture sheet (the raised ＋ "add anything"
 * with talk-to-text) and a toast. Rendered once at app root, opened anywhere.
 */
export type AIMode = "ask" | "add";
export interface CaptureClient { id: string; name: string }

interface UIContextValue {
  captureOpen: boolean;
  captureMode: AIMode;
  /** The client this capture is about (pre-filled when opened from a client
   *  card / detail). null = generic capture (pick a client in the sheet). */
  captureClient: CaptureClient | null;
  /** Opens the AI hub sheet. Defaults to Ask (the center button); pass "add"
   *  from explicit add actions, optionally with the client it's about. */
  openCapture: (mode?: AIMode, client?: CaptureClient | null) => void;
  closeCapture: () => void;
  toast: string | null;
  showToast: (msg: string) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState<AIMode>("ask");
  const [captureClient, setCaptureClient] = useState<CaptureClient | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const value: UIContextValue = {
    captureOpen,
    captureMode,
    captureClient,
    openCapture: (mode: AIMode = "ask", client: CaptureClient | null = null) => {
      setCaptureMode(mode);
      setCaptureClient(client);
      setCaptureOpen(true);
    },
    closeCapture: () => setCaptureOpen(false),
    toast,
    showToast,
  };
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
