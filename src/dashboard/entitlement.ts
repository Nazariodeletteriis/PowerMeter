import { invoke } from "@tauri-apps/api/core";
import { useSyncExternalStore } from "react";

// Subscriptions (notes/patreon-tiers-plan.md): what the account may open, from pm_entitlement
// (src-tauri/src/pm_account.rs), which only trusts the server-signed permit.

export type Tier = "free" | "trial" | "recluta" | "daeva" | "empyrean";
export type PaidTier = "recluta" | "daeva" | "empyrean";
/** Access level: the trial unlocks what Daeva unlocks. */
export const RANK: Record<Tier, number> = { free: 0, recluta: 1, trial: 2, daeva: 2, empyrean: 3 };
/** Patreon plans: names are the same in every language, prices in €/month. */
export const PLANS: Record<PaidTier, { name: string; price: number }> = {
  recluta: { name: "Recluta", price: 3 },
  daeva: { name: "Daeva", price: 7 },
  empyrean: { name: "Empyrean", price: 15 },
};

export type Entitlement = {
  tier: Tier;
  admin: boolean;
  features: string[];
  source: "admin" | "grant" | "patreon" | "trial" | "free" | "dev";
  until?: number | null;
  trialEndsAt?: number | null;
  trialEligible?: boolean;
  founder?: boolean;
  patreon?: { linked: boolean; tier: Tier; status: string | null };
  offline?: boolean;
};

let current: Entitlement | null = null;
const listeners = new Set<() => void>();

/** Re-reads the entitlement (after login, Patreon link, admin changes). */
export function refreshEntitlement(): Promise<void> {
  return invoke<Entitlement>("pm_entitlement")
    .then((e) => {
      current = e;
      listeners.forEach((l) => l());
    })
    .catch(() => {}); // keep the last known state
}

// Coming back from the browser (Discord login, Patreon) re-checks; a slow poll catches expiries.
window.addEventListener("focus", () => void refreshEntitlement());
setInterval(() => void refreshEntitlement(), 10 * 60_000);
void refreshEntitlement();

const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));

/** null until the first answer: nothing is shown locked before we know. */
export const useEntitlement = () => useSyncExternalStore(subscribe, () => current);

export const canOpen = (e: Entitlement | null, need: PaidTier | undefined) =>
  !need || !e || RANK[e.tier] >= RANK[need];
