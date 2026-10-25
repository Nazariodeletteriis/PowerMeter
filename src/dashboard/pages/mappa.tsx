import { invoke } from "@tauri-apps/api/core";
import { AppWindowIcon } from "@phosphor-icons/react";
import { MapExplorer } from "./world/MapExplorer";
import type { PageProps } from "./types";

/** Map page: the map explorer, and the button that opens it as its own window (MapWindow.tsx). */
export default function Mappa({ t, settings, run }: PageProps) {
  return (
    <MapExplorer
      t={t}
      settings={settings}
      run={run}
      extra={
        <>
          <button
            type="button"
            className="wRouteBtn plain wIconBtn"
            title={t("world.map.openWidget")}
            aria-label={t("world.map.openWidget")}
            onClick={() => run(() => invoke("open_map_window"))}
          >
            <AppWindowIcon aria-hidden="true" />
          </button>
        </>
      }
    />
  );
}
