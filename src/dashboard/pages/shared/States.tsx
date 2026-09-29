import { HourglassMediumIcon } from "@phosphor-icons/react";
import type { T } from "../../i18n";
import { EmptyState } from "../../ui";

/**
 * What every page waiting for official game data shows: a single "coming" state.
 * Pages re-export it as their default; the shell also uses it to know the page
 * has no design (group breadcrumb).
 */
export default function States({ t }: { t: T }) {
  return (
    <section className="card">
      <EmptyState icon={<HourglassMediumIcon aria-hidden="true" />} title={t("shell.states.officialTitle")} text={t("shell.states.officialText")} />
    </section>
  );
}
