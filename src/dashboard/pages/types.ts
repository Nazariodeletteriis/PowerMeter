import type { SaveSetting, Settings } from "../App";
import type { T } from "../i18n";

/** Props every page in src/dashboard/pages/<id>.tsx receives from the shell. */
export type PageProps = {
  t: T;
  lang: string;
  settings: Settings;
  save: SaveSetting;
  /** Character name: detected by the meter, else the one from onboarding. */
  name: string;
  /** Navigate to another page by its prototype id (nav.ts). */
  go: (page: string) => void;
  /** Run a Tauri action and surface its error in the shell banner. */
  run: (action: () => Promise<unknown>) => void;
  onError: (e: unknown) => void;
  /**
   * Page's own title and breadcrumb (prototype `titles` / `crumbs`), set from
   * an effect. Without it the shell shows the menu label.
   */
  setHeader: (header: PageHeader) => void;
};

export type PageHeader = { title?: string; crumb?: string };
