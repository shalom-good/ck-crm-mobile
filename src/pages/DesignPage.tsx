import { useState } from "react";
import { IonPage, IonContent } from "@ionic/react";
import { CalendarBlank, ChatCircle, Coins, Phone, Sparkle } from "@phosphor-icons/react";
import { MOCK_PAYMENTS, MOCK_RESOURCES } from "@/lib/mockData";
import { Av, Bars, Btn, Card, CardTitle, Chips, Empty, Evt, Eyebrow, HouseArt, Pill, PlantArt, Row, Strip, Track, type Tint } from "@/components/gv";
import { AskBar } from "@/components/AskBar";
import { PaymentRow } from "@/components/PaymentRow";
import { ResourceRow } from "@/components/ResourceRow";

const PILL_TINTS: Tint[] = ["none", "mint", "sky", "apricot", "plum", "rose", "yellow", "lavender", "lime", "up", "down", "go"];
const WEEKS = [
  { label: "W1", value: 420 }, { label: "W2", value: 610 }, { label: "W3", value: 380 }, { label: "W4", value: 740 },
  { label: "W5", value: 520 }, { label: "W6", value: 660 }, { label: "W7", value: 910, on: true }, { label: "W8", value: 580 },
];
const AVG = Math.round(WEEKS.reduce((s, w) => s + w.value, 0) / WEEKS.length);

/** The Grove system in isolation. Open at /design. */
export function DesignPage() {
  const [chip, setChip] = useState<"all" | "due" | "paid">("all");
  const [picked, setPicked] = useState("Leah Herman");

  return (
    <IonPage>
      <IonContent>
        <div style={{ padding: "calc(env(safe-area-inset-top) + 18px) 16px 0" }}>
          <h1 className="gv-h1">Grove</h1>
          <div className="gv-meta" style={{ marginTop: 4 }}>The app's design system · every primitive once</div>
        </div>

        <div style={{ padding: "4px 16px 120px" }}>
          <Eyebrow>Stat strip</Eyebrow>
          <Strip i={0} stats={[{ label: "Billed", value: 1060, fmt: (n) => `$${n.toLocaleString("en-US")}` }, { label: "Collected", value: 640, fmt: (n) => `$${n}` }, { label: "Overdue", value: 240, fmt: (n) => `$${n}`, warn: true }]} />

          <Eyebrow>Bars · one coral, dashed average</Eyebrow>
          <Card i={1}>
            <CardTitle right={<Pill tint="up" sm>+12%</Pill>}>Collected by week</CardTitle>
            <Bars bars={WEEKS} avg={{ value: AVG, label: `avg $${AVG}` }} />
          </Card>

          <Eyebrow>Track · done, current (lime), blocker</Eyebrow>
          <Card i={2}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><div className="gv-meta" style={{ marginBottom: 6 }}>Journey · step 4 of 6 is live</div><Track total={6} done={3} current={3} /></div>
              <div><div className="gv-meta" style={{ marginBottom: 6 }}>With a blocker on step 3</div><Track total={6} done={2} bad={2} /></div>
              <div><div className="gv-meta" style={{ marginBottom: 6 }}>Single meter · 62%</div><div className="gv-track" style={{ flex: "none" }}><i style={{ right: "38%" }} /></div></div>
            </div>
          </Card>

          <Eyebrow>Pills · every tint</Eyebrow>
          <Card i={3}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PILL_TINTS.map((t, k) => <Pill key={t} tint={t} i={k}>{t === "none" ? "plain" : t}</Pill>)}
              <Pill sm>small</Pill>
            </div>
          </Card>

          <Eyebrow>Buttons · one forest primary per screen</Eyebrow>
          <Card i={4}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Btn block>Primary</Btn>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn ghost style={{ flex: 1 }}>Ghost</Btn>
                <Btn soft style={{ flex: 1 }}>Soft</Btn>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Btn sm>Small</Btn>
                <Btn ghost sm>Small ghost</Btn>
                <Btn disabled sm>Disabled</Btn>
                <button className="gv-link">Text link</button>
              </div>
            </div>
          </Card>

          <Eyebrow>Chips · filter row</Eyebrow>
          <Chips items={[{ key: "all", label: "All", count: 8 }, { key: "due", label: "Due", count: 3 }, { key: "paid", label: "Paid", count: 5 }]} active={chip} onChange={setChip} />

          <Eyebrow>Events · pastel schedule rows</Eyebrow>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Evt tint="yellow" i={5} icon={<CalendarBlank size={16} weight="bold" />} title="Budget meeting · Peterson" sub="Today, 2:00 PM" right={<Pill sm>30 min</Pill>} />
            <Evt tint="lavender" i={6} icon={<Phone size={16} weight="bold" />} title="Debt expert call · Alexander" sub="Tomorrow, 10:30 AM" />
            <Evt tint="mint" i={7} icon={<Coins size={16} weight="bold" />} title="Payment logged · Watson" sub="$180 · Zelle" />
            <Evt tint="sky" i={8} icon={<ChatCircle size={16} weight="bold" />} title="New chat message · McKinney" sub="2m ago" />
          </div>

          <Eyebrow>Avatars · square for families, round for people</Eyebrow>
          <Card i={9}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Av name="Andrew Peterson" size={40} />
              <Av name="Ralph Edwards" size={40} />
              <Av name="Leslie Alexander" size={40} />
              <Av name="Jacob Jones" size={40} />
              <Av name="Leah Herman" size={40} round />
              <Av name="Mordy Richler" size={40} round />
              <Av name="Levi Pinson" size={40} round tint="lime" />
              <Av name="Collective Kindness" size={56} />
            </div>
          </Card>

          <Eyebrow>Rows · hairlines inside a card</Eyebrow>
          <Card i={10}>
            {["Leah Herman", "Yossi Katzman", "Mordy Richler"].map((n) => (
              <Row key={n} onClick={() => setPicked(n)}>
                <Av name={n} size={36} round />
                <div className="t"><b>{n}</b><span>Case manager · 12 families</span></div>
                {picked === n ? <Pill tint="lime" sm>viewing</Pill> : <span className="gv-link">View as</span>}
              </Row>
            ))}
          </Card>

          <Eyebrow>Focal card · forest with a lime pill</Eyebrow>
          <AskBar onOpen={() => {}} />

          <Eyebrow>List rows</Eyebrow>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <PaymentRow payment={MOCK_PAYMENTS[0]} i={11} />
            <ResourceRow resource={MOCK_RESOURCES[0]} i={12} />
          </div>

          <Eyebrow>Empty · one quiet line, one text action</Eyebrow>
          <Empty action="Add a note" onAction={() => {}}>Nothing here yet.</Empty>

          <Eyebrow>Notices</Eyebrow>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="gv-note"><i>i</i><span><b>Heads up.</b> The quiet notice replaces harsh error boxes.</span></div>
            <div className="gv-gentle">Something didn't save. Try again in a moment.</div>
          </div>

          <Eyebrow>Drawings · sketch themselves in</Eyebrow>
          <Card i={13}>
            <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
              <HouseArt width={150} />
              <PlantArt width={110} />
            </div>
          </Card>

          <Eyebrow>Type</Eyebrow>
          <Card i={14}>
            <div className="gv-eyebrow">Eyebrow 11 / 700</div>
            <h1 className="gv-h1" style={{ marginTop: 8 }}>Screen title 28</h1>
            <h2 className="gv-h2" style={{ marginTop: 8 }}>Card title 17</h2>
            <p className="gv-sub" style={{ marginTop: 6 }}>Body 14.5 in mid. Plus Jakarta Sans everywhere, nothing else.</p>
            <div className="gv-meta" style={{ marginTop: 6 }}>Meta 12.5 in quiet</div>
            <div className="tnum" style={{ marginTop: 10, fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", color: "var(--gv-ink)" }}>$12,480 <span style={{ color: "var(--gv-coral)" }}>−$240</span></div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, color: "var(--gv-go)", fontSize: 13, fontWeight: 700 }}><Sparkle size={14} weight="fill" /> Forest is the action colour</div>
          </Card>
        </div>
      </IonContent>
    </IonPage>
  );
}
