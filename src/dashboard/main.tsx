import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { MapWindow } from "./MapWindow";
import "./dashboard.css";

// Set by the window's initialization_script (powermeter.rs): a widget window draws only its widget.
const view = (window as { __PM_VIEW__?: string }).__PM_VIEW__;

createRoot(document.getElementById("root")!).render(<StrictMode>{view === "map" || view === "cubes" ? <MapWindow view={view} /> : <App />}</StrictMode>);
