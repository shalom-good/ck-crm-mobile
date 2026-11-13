import { stageTone } from "@/lib/pipeline";

// sky = early stages, butter = in progress, mint = placed, plain = not started / on hold / closed
export const JF_STAGE_CHIP: Record<ReturnType<typeof stageTone>, string> = {
  intake: "oco-chip--sky", mushki: "oco-chip--sky", jpa: "oco-chip--butter", execution: "oco-chip--butter",
  success: "oco-chip--mint", hold: "", default: "",
};
export const JF_STAGE_BG: Record<ReturnType<typeof stageTone>, { bg: string; ink: string }> = {
  intake: { bg: "var(--oc-sky)", ink: "#244A73" }, mushki: { bg: "var(--oc-sky)", ink: "#244A73" },
  jpa: { bg: "var(--oc-butter)", ink: "#6B5A00" }, execution: { bg: "var(--oc-butter)", ink: "#6B5A00" },
  success: { bg: "var(--oc-mint)", ink: "#1F5E3A" }, hold: { bg: "var(--oc-hair)", ink: "var(--oc-soft)" },
  default: { bg: "var(--oc-hair)", ink: "var(--oc-soft)" },
};
