import { HourglassMediumIcon } from "@phosphor-icons/react";
import type { T } from "../../i18n";
import { EmptyState } from "../../ui";

/**
 * What every page without its own design shows: a single "coming soon" state.
 * Pages re-export it as their default; the shell also uses it to know the page
 * has no design (group breadcrumb).
 */
export default function States({ t }: { t: T }) {
  return (
    <section className="card">
      <EmptyState icon={<HourglassMediumIcon aria-hidden="true" />} title={t("shell.states.soonTitle")} text={t("shell.states.soonText")} />
    </section>
  );
}
