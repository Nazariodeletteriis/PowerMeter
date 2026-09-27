import { TypePage } from "./world/db";
import type { PageProps } from "./types";

// No design of its own in the prototype: the database list and card (world/db.tsx).
export default function NpcPage({ t, go, setHeader }: PageProps) {
  return <TypePage type="npcs" t={t} go={go} setHeader={setHeader} title={t("nav.npcs")} />;
}
