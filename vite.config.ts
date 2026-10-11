import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  // React is used only by the PowerMeter dashboard (src/dashboard). The meter
  // (index.html + public/src/js) stays plain scripts that Vite leaves alone.
  plugins: [
    react(),
    {
      // The meter fetches its UI strings at runtime from ./i18n/ui/<lang>.json.
      // Vite only serves src/data in dev, so without this the built app fell
      // back to the English text in index.html whatever the language.
      name: "meter-ui-i18n",
      async generateBundle() {
        const { readdirSync, readFileSync } = await import("node:fs");
        const dir = "src/data/i18n/ui";
        for (const file of readdirSync(dir)) {
          this.emitFile({ type: "asset", fileName: `i18n/ui/${file}`, source: readFileSync(`${dir}/${file}`) });
        }
      },
    },
  ],
  build: {
    rollupOptions: {
      input: { index: "index.html", dashboard: "dashboard.html" },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
