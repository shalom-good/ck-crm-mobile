import { useState } from "react";
import { IonPage, IonContent } from "@ionic/react";
import { MOCK_FAMILIES, MOCK_PAYMENTS, MOCK_RESOURCES } from "@/lib/mockData";
import { computeAttention } from "@/lib/attention";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/Avatar";
import { Pill } from "@/components/Pill";
import { HeroCard } from "@/components/HeroCard";
import { StatTile } from "@/components/Tint";
import { FilterPill } from "@/components/FilterPill";
import { UsersThree } from "@phosphor-icons/react";
import { SegTabs } from "@/components/SegTabs";
import { FamilyCard } from "@/components/FamilyCard";
import { AttentionCard } from "@/components/AttentionCard";
import { PaymentRow } from "@/components/PaymentRow";
import { ResourceRow } from "@/components/ResourceRow";
import { AskBar } from "@/components/AskBar";
import { SwipeRow } from "@/components/SwipeRow";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard } from "@/components/Skeleton";

/** Every component in isolation. Open at /design. */
export function DesignPage() {
  const [seg, setSeg] = useState("all");
  const f = MOCK_FAMILIES[0];

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--ck-bg)" } as React.CSSProperties}>
        <div style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}><Header title="Design" subtitle="component gallery" /></div>
        <div style={{ padding: "8px 16px 120px", display: "flex", flexDirection: "column", gap: 28 }}>
          <Section title="Hero card"><HeroCard label="Collected this week" amount={640} deltaLabel="$180" deltaUp deltaSuffix="vs last week" data={[11,12,11.6,13,12.4,14.2,13.6,15,14.4,16.1,15.2,17]} dateLabels={["May 19","May 26","Jun 2","Jun 9","Jun 16"]} stats={[{label:"Money in",value:"$640",up:true},{label:"Outstanding",value:"$420",up:false}]} /></Section>

          <Section title="Pastel stat tiles">
            <div style={{ display: "flex", gap: 12 }}>
              <StatTile tint="lilac" value="3" label="Families" icon={<UsersThree size={18} weight="fill" color="#C2531F" />} />
              <StatTile tint="mint" value="$640" label="Collected" delta="+12%" />
              <StatTile tint="rose" value="1" label="Behind" delta="needs you" deltaUp={false} />
            </div>
          </Section>

          <Section title="Filter pills">
            <div style={{ display: "flex", gap: 8 }}><FilterPill label="Today" /><FilterPill label="All types" /></div>
          </Section>

          <Section title="Dark AI card"><AskBar onOpen={() => {}} /></Section>

          <Section title="Avatars">
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Avatar name="Andrew Peterson" size={48} />
              <Avatar name="Ralph Edwards" size={48} />
              <Avatar name="Leslie Alexander" size={48} />
              <Avatar name="Jacob Jones" size={96} />
            </div>
          </Section>

          <Section title="Pills">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Pill label="Behind" tone="red" /><Pill label="New intake" /><Pill label="VIP" /><Pill label="Plan ready" /><Pill label="Needs budget" /><Pill label="Stable" />
            </div>
          </Section>

          <Section title="Filter tabs">
            <SegTabs active={seg} onChange={setSeg} segs={[{ key: "all", label: "All", count: 8 }, { key: "attention", label: "Needs attention", count: 4 }, { key: "behind", label: "Behind", count: 2, dot: "#C2531F" }]} />
          </Section>

          <Section title="Family card + swipe"><SwipeRow onCall={() => {}} onMessage={() => {}} onArchive={() => {}}><FamilyCard family={f} onOpen={() => {}} /></SwipeRow></Section>
          <Section title="Needs-me card"><AttentionCard item={computeAttention(MOCK_FAMILIES)[0]} onOpen={() => {}} /></Section>
          <Section title="Payment row"><PaymentRow payment={MOCK_PAYMENTS[0]} /></Section>
          <Section title="Resource row"><ResourceRow resource={MOCK_RESOURCES[0]} /></Section>
          <Section title="Empty state"><EmptyState stageColor="#3B7AF7" message="Nothing here yet." buttonLabel="Add a note" onAdd={() => {}} /></Section>
          <Section title="Skeleton"><SkeletonCard /></Section>
        </div>
      </IonContent>
    </IonPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "var(--ck-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>{title}</h2>
      {children}
    </div>
  );
}
