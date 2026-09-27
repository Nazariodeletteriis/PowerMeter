(() => {
  const CDN_MANIFEST = "https://github.com/Nazariodeletteriis/PowerMeter/releases/latest/download/latest.json";
  const START_DELAY = 800,
    RETRY = 500,
    LIMIT = 5;

  const parseVersion = (v) => {
    const cleaned = String(v || "").trim().replace(/^v/i, "");
    const [base, prerelease] = cleaned.split("-", 2);
    const [a = 0, b = 0, c = 0] = String(base || "")
      .split(".")
      .map(Number);
    return {
      base,
      prerelease: Boolean(prerelease),
      value: a * 1e6 + b * 1e3 + c,
    };
  };

  let once = false;

  // PowerMeter: re-check every 30 minutes, the meter stays open for whole sessions.
  const start = () => {
    if (once) return;
    once = true;
    check();
    setInterval(check, 30 * 60 * 1000);
  };

  const check = () =>
    setTimeout(async () => {
      try {
        // Wait for the bridge AND for the async version fetch to complete
        for (
          let i = 0;
          i < LIMIT && !(
            window.dpsData?.getVersion &&
            window.javaBridge?.openBrowser &&
            String(window.dpsData.getVersion() || "").trim()
          );
          i++
        ) {
          await new Promise((r) => setTimeout(r, RETRY));
        }
        if (!(window.dpsData?.getVersion && window.javaBridge?.openBrowser)) {
          return;
        }

        const rawCurrent = String(window.dpsData.getVersion() || "").trim();
        const current = rawCurrent.startsWith("v") ? rawCurrent : "v" + rawCurrent;
        console.log("[A2Tools] Update check: current =", current);

        let result;
        try {
          const raw = await window.__TAURI__.core.invoke("fetch_url", { url: CDN_MANIFEST });
          const m = JSON.parse(raw);
          console.log("[A2Tools] Update manifest:", JSON.stringify(m));
          const v = m.version?.startsWith("v") ? m.version : "v" + m.version;
          result = { latest: v, msi: m.msiUrl || "" };
        } catch (e) {
          console.error("[A2Tools] Update check failed:", e);
          return;
        }

        const latest = result.latest;
        const latestInfo = parseVersion(latest);
        const currentInfo = parseVersion(current);
        const hasUpdate =
          latestInfo.value > currentInfo.value ||
          (latestInfo.value === currentInfo.value &&
            currentInfo.prerelease &&
            !latestInfo.prerelease);

        if (!hasUpdate) return;

        // PowerMeter: a strip under the meter header instead of the native
        // MessageBox; it opens the dashboard's update window (TitleBar.tsx
        // picks up the localStorage flag, shared by both windows).
        console.log("[A2Tools] Update available:", current, "->", latest);
        const strip = document.querySelector(".pmUpdateStrip");
        if (!strip) return;
        strip.querySelector(".pmUpdateVersion").textContent = latest;
        strip.hidden = false;
        strip.onclick = () => {
          localStorage.setItem("pm.openUpdate", "1");
          window.__TAURI__.core.invoke("open_dashboard_window").catch((err) => console.error("[PowerMeter] open_dashboard_window failed", err));
        };
      } catch (e) {
        console.error("[A2Tools] Update check error:", e);
      }
    }, START_DELAY);

  window.ReleaseChecker = { start };
})();
