import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { fetchKdhHome } from "@/lib/kdhApi";
import { fetchKdhPlus } from "@/lib/kdhPlusApi";

export const KDH_KEY = ["kdhHome"] as const;

export function useKdhHome() {
  return useQuery({ queryKey: KDH_KEY, queryFn: fetchKdhHome, staleTime: 60_000, retry: 1 });
}

/** KDH Plus (budget + budgeter). The page keeps this fresh as the client
 *  moves; the homework card only reads it. Quiet on an older CRM build. */
export const KDH_PLUS_KEY = ["kdhPlus"] as const;
export function useKdhPlus() {
  return useQuery({ queryKey: KDH_PLUS_KEY, queryFn: () => fetchKdhPlus(false), staleTime: 60_000, retry: false });
}

export const fmtDay = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/** The real Kosher Debt Help lockup, with a quiet line under it. */
export function KdhBrand({ sub }: { sub?: ReactNode }) {
  return (
    <span className="ocf2-brand ocf2-brand--logo">
      <img src="/logos/kdh.png" alt="Kosher Debt Help by Collective Kindness" />
      {sub ? <span>{sub}</span> : null}
    </span>
  );
}
