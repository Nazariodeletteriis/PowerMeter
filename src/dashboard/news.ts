/**
 * Home news card: the official site's notices and patch notes as the PowerMeter server relays them
 * (GET /api/news through the pm_news command). The reply is checked here as well: only entries with a
 * title, a valid date and an https link on the official site are kept.
 */
export type NewsItem = { title: string; date: string; url: string };
export type News = { notices: NewsItem[]; updates: NewsItem[] };

// The link is opened by open_url, which hands it to `cmd /C start` on Windows: characters cmd reads
// as syntax (& | < > ^ % ") or whitespace are refused, not escaped.
const UNSAFE = /[&|<>^%"\s]/;

/** The link as https on the official site (aion2.plaync.com or another *.plaync.com host), else null. */
export function officialUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname;
  // Checked after parsing: URL percent-encodes non-ASCII, and a % is what cmd expands.
  const ok = url.protocol === "https:" && (host === "aion2.plaync.com" || host.endsWith(".plaync.com")) && !UNSAFE.test(url.href);
  return ok ? url.href : null;
}

function items(raw: unknown): NewsItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((e) => {
    const title = typeof e?.title === "string" ? e.title.trim() : "";
    const url = officialUrl(e?.url);
    const ok = title && url && typeof e.date === "string" && !Number.isNaN(Date.parse(e.date));
    return ok ? [{ title, date: e.date, url }] : [];
  });
}

/** The two lists, cleaned; at most 5 each, as the server sends them. */
export function cleanNews(raw: unknown): News {
  const r = (raw ?? {}) as { notices?: unknown; updates?: unknown };
  return { notices: items(r.notices).slice(0, 5), updates: items(r.updates).slice(0, 5) };
}
