import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { MapWindow } from "./MapWindow";
import "./dashboard.css";

// Set by the window's initialization_script (powermeter.rs): the Map window draws only the map.
const view = (window as { __PM_VIEW__?: string }).__PM_VIEW__;

createRoot(document.getElementById("root")!).render(<StrictMode>{view === "map" ? <MapWindow /> : <App />}</StrictMode>);
