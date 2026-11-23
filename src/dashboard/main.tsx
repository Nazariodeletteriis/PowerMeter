import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { MapWindow } from "./MapWindow";
import { PetPopup } from "./PetPopup";
import { BlackMarket } from "./BlackMarket";
import { Controls, Grid } from "./Controls";
import { EventPopup } from "./EventPopup";
import "./dashboard.css";

// Set by the window's initialization_script (powermeter.rs): a widget window draws only its widget.
const view = (window as { __PM_VIEW__?: string }).__PM_VIEW__;

// The pet overlays are always there over the game: transparent from the first frame (world.css .mmDoc).
if (view === "petpop" || view === "petmarket" || view === "eventpop" || view === "controls" || view === "grid") document.documentElement.classList.add("mmDoc");

createRoot(document.getElementById("root")!).render(
  <StrictMode>{view === "petpop" ? <PetPopup /> : view === "eventpop" ? <EventPopup /> : view === "petmarket" ? <BlackMarket /> : view === "map" || view === "cubes" ? <MapWindow view={view} /> : view === "controls" ? <Controls /> : view === "grid" ? <Grid /> : <App />}</StrictMode>,
);
