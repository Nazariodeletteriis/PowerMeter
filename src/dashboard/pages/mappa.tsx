import { invoke } from "@tauri-apps/api/core";
import { AppWindowIcon, CubeIcon } from "@phosphor-icons/react";
import { MapExplorer } from "./world/MapExplorer";
import type { PageProps } from "./types";

/** Map page: the map explorer, and the buttons that open it, or the Hidden cube guide, as their own window (MapWindow.tsx). */
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
          <button
            type="button"
            className="wRouteBtn plain wIconBtn"
            title={t("world.cubes.open")}
            aria-label={t("world.cubes.open")}
            onClick={() => run(() => invoke("open_cube_window"))}
          >
            <CubeIcon aria-hidden="true" />
          </button>
        </>
      }
    />
  );
}
