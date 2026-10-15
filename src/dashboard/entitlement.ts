import { invoke } from "@tauri-apps/api/core";
import { useSyncExternalStore } from "react";

// Subscriptions (notes/patreon-tiers-plan.md): what the account may open, from pm_entitlement
// (src-tauri/src/pm_account.rs), which only trusts the server-signed permit.

export type Tier = "free" | "trial" | "recluta" | "daeva" | "empyrean";
export type PaidTier = "recluta" | "daeva" | "empyrean";
/** Access level: every plan and the trial unlock the same (the locks in nav.ts ask for "recluta", i.e. any
 *  plan); the order only decides which name is shown when an account has more than one. */
export const RANK: Record<Tier, number> = { free: 0, recluta: 1, trial: 2, daeva: 2, empyrean: 3 };
/** Patreon plans (Nazario, 2026-10-15): all three unlock everything, they differ only in how often you pay.
 *  Names are the same in every language; `price` in € for `months` of access, `off` = % saved on monthly Recluta. */
export const PLANS: Record<PaidTier, { name: string; price: number; months: number; off: number }> = {
  recluta: { name: "Recluta", price: 2.99, months: 1, off: 0 },
  daeva: { name: "Daeva", price: 8.07, months: 3, off: 10 },
  empyrean: { name: "Empyrean", price: 13.99, months: 6, off: 22 },
};
/** A price in the app's language: 2,99 / 2.99. */
export const euros = (lang: string, n: number) => n.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** The Patreon plans are shown but not on sale yet: no subscribe or link buttons, "coming soon" instead.
 *  Contents and prices are decided (PLANS); still waiting on the quarterly/6-month billing on Patreon.
 *  Admin grants still work. */
export const PLANS_OPEN = false;

export type Entitlement = {
  tier: Tier;
  admin: boolean;
  /** Debugger role (set by an admin): packet and debug logs in the widget. Admins have it too. */
  debugger?: boolean | null;
  features: string[];
  source: "admin" | "developer" | "grant" | "patreon" | "trial" | "free" | "dev";
  until?: number | null;
  trialEndsAt?: number | null;
  /** The Discord account is at least 8 months old: the 30-day trial applies. */
  trialEligible?: boolean;
  founder?: boolean;
  patreon?: { linked: boolean; tier: Tier; status: string | null };
  offline?: boolean;
  /** PCs the plan allows (Empyrean 2, others 1). */
  maxDevices?: number;
  /** The account already has its maximum of PCs: nothing paid on this one. */
  deviceLimit?: boolean;
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
