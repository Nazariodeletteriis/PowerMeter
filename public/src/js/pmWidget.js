// PowerMeter: the widget's chrome and modes from the design handoff
// (docs/design/claude-design/videogame-tool-design-system/project/PowerMeter Widget.dc.html,
// sections 8.1-8.7). Active only in the powermeter theme, beta layout, overlay window;
// every other theme keeps the A2Tools meter as it was (the .pmOnly markup stays hidden).
//
// core.js drives it: tick() from the poll loop, onFrame() after each render,
// openDetail() on a row click, syncTheme() when the theme or layout changes.
const createPmWidget = (app) => {
  const meter = document.querySelector(".meter");
  if (!meter) return null;
  const $ = (sel) => meter.querySelector(sel);
  const invoke = (cmd, args) => window.__TAURI__.core.invoke(cmd, args);
  const t = (key, fallback) => window.i18n?.t?.(key, fallback) || fallback;
  const tf = (key, vars, fallback) => window.i18n?.format?.(key, vars, fallback) || fallback;
  const num = (n) => app.dpsFormatter.format(Math.round(Number(n) || 0));
  const oneDec = (n) =>
    (Number(n) || 0).toLocaleString(window.i18n?.getLanguage?.() || "en", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pct = (n) => `${oneDec(n)}%`;
  // "3,5 M" / "912 K", as meter.js does for the total-damage column.
  const short = (n) => (n >= 1e6 ? `${oneDec(n / 1e6)} M` : n >= 1e3 ? `${num(n / 1e3)} K` : num(n));
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  const OPACITY_LEVELS = [30, 60, 90]; // design 8.1: the three background levels
  const SPARK_POINTS = 41; // design 8.7: the sparkline's sample count
  const NO_TRAFFIC_MS = 60000; // detecting this long with the game open = capture error
  const MODE_KEY = "pm.widgetMode";
  const RARITY = {
    Common: "#9C9494",
    Uncommon: "#6CC46A",
    Rare: "#4F93EA",
    Heroic: "#B377E8",
    Legendary: "#F0A63A",
    Mythic: "#FF4040",
  };

  const storedMode = app.safeGetStorage(MODE_KEY);
  let mode = ["dps", "build", "lobby"].includes(storedMode) ? storedMode : "dps";
  let view = "";
  let locked = false;
  let buildTab = "slots";
  let detailRow = null;
  let detailTimer = 0;
  let frame = null; // last render from core.js
  let wasFighting = false;
  let lastFight = null; // summary of the last boss fight that ended this session
  let endDismissed = false;
  let upload = null; // { url } once the last fight's log is uploaded
  let spark = [];
  let lastSparkAt = 0;
  let detectingSince = 0;

  const isActive = () =>
    window.A2_VIEW === "main" && !document.body.classList.contains("legacyUi"); // every theme, Classic UI excluded

  // --- widget layout: lift the fight timer into the bar and the target-mode pill into the
  // target row. Moved rather than duplicated so core.js keeps driving them; put
  // back where A2Tools had them for the Classic UI layout.
  const moves = [
    [document.querySelector(".battleTime"), $(".pmBarTitle"), "before"],
    [document.querySelector(".targetModeBtn"), $(".pmBerserk"), "after"],
  ]
    .filter(([el, anchor]) => el && anchor)
    .map(([el, anchor, where]) => ({ el, anchor, where, home: el.parentNode, next: el.nextSibling }));
  const syncTheme = () => {
    const on = isActive();
    for (const m of moves) {
      if (on) m.anchor[m.where](m.el);
      else m.home.insertBefore(m.el, m.next);
    }
    if (!on) closeDetail();
  };

  // --- lock (click-through). Also toggled by the global hotkey, hence the event.
  const lockBtn = $(".pmLockBtn");
  // A locked meter ignores the mouse, so say how to unlock it for a few seconds.
  const lockHint = $(".pmLockHint");
  let lockHintTimer;
  const setLocked = (on) => {
    const wasLocked = locked;
    locked = !!on;
    meter.classList.toggle("isPmLocked", locked);
    lockBtn?.setAttribute("aria-pressed", String(locked));
    if (locked) reportLockHotspot();
    else meter.classList.remove("isPmLockHot");
    clearTimeout(lockHintTimer);
    if (!lockHint || !locked || wasLocked) {
      if (lockHint && !locked) lockHint.hidden = true;
      return;
    }
    invoke("get_settings")
      .then((all) => all?.["pm.clickThroughHotkey"] || "Ctrl+Alt+L")
      .catch(() => "Ctrl+Alt+L")
      .then((key) => {
        lockHint.textContent = t("pmWidget.unlockHint", "Locked. Click the lock or press {key} to unlock").replace("{key}", key);
        lockHint.hidden = false;
        lockHintTimer = setTimeout(() => (lockHint.hidden = true), 5000);
      });
  };
  // Locked: Rust watches the cursor over the badge and unlocks on click
  // (watch_lock_corner in powermeter.rs); it needs the badge's current rect.
  const reportLockHotspot = () =>
    requestAnimationFrame(() => {
      const r = $(".pmLockBadge")?.getBoundingClientRect();
      if (!r?.width) return;
      const pad = 6;
      invoke("set_lock_hotspot", { x: r.left - pad, y: r.top - pad, w: r.width + 2 * pad, h: r.height + 2 * pad }).catch((err) =>
        console.error("[PowerMeter] set_lock_hotspot failed", err)
      );
    });
  window.__TAURI__.event
    .listen("pm-lock-hot", (event) => meter.classList.toggle("isPmLockHot", !!event?.payload))
    .catch((err) => console.error("[PowerMeter] pm-lock-hot listener failed", err));
  lockBtn?.addEventListener("click", () => {
    const next = !locked;
    invoke("set_click_through", { enabled: next })
      .then(() => setLocked(next))
      .catch((err) => console.error("[PowerMeter] set_click_through failed", err));
  });
  invoke("get_click_through")
    .then(setLocked)
    .catch((err) => console.error("[PowerMeter] get_click_through failed", err));
  window.__TAURI__.event
    .listen("pm-click-through", (event) => setLocked(event?.payload))
    .catch((err) => console.error("[PowerMeter] pm-click-through listener failed", err));

  // --- opacity: steps through the design's 30 / 60 / 90 % on the existing setting.
  $(".pmOpacityBtn")?.addEventListener("click", () => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--window-opacity");
    const current = Math.round((parseFloat(raw) || 0) * 100);
    const next = OPACITY_LEVELS.find((level) => level > current) ?? OPACITY_LEVELS[0];
    app.applyWindowOpacity(next, { persist: true });
    if (app.windowOpacityInput) app.windowOpacityInput.value = String(next);
    if (app.windowOpacityValue) app.windowOpacityValue.textContent = `${next}%`;
  });

  // --- pill. The overlay window follows the meter's size (tauriBridge.js
  // updateWindowSize -> resize_window), so shrinking the meter shrinks the
  // window, and the meter's own width/min-height bring the old size back.
  const pillEl = $(".pmPill");
  const setPill = (on) => {
    meter.classList.toggle("isPmPill", on);
    (on ? pillEl : $(".pmPillBtn"))?.focus();
  };
  $(".pmPillBtn")?.addEventListener("click", () => setPill(true));
  pillEl?.addEventListener("click", () => setPill(false));

  // --- close: hides the overlay; the dashboard (show_overlay) or Ctrl+Alt+Up bring it back.
  $(".pmCloseBtn")?.addEventListener("click", () => {
    Promise.resolve()
      .then(() => window.__TAURI__.core.invoke("hide_overlay"))
      .catch((err) => console.error("[PowerMeter] hide failed", err));
  });

  // --- mode tabs
  const setMode = (next) => {
    if (next === "dps" && mode === "dps" && view === "ended") endDismissed = true; // back to the list
    mode = next;
    app.safeSetStorage(MODE_KEY, mode);
    closeDetail();
    render();
  };
  meter.querySelectorAll(".pmTab").forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.pmMode)));

  // --- player breakdown (8.3)
  const detailEl = $(".pmDetail");
  const renderDetail = (row, d) => {
    const heal = d.totalHeal > d.totalDmg;
    const list = (heal ? d.healSkills : d.skills).slice().sort((a, b) => b.dmg - a.dmg);
    const total = heal ? d.totalHeal : d.totalDmg;
    const secs = (Number(d.battleTimeMs) || 0) / 1000;
    $(".pmDetailTotal").textContent = heal ? (secs > 0 ? num(total / secs) : "0") : num(row.dps);
    $(".pmDetailUnit").textContent = heal ? "HPS" : "DPS";
    $(".pmDetailColL").textContent = heal ? t("pmWidget.detail.heal", "Healing") : t("pmWidget.detail.damage", "Damage");
    $(".pmBadges").innerHTML = [
      ["CRIT", d.totalCritPct],
      ["BACK", d.totalBackPct],
      ["PARRY", d.totalParryPct],
      ["PERFECT", d.totalPerfectPct],
      ["DOUBLE", d.totalDoublePct],
    ]
      .map(([label, value]) => `<div class="pmBadge"><div>${label}</div><div>${pct(value)}</div></div>`)
      .join("");
    const top = list[0]?.dmg || 1;
    $(".pmSkills").innerHTML = list
      .map((s) => {
        // Heal ticks carry no crit data from the engine.
        const crit = heal || !s.time ? "-" : pct((s.crit / s.time) * 100);
        return `<div class="pmSkillGrid pmSkill"><div class="pmSkillBar" style="width:${((s.dmg / top) * 100).toFixed(1)}%"></div><span>${esc(s.name)}</span><span>${short(s.dmg)}</span><span>${pct(total ? (s.dmg / total) * 100 : 0)}</span><span>${num(s.time)}</span><span>${crit}</span></div>`;
      })
      .join("");
  };
  const refreshDetail = async () => {
    if (!detailRow) return;
    const id = String(detailRow.id);
    const row = app.latestRowsById?.get(id) || detailRow;
    let details;
    try {
      details = await app.getDetails(row);
    } catch (err) {
      console.error("[PowerMeter] player breakdown failed", err);
      return;
    }
    if (String(detailRow?.id) === id) renderDetail(row, details);
  };
  const openDetail = (row) => {
    detailRow = row;
    const rowEl = app.elList?.querySelector(`.item[data-row-id="${CSS.escape(String(row.id))}"]`);
    detailEl.dataset.cls = rowEl?.dataset.cls || "";
    $(".pmDetailName").textContent = row.name || "";
    $(".pmBadges").innerHTML = "";
    $(".pmSkills").innerHTML = "";
    meter.classList.add("isPmDetail");
    refreshDetail();
    clearInterval(detailTimer);
    detailTimer = setInterval(refreshDetail, 1000);
  };
  function closeDetail() {
    if (!detailRow) return;
    detailRow = null;
    clearInterval(detailTimer);
    meter.classList.remove("isPmDetail");
  }
  $(".pmBackBtn")?.addEventListener("click", closeDetail);
  detailEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDetail();
  });
  $(".pmDetailReportBtn")?.addEventListener("click", () => detailRow && app.openRowDetailsWindow(detailRow));

  // --- Build (8.5) and Lobby (8.6), from the sample data until real data exists
  // The Character Builder's "Widget" button hands its build over here (same shape).
  const BUILD_KEY = "pm.widgetBuild";
  const buildData = () => {
    try {
      return JSON.parse(app.safeGetStorage(BUILD_KEY)) || window.PM_SAMPLE?.build;
    } catch {
      return window.PM_SAMPLE?.build;
    }
  };
  window.addEventListener("storage", (event) => {
    if (event.key === MODE_KEY && event.newValue === "build") setMode("build");
    if (event.key === BUILD_KEY && mode === "build") render();
  });
  const buildEl = $(".pmBuild");
  const lobbyEl = $(".pmLobby");
  const renderBuild = () => {
    const b = buildData();
    if (!b) return;
    const tabs = [
      ["slots", "Slots"],
      ["missing", "Missing"],
      ["stats", "Stats"],
    ]
      .map(
        ([id, fallback]) =>
          `<button type="button" role="tab" class="pmSubTab" data-tab="${id}" aria-selected="${id === buildTab}">${esc(t(`pmWidget.build.${id}`, fallback))}</button>`
      )
      .join("");
    let body = "";
    // The item's game icon over the slot's short label; a broken icon removes itself and the label shows.
    const icon = (url) =>
      url ? `<img src="${esc(url)}" alt="" loading="lazy" draggable="false" onerror="this.remove()" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit">` : "";
    if (buildTab === "slots") {
      body =
        `<div class="pmSlots">${b.slots
          .map(([label, rarity, enchant, owned, target, url]) => {
            const tip = owned ? t("pmWidget.build.ownedTip", "Owned") : tf("pmWidget.build.targetTip", { item: target }, `Target: ${target}`);
            return `<div class="pmSlot${owned ? "" : " isMissing"}" style="--rar:${RARITY[rarity]}" title="${esc(tip)}">${esc(label)}${icon(url)}<span class="pmSlotEnh">${enchant ? `+${enchant}` : ""}</span></div>`;
          })
          .join("")}</div>` +
        `<div class="pmSlotsHint">${esc(t("pmWidget.build.slotsHint", "Dashed: missing pieces · hover for the target item"))}</div>`;
    } else if (buildTab === "missing") {
      body = b.missing
        .map(
          (m) =>
            `<div class="pmMissing" style="--rar:${RARITY[m.rarity]}"><span class="pmMissingIcon" style="position:relative">${icon(m.icon)}</span><div class="pmMissingText"><div class="pmMissingName">${esc(m.item)}</div><div class="pmMissingSrc">${esc(t(`pmWidget.build.source.${m.source.kind}`, m.source.kind))} · ${esc(m.source.text)}</div></div></div>`
        )
        .join("");
    } else {
      body = b.stats
        .map(
          ([name, current, target]) =>
            `<div class="pmStat"><span>${esc(name)}</span><span>${esc(current)}</span><span>→</span><span>${esc(target)}</span></div>`
        )
        .join("");
    }
    buildEl.innerHTML =
      `<div class="pmBuildHead"><div class="pmBuildTitle"><span class="pmBuildName">${esc(b.name)}</span><span class="pmBuildClass">${esc(b.className)}</span><span class="pmSpacer"></span><span class="pmMono" title="Gear Score">${num(b.gs ?? b.cp)}</span><span class="pmBuildArrow">→</span><span class="pmMono pmBuildTarget">${num(b.gsTarget ?? b.cpTarget)}</span></div>` +
      `<div class="pmBuildBar"><div style="width:${(b.progress * 100).toFixed(1)}%"></div></div></div>` +
      `<div class="pmSubTabs" role="tablist">${tabs}</div>` +
      `<div class="pmBuildBody">${body}</div>` +
      `<div class="pmBuildFoot"><span>${esc(tf("pmWidget.build.owned", { owned: b.owned, total: b.total }, `${b.owned}/${b.total} owned`))}</span><span class="pmSpacer"></span><button type="button" class="pmLinkBtn pmOpenBuilder">${esc(t("pmWidget.build.openBuilder", "Open in builder ↗"))}</button></div>`;
  };
  buildEl?.addEventListener("click", (event) => {
    const tab = event.target.closest(".pmSubTab");
    if (tab) {
      buildTab = tab.dataset.tab;
      renderBuild();
      buildEl.querySelector(`.pmSubTab[data-tab="${buildTab}"]`)?.focus();
      return;
    }
    if (event.target.closest(".pmOpenBuilder")) {
      invoke("open_dashboard_window").catch((err) => console.error("[PowerMeter] open_dashboard_window failed", err));
    }
  });
  const renderLobby = () => {
    const l = window.PM_SAMPLE?.lobby;
    if (!l) return;
    lobbyEl.innerHTML =
      `<div class="pmLobbyGrid pmLobbyHead"><span>${esc(t("pmWidget.lobby.player", "Player"))}</span><span>CP</span><span title="${esc(t("pmWidget.lobby.gsTip", "Gear score"))}">GS</span><span>${esc(t("pmWidget.lobby.status", "Status"))}</span></div>` +
      l.members
        .map(
          ([name, cls, cp, gs, ready]) =>
            `<div class="pmLobbyGrid pmLobbyRow"><span class="pmLobbyName"><span class="pmCls" data-cls="${esc(cls)}"></span>${esc(name)}</span><span>${num(cp)}</span><span>${num(gs)}</span><span class="${ready ? "isReady" : "isNotReady"}">${esc(ready ? t("pmWidget.ready", "Ready") : t("pmWidget.lobby.notReady", "Not ready"))}</span></div>`
        )
        .join("");
  };

  // --- fight summary (8.4)
  const summarize = () => {
    if (!frame || frame.targetMode !== "bossTargets" || !(frame.targetMaxHp > 0)) return null;
    const rows = frame.rows.slice().sort((a, b) => b.dps - a.dps);
    const meIndex = rows.findIndex((r) => r.isUser);
    const kill =
      frame.targetCurrentHp >= 0 ? frame.targetCurrentHp <= 0 : frame.targetTotalDamage >= frame.targetMaxHp;
    return {
      boss: app.elBossName?.textContent || "",
      kill,
      time: app.battleTime?.getCombatTimeText?.() || "0:00",
      dps: meIndex >= 0 ? rows[meIndex].dps : 0,
      rank: meIndex >= 0 ? meIndex + 1 : null,
      count: rows.length,
      userRow: rows[meIndex] || rows[0] || null,
    };
  };
  const outcome = (f) => (f.kill ? "Kill" : "Wipe"); // game terms, not translated; the badge is uppercased in CSS
  const uploadBtn = $(".pmUploadBtn");
  uploadBtn?.addEventListener("click", () => {
    uploadBtn.disabled = true;
    invoke("upload_combat_log")
      .then((result) => {
        upload = { url: String(result?.url || "") };
        render();
      })
      .catch((err) => {
        console.warn("[PowerMeter] upload_combat_log failed", err);
        const signedOut = err === "not signed in" || err === "unauthorized";
        $(".pmUploadLabel").textContent = signedOut
          ? t("pmWidget.end.signIn", "Sign in with Discord from the dashboard")
          : t("pmWidget.end.uploadUnavailable", "Upload unavailable");
        uploadBtn.disabled = false;
      });
  });
  const copyBtn = $(".pmCopyLinkBtn");
  copyBtn?.addEventListener("click", () => {
    navigator.clipboard
      .writeText(upload?.url || "")
      .then(() => {
        copyBtn.textContent = t("pmWidget.end.linkCopied", "Link copied");
        setTimeout(() => (copyBtn.textContent = t("pmWidget.end.copyLink", "Copy link")), 1500);
      })
      .catch((err) => console.error("[PowerMeter] copy link failed", err));
  });
  $(".pmReportBtn")?.addEventListener("click", () => {
    if (lastFight?.userRow) app.openRowDetailsWindow(lastFight.userRow);
  });
  $(".pmDiagnoseBtn")?.addEventListener("click", () => window.javaBridge?.openSettingsWindow?.());

  // --- render
  const setText = (sel, text) => {
    const el = $(sel);
    if (el && el.textContent !== text) el.textContent = text;
  };
  const render = () => {
    for (const m of ["dps", "build", "lobby"]) meter.classList.toggle(`pmMode-${m}`, mode === m);
    meter.querySelectorAll(".pmTab").forEach((tab) => {
      const on = tab.dataset.pmMode === mode;
      tab.classList.toggle("isActive", on);
      tab.setAttribute("aria-selected", String(on));
      // Lobby (R2) joins the switch from the Build view on, as in the design.
      tab.hidden = tab.dataset.pmMode === "lobby" && mode === "dps";
    });
    let title = "";
    let right = "";
    if (mode === "dps" && view === "ended") title = t("pmWidget.end.title", "Fight over");
    if (mode === "build") {
      const b = buildData();
      if (b) right = `${b.character} · ${b.name} ▾`;
      renderBuild();
    }
    if (mode === "lobby") {
      const l = window.PM_SAMPLE?.lobby;
      if (l) {
        title = l.dungeon; // the active Lobby tab beside it stands for the design's "Lobby ·" prefix
        const ready = l.members.filter((m) => m[4]).length;
        right = tf("pmWidget.lobby.ready", { n: ready, total: l.members.length }, `${ready}/${l.members.length} ready`);
      }
      renderLobby();
    }
    setText(".pmBarTitle", title);
    setText(".pmBarRight", right);
    $(".pmBarRight").title = right; // the bar cuts it short on narrow widgets
    meter.classList.toggle("isPmUploaded", !!upload);
    if (lastFight) {
      const label = $(".pmOutcome");
      label.textContent = outcome(lastFight);
      label.classList.toggle("isWipe", !lastFight.kill);
      setText(".pmEndBoss", lastFight.boss);
      setText(".pmEndTime", lastFight.time);
      setText(".pmEndDps", num(lastFight.dps));
      setText(".pmEndRank", lastFight.rank ? `${lastFight.rank} / ${lastFight.count}` : "-");
      setText(".pmUploadedSub", `${outcome(lastFight)} ${lastFight.time} · ${num(lastFight.dps)} DPS${lastFight.rank ? ` · #${lastFight.rank}` : ""}`);
      setText(".pmLastText", tf("pmWidget.waiting.last", { boss: lastFight.boss, outcome: outcome(lastFight), time: lastFight.time }, `Last: ${lastFight.boss} · ${outcome(lastFight)} ${lastFight.time}`));
      setText(".pmLastDps", `${num(lastFight.dps)} DPS`);
    }
    meter.classList.toggle("hasPmLast", !!lastFight);
  };

  const setView = (next) => {
    if (next === view) return;
    for (const v of ["live", "waiting", "ended", "error"]) meter.classList.toggle(`pmView-${v}`, next === v);
    view = next;
    render();
  };

  const drawSpark = () => {
    const path = $(".pmSpark path");
    if (!path) return;
    // Scaled to the fight's own range so the shape reads, as in the design
    // (its line spans roughly 15-90% of the 40-unit box).
    const min = Math.min(...spark);
    const range = Math.max(1, Math.max(...spark) - min);
    const last = Math.max(1, spark.length - 1);
    path.setAttribute(
      "d",
      spark.length < 2
        ? ""
        : spark
            .map((v, k) => `${k ? "L" : "M"}${((k / last) * 100).toFixed(1)},${(40 - (0.15 + ((v - min) / range) * 0.75) * 36).toFixed(1)}`)
            .join("")
    );
    meter.classList.toggle("hasPmSpark", spark.length > 1);
  };

  // Every poll (100 ms): work out which state the DPS view is in.
  const tick = () => {
    if (!isActive()) return;
    const state = app.battleTime?.getState?.() || "";
    const fighting = state === "state-fighting" || state === "state-grace";
    if (fighting && !wasFighting) {
      endDismissed = false;
      upload = null;
      spark = [];
      drawSpark();
      const label = $(".pmUploadLabel");
      if (label) label.textContent = t("pmWidget.end.upload", "Upload log");
      if (uploadBtn) uploadBtn.disabled = false;
    }
    if (!fighting && wasFighting && (state === "state-ended" || state === "state-idle")) {
      lastFight = summarize() || lastFight;
      render();
    }
    wasFighting = fighting;

    let error = "";
    if (app.pcapError) error = t("pmWidget.error.npcap", "Npcap is not available");
    else if (app.aionRunning && app.isDetectingPort) {
      detectingSince ||= Date.now();
      if (Date.now() - detectingSince > NO_TRAFFIC_MS) error = t("pmWidget.error.noTraffic", "No traffic on the selected adapter");
    } else detectingSince = 0;
    setText(".pmErrorText", error);

    const hasRows = !!app.elList?.classList.contains("hasRows");
    let next = "live";
    if (!hasRows) next = error ? "error" : "waiting";
    else if (!fighting && lastFight && !endDismissed && summarize()) next = "ended";
    setView(next);

    // Pill: your DPS and the fight time; "Ready" with nothing to show.
    meter.classList.toggle("isPmIdle", !hasRows);
    const me = frame?.rows?.find((r) => r.isUser);
    setText(".pmPillDps", num(me?.dps ?? 0));
    setText(".pmPillTime", app.battleTime?.getCombatTimeText?.() || "0:00");
  };

  // After each render: target extras and the sparkline samples.
  const onFrame = (next) => {
    frame = next;
    const berserk = $(".pmBerserk");
    const berserkMs = Number(next.targetBerserkMs);
    const hasBerserk = next.targetBerserkMs != null && Number.isFinite(berserkMs) && berserkMs >= 0;
    if (berserk) {
      berserk.hidden = !hasBerserk;
      if (hasBerserk) {
        const sec = Math.ceil(berserkMs / 1000);
        setText(".pmBerserkTime", `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`);
        berserk.classList.toggle("isUrgent", sec <= 30); // design: red for the last 30 s
      }
    }
    const phase = $(".pmPhase");
    if (phase) {
      const n = Number(next.targetPhase);
      phase.hidden = !(next.targetPhase != null && Number.isFinite(n) && n > 0);
      if (!phase.hidden) phase.textContent = tf("pmWidget.phase", { n }, `Phase ${n}`);
    }
    const now = Date.now();
    if (wasFighting && now - lastSparkAt >= 1000) {
      lastSparkAt = now;
      spark.push(next.rows.reduce((sum, r) => sum + (Number(r.dps) || 0), 0));
      if (spark.length > SPARK_POINTS) spark.shift();
      drawSpark();
    }
  };

  window.i18n?.onChange?.(() => render());
  syncTheme();
  render();

  return { isActive, syncTheme, tick, onFrame, openDetail };
};
