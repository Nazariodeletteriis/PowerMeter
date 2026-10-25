import { invoke } from "@tauri-apps/api/core";
import { AppWindowIcon } from "@phosphor-icons/react";
import { MapExplorer } from "./world/MapExplorer";
import type { PageProps } from "./types";

/** Cube Finder page: the map on hidden cubes, teleports and villages (its own layers), and the button that opens it as its own window (MapWindow.tsx). */
export default function CubeFinder({ t, settings, run }: PageProps) {
  return (
    <MapExplorer
      t={t}
      settings={settings}
      run={run}
      cubes
      extra={
        <button
          type="button"
          className="wRouteBtn plain wIconBtn"
          title={t("world.map.openWidget")}
          aria-label={t("world.map.openWidget")}
          onClick={() => run(() => invoke("open_cube_window"))}
        >
          <AppWindowIcon aria-hidden="true" />
        </button>
      }
    />
  );
}
