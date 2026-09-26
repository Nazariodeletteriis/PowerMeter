import { States } from "./combat/parts";
import type { PageProps } from "./types";

// The prototype has no block for this page: it shows the four standard states (pg.states).
export default function Page({ t }: PageProps) {
  return <States t={t} />;
}
