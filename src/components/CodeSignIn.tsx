import { useEffect, useRef, useState } from "react";
import { startSignIn, verifySignIn, identifierKind, type Area } from "@/lib/identityApi";
import { ApiError } from "@/lib/mobileApi";

/**
 * The one sign-in, app side: ONE field for a phone or an email → a 6-digit
 * code (WhatsApp first, email second) → onSignedIn(token, data). Code cells
 * use autocomplete="one-time-code" and inputMode="numeric". Plain errors with
 * a path forward. The parent supplies the heading for step one and anything
 * under the form (the 7-letter path, Adopt, Give).
 */
export function CodeSignIn({ area, title, sub, onSignedIn, onStep }: {
  area: Area;
  title: string;
  sub: string;
  onSignedIn: (token: string, data: any) => void | Promise<void>;
  onStep?: (step: "id" | "code") => void;
}) {
  const [step, setStep] = useState<"id" | "code">("id");
  const [id, setId] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [sent, setSent] = useState<{ channel: string; sentTo: string } | null>(null);
  const [wantEmail, setWantEmail] = useState(false);
  const [proof, setProof] = useState<string | null>(null);
  const idRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  const kind = identifierKind(id);

  useEffect(() => { onStep?.(step); const t = setTimeout(() => (step === "id" ? idRef : otpRef).current?.focus(), 300); return () => clearTimeout(t); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    if (!kind || busy) return;
    setBusy(true); setErr(null); setNote(null);
    try {
      const r = await startSignIn(id, area);
      setSent({ channel: r.channel, sentTo: r.sentTo }); setOtp(""); setStep("code");
    } catch (e) {
      const ae = e as ApiError & { data?: any };
      if (ae?.data?.useEmail) setWantEmail(true);
      setErr(ae?.status === 0 || !ae?.status ? "Could not reach us right now. Check your connection and try again." : ae.message);
    }
    setBusy(false);
  };

  const verify = async (code: string) => {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const r = await verifySignIn(id, code, area, proof);
      if (!r?.token) throw new ApiError(500, "We could not sign you in just now. Try again in a moment.");
      await onSignedIn(r.token, r);
    } catch (e) {
      const ae = e as ApiError & { data?: any };
      if (ae?.status === 409 && ae?.data?.error === "need_email") {
        setProof(ae.data.phoneProof || null); setWantEmail(true); setId(""); setStep("id"); setNote(ae.data.message);
      } else {
        setErr(ae?.status === 429 ? "Too many tries. Wait a few minutes and try again." : ae?.status ? ae.message : "Could not reach us right now. Check your connection and try again.");
      }
      setOtp(""); setBusy(false);
      otpRef.current?.focus();
    }
  };

  const viaEmailForPhone = sent?.channel === "email" && kind === "phone";
  const onFile = area === "family" ? (sent?.channel === "whatsapp" ? "If this number is on file, w" : "If this email is on file, w") : "W";
  const codeTitle = sent?.channel === "whatsapp" ? "Check WhatsApp" : "Check your email";
  const codeSub = viaEmailForPhone
    ? `We can't text codes yet, so we sent it to your email, ${sent?.sentTo}. It works for 10 minutes.`
    : sent?.channel === "whatsapp"
      ? `${onFile}e sent a 6-digit code to ${sent?.sentTo} on WhatsApp. It works for 10 minutes.`
      : `${onFile}e sent a 6-digit code to ${sent?.sentTo}. It works for 10 minutes. You can also tap the link in the email.`;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <h1 className="gv-h1 gv-rise" style={{ "--i": 1, marginTop: 22 } as React.CSSProperties}>{step === "code" ? codeTitle : title}</h1>
      <p className="gv-sub gv-rise" style={{ "--i": 2, marginTop: 6 } as React.CSSProperties}>{step === "code" ? codeSub : wantEmail ? "Enter your email. We will send a 6-digit code." : sub}</p>
      {note && step === "id" && <div className="gv-note" role="status" style={{ marginTop: 12 }}>{note}</div>}

      {step === "id" && (
        <div style={{ marginTop: 18 }}>
          <label htmlFor="ck-id" className="ck-label">{wantEmail ? "Email" : "Phone or email"}</label>
          <input
            id="ck-id"
            ref={idRef}
            type="text"
            inputMode={wantEmail ? "email" : "text"}
            autoComplete="username"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={wantEmail ? "you@example.com" : "Phone or email"}
            value={id}
            onChange={(e) => { setId(e.target.value); setErr(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") void send(); }}
            className="gv-input"
          />
          <button className="gv-btn block" style={{ marginTop: 14 }} disabled={!kind || busy} onClick={() => void send()}>
            {busy ? "Sending…" : "Send me a code"}
          </button>
        </div>
      )}

      {step === "code" && (
        <div onClick={() => otpRef.current?.focus()} style={{ marginTop: 18 }}>
          <div className="gv-codewrap">
            <input
              ref={otpRef}
              value={otp}
              onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setOtp(v); setErr(null); if (v.length === 6) void verify(v); }}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              aria-label="Your 6 digit code"
              disabled={busy}
            />
            <div className="gv-boxes" style={{ gridTemplateColumns: "repeat(6, minmax(0,1fr))" }} aria-hidden>
              {Array.from({ length: 6 }, (_, i) => (
                <b key={i} className={i === otp.length ? "focus" : otp[i] ? "filled" : "empty"}>{otp[i] || ""}</b>
              ))}
            </div>
          </div>
          {busy && <p className="gv-sub" style={{ marginTop: 10 }}>Checking…</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px", marginTop: 14, paddingLeft: 8 }}>
            <button className="gv-link" onClick={() => { setOtp(""); void startSignIn(id, area).then(() => setNote("A new code is on its way.")).catch(() => {}); }}>Send a new code</button>
            <button className="gv-link" onClick={() => { setOtp(""); setErr(null); setStep("id"); }}>Use another number or email</button>
          </div>
          {note && !err && <p className="gv-sub" style={{ marginTop: 8 }}>{note}</p>}
        </div>
      )}

      {err && <div className="gv-gentle" role="alert" style={{ marginTop: 12 }}>{err}</div>}
    </div>
  );
}
