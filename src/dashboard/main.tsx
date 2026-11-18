import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { MapWindow } from "./MapWindow";
import { PetPopup } from "./PetPopup";
import "./dashboard.css";

// Set by the window's initialization_script (powermeter.rs): a widget window draws only its widget.
const view = (window as { __PM_VIEW__?: string }).__PM_VIEW__;

// The pet popup window is always there over the game: transparent from the first frame (world.css .mmDoc).
if (view === "petpop") document.documentElement.classList.add("mmDoc");

createRoot(document.getElementById("root")!).render(
  <StrictMode>{view === "petpop" ? <PetPopup /> : view === "map" || view === "cubes" ? <MapWindow view={view} /> : <App />}</StrictMode>,
);
