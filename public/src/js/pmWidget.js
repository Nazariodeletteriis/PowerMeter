// PowerMeter: the widget's chrome and modes from the design handoff
// (docs/design/claude-design/videogame-tool-design-system/project/PowerMeter Widget.dc.html,
// sections 8.1-8.7), restyled in October 2026 after the "Interface" reference. Active in
// the overlay window only; the tool windows reuse this document with the .pmOnly markup hidden.
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
  const clock = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  // "3,5 M" / "912 K", as meter.js does for the total-damage column.
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  const OPACITY_LEVELS = [30, 60, 90]; // design 8.1: the three background levels
  const DIAG_AFTER_MS = 20000; // stuck this long without a connection = say why (capture error card)
  const RECENT_MS = 15000; // window for "the adapter sees packets / game packets now"
  // The idle game sends ~19 marked packets a second; random traffic matches the 3-byte
  // marker a few times a minute at most, so this many in RECENT_MS means the game.
  const GAME_PACKETS_MIN = 30;
  const MODE_KEY = "pm.widgetMode";

  // The tab: what the party list shows (core.js getMetricForRow). The old Build and
  // Lobby tabs, gone, come back as DPS.
  const storedMode = app.safeGetStorage(MODE_KEY);
  let mode = ["dps", "heal", "aggro"].includes(storedMode) ? storedMode : "dps";
  let view = "";
  let locked = false;
  let detailRow = null;
  let detailTimer = 0;
  let frame = null; // last render from core.js
  let wasFighting = false;
  let lastFight = null; // summary of the last boss fight that ended this session
  let endDismissed = false;
  let upload = null; // { url } once the last fight's log is uploaded
  let detectingSince = 0;

  const isActive = () => window.A2_VIEW === "main"; // every theme

  // --- widget layout: lift the fight timer into the bar, and the target selector (the BOSS
  // badge), the HP bar and the timer box into the boss row. Moved rather than duplicated so
  // core.js keeps driving them; put back where A2Tools had them outside the overlay. Compact
  // hides the timer box, so it stays home there, in its footer (footerHome). Reset lives in
  // the footer in both layouts.
  const moves = [
    [document.querySelector(".battleTime"), $(".pmBarTitle"), "before"],
    [document.querySelector(".targetModeBtn"), $(".pmBerserk"), "after"],
    [$(".bossHpBar"), $(".bossNames"), "append"],
    [$(".pmDuration"), $(".bossNames"), "append", true],
  ]
    .filter(([el, anchor]) => el && anchor)
    .map(([el, anchor, where, footerHome]) => ({ el, anchor, where, footerHome, home: el.parentNode, next: el.nextSibling }));
  const syncTheme = () => {
    const on = isActive();
    const slim = meter.classList.contains("slim");
    for (const m of moves) {
      if (on && !(slim && m.footerHome)) m.anchor[m.where](m.el);
      else m.home.insertBefore(m.el, m.next);
    }
    if (!on) {
      closeDetail();
      closeTrainer();
    }
    emitMeterState();
  };

  // --- lock: keeps the meter in place (start_drag does nothing), everything else stays clickable.
  // Also toggled by the global hotkey, hence the event.
  const lockBtn = $(".pmLockBtn");
  const setLocked = (on) => {
    locked = !!on;
    lockBtn?.setAttribute("aria-pressed", String(locked));
  };
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
  // The pill drags the window like the meter's bar does (native move, start_drag); a press
  // that stays within a few pixels is a click and expands it.
  const DRAG_SLOP = 4;
  let press = null;
  let dragged = false;
  pillEl?.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    press = { x: e.screenX, y: e.screenY };
    dragged = false;
  });
  pillEl?.addEventListener("pointermove", (e) => {
    if (!press || Math.hypot(e.screenX - press.x, e.screenY - press.y) < DRAG_SLOP) return;
    press = null;
    dragged = true;
    invoke("start_drag").catch((err) => console.error("[PowerMeter] start_drag failed", err));
  });
  pillEl?.addEventListener("pointerup", () => (press = null));
  // detail 0 = Enter/Space, never a drag.
  pillEl?.addEventListener("click", (e) => {
    if (dragged && e.detail) return;
    setPill(false);
  });

  // --- close: hides the overlay; the dashboard (show_overlay) or Ctrl+Alt+Up bring it back.
  $(".pmCloseBtn")?.addEventListener("click", () => {
    Promise.resolve()
      .then(() => window.__TAURI__.core.invoke("hide_overlay"))
      .catch((err) => console.error("[PowerMeter] hide failed", err));
  });

  // --- average DPS by class of the fight on the meter (the last one until the meter resets).
  const AVG_CLASSES = ["Chanter", "Gladiator", "Ranger", "Spiritmaster", "Sorcerer", "Cleric", "Templar", "Assassin"]; // design order for ties
  const JOB_CLASS = { 호법성: "Chanter", 검성: "Gladiator", 궁성: "Ranger", 정령성: "Spiritmaster", 마도성: "Sorcerer", 치유성: "Cleric", 수호성: "Templar", 살성: "Assassin" };
  const avgBtn = $(".pmAvgBtn");
  let avgOn = false;
  const renderAvg = () => {
    const sums = new Map();
    for (const r of frame?.rows || []) {
      const cls = JOB_CLASS[r.job];
      if (!cls || !(r.totalDamage > 0)) continue; // a healer who dealt no damage is not a DPS sample
      const [sum, n] = sums.get(cls) || [0, 0];
      sums.set(cls, [sum + (Number(r.dps) || 0), n + 1]);
    }
    const byCls = new Map([...sums].map(([cls, [sum, n]]) => [cls, sum / n]));
    const top = Math.max(1, ...byCls.values());
    $(".pmAvgRows").innerHTML = AVG_CLASSES.map((cls) => ({ cls, avg: byCls.get(cls) || 0 }))
      .sort((a, b) => b.avg - a.avg)
      .map(({ cls, avg }) => {
        const bar = avg ? `<span style="width:${((avg / top) * 100).toFixed(1)}%"></span>` : "";
        const value = avg ? `<span>${num(avg)}</span>` : `<span class="isNone">—</span>`;
        return `<div class="pmAvgRow" data-cls="${cls.toLowerCase()}"><span>${cls}</span><span class="pmAvgBar">${bar}</span>${value}</div>`;
      })
      .join("");
    setText(".pmAvgHint", t("pmWidget.avg.hint", "Last fight on the meter"));
    const players = [...sums.values()].reduce((n, [, k]) => n + k, 0);
    setText(".pmSampleN", tf("pmWidget.avg.players", { n: players }, `${players} players`));
  };
  avgBtn?.addEventListener("click", () => {
    avgOn = !avgOn;
    meter.classList.toggle("isPmAvg", avgOn);
    avgBtn.setAttribute("aria-pressed", String(avgOn));
    if (avgOn) renderAvg();
  });

  // --- tabs: DPS, HEAL, AGGRO. Same list and layout, so the widget keeps its size;
  // the rows are redrawn at once rather than at the next engine update.
  const setMode = (next) => {
    if (view === "ended") endDismissed = true; // back to the list
    mode = next;
    app.safeSetStorage(MODE_KEY, mode);
    closeDetail();
    render();
    if (frame) app.meterUI.updateFromRows(frame.rows);
  };
  meter.querySelectorAll(".pmTab").forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.pmMode)));

  // --- player breakdown (8.3)
  const detailEl = $(".pmDetail");
  // root: the player breakdown, or the Trainer's own copy of the badges and skills (heal: false there).
  const renderDetail = (row, d, root = detailEl, healTab = mode === "heal") => {
    const $in = (sel) => root.querySelector(sel);
    const heal = healTab || d.totalHeal > d.totalDmg;
    const list = (heal ? d.healSkills : d.skills).slice().sort((a, b) => b.dmg - a.dmg);
    const total = heal ? d.totalHeal : d.totalDmg;
    const secs = (Number(d.battleTimeMs) || 0) / 1000;
    if (root === detailEl) {
      $(".pmDetailTotal").textContent = heal ? (secs > 0 ? num(total / secs) : "0") : num(row.dps);
      $(".pmDetailUnit").textContent = heal ? "HPS" : "DPS";
    }
    $in(".pmDetailColL").textContent = heal ? t("pmWidget.detail.heal", "Healing") : t("pmWidget.detail.damage", "Damage");
    $in(".pmBadges").innerHTML = [
      ["CRIT", d.totalCritPct],
      ["BACK", d.totalBackPct],
      ["PARRY", d.totalParryPct],
      ["PERFECT", d.totalPerfectPct],
      ["DOUBLE", d.totalDoublePct],
    ]
      .map(([label, value]) => `<div class="pmBadge"><div>${label}</div><div>${pct(value)}</div></div>`)
      .join("");
    const top = list[0]?.dmg || 1;
    // The icons already resolved, kept across the per-second redraw (no new fetch, no wand flashing).
    const icons = new Map([...$in(".pmSkills").querySelectorAll(".pmSkillIcon")].map((img) => [img.dataset.key, img]));
    $in(".pmSkills").innerHTML = list
      .map((s) => {
        // Heal ticks carry no crit data from the engine.
        const crit = heal || !s.time ? "-" : pct((s.crit / s.time) * 100);
        return `<div class="pmSkillGrid pmSkill"><div class="pmSkillBar" style="width:${((s.dmg / top) * 100).toFixed(1)}%"></div><span class="pmSkillName"><img class="pmSkillIcon" alt="" referrerpolicy="no-referrer">${esc(s.name)}</span><span>${num(s.dmg)}</span><span>${pct(total ? (s.dmg / total) * 100 : 0)}</span><span>${num(s.time)}</span><span>${crit}</span></div>`;
      })
      .join("");
    // Each skill's icon (skillIcons.js, as the Details window), by code and the player's class; the wand if none.
    const job = app.latestRowsById?.get(String(row.id))?.job || row.job || "";
    $in(".pmSkills")
      .querySelectorAll(".pmSkillIcon")
      .forEach((img, i) => {
        const key = `${list[i].code}|${list[i].name}`;
        const known = icons.get(key);
        if (known) {
          icons.delete(key);
          return img.replaceWith(known);
        }
        img.dataset.key = key;
        img.addEventListener("error", () => window.skillIcons?.handleImgError?.(img));
        window.skillIcons?.applyIconToImage?.(img, { ...list[i], job });
      });
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
    detailEl.querySelector(".pmBadges").innerHTML = "";
    detailEl.querySelector(".pmSkills").innerHTML = "";
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

  // --- fight summary (8.4)
  const summarize = () => {
    if (!frame || frame.targetMode !== "bossTargets" || !(frame.targetMaxHp > 0)) return null;
    const rows = frame.rows.filter((r) => r.totalDamage > 0).sort((a, b) => b.dps - a.dps);
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
  // Signed out: the button turns into "Sign in with Discord", which logs in (browser) and then uploads.
  let needLogin = false;
  uploadBtn?.addEventListener("click", () => {
    uploadBtn.disabled = true;
    (needLogin ? invoke("pm_login") : Promise.resolve())
      .then(() => invoke("upload_combat_log")) // no id: the backend saves and uploads the fight that just ended
      .then((result) => {
        needLogin = false;
        upload = { url: String(result?.url || "") };
        // Same record as Fight history (storico.tsx), so the fight shows as uploaded there too.
        if (result?.fightId) {
          let done = {};
          try {
            done = JSON.parse(localStorage.getItem("pm.uploadedFights") || "{}") || {};
          } catch {
            // unreadable: start over, as storico does
          }
          localStorage.setItem("pm.uploadedFights", JSON.stringify({ ...done, [result.fightId]: upload.url }));
        }
        render();
      })
      .catch((err) => {
        console.warn("[PowerMeter] upload failed", err);
        needLogin = err === "not signed in" || err === "unauthorized";
        const training = err === "training fights are not uploaded";
        $(".pmUploadLabel").textContent = needLogin
          ? t("pmWidget.end.signIn", "Sign in with Discord")
          : training
            ? t("pmWidget.end.training", "Training fights are not uploaded")
            : tf("pmWidget.end.failed", { error: String(err) }, `Upload failed: ${err}`);
        uploadBtn.disabled = training; // nothing to retry for a training fight
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
  // --- Copy: the widget as an image on the clipboard, to paste in Discord. The window
  // controls and hover marks are left out of the shot (.isPmShot in the theme CSS).
  const summaryBtn = $(".pmCopyBtn");
  let copied = false;
  let copiedTimer;
  const markCopied = (on) => {
    copied = on;
    const label = on ? t("pmWidget.copied", "Copied, paste it in Discord") : t("pmWidget.copy", "Copy as image for Discord");
    summaryBtn.classList.toggle("isCopied", on);
    summaryBtn.title = label;
    summaryBtn.setAttribute("aria-label", label);
    render(); // the bar's title slot says it too
  };
  summaryBtn?.addEventListener("click", async () => {
    const r = meter.getBoundingClientRect();
    const k = window.devicePixelRatio || 1; // the capture is in physical pixels
    meter.classList.add("isPmShot");
    await new Promise((painted) => requestAnimationFrame(() => requestAnimationFrame(painted)));
    try {
      await invoke("capture_screenshot", {
        x: Math.round(r.left * k),
        y: Math.round(r.top * k),
        width: Math.round(r.width * k),
        height: Math.round(r.height * k),
      });
      markCopied(true);
      clearTimeout(copiedTimer);
      copiedTimer = setTimeout(() => markCopied(false), 2500);
    } catch (err) {
      console.error("[PowerMeter] copy image failed", err);
    } finally {
      meter.classList.remove("isPmShot");
    }
  });
  $(".pmReportBtn")?.addEventListener("click", () => {
    if (lastFight?.userRow) app.openRowDetailsWindow(lastFight.userRow);
  });
  // Copy the backend's capture diagnosis (Npcap, game window, every adapter) for Discord.
  const diagnoseBtn = $(".pmDiagnoseBtn");
  diagnoseBtn?.addEventListener("click", async () => {
    try {
      const report = await invoke("get_capture_diagnosis");
      const widget = `Widget: game running=${!!app.aionRunning}, detecting=${!!app.isDetectingPort}, shown="${$(".pmErrorText")?.textContent || ""}"`;
      await navigator.clipboard.writeText(`${report}${widget}\n`);
      diagnoseBtn.textContent = t("pmWidget.error.diagnosisCopied", "Copied, paste it in Discord");
      setTimeout(() => (diagnoseBtn.textContent = t("pmWidget.error.diagnose", "Copy diagnosis")), 2500);
    } catch (err) {
      console.error("[PowerMeter] copy diagnosis failed", err);
    }
  });

  // Game packets per adapter over the last RECENT_MS: [time, count] samples per status poll.
  const gameSamples = new Map();
  const gameAdapter = (now) => {
    let found = null;
    for (const d of app.captureDevices || []) {
      const s = gameSamples.get(d.name) || [];
      if (!s.length || s.at(-1)[1] !== d.gamePackets) s.push([now, d.gamePackets]);
      while (s.length > 1 && now - s[0][0] > RECENT_MS) s.shift();
      gameSamples.set(d.name, s);
      if (d.gamePackets - s[0][1] >= GAME_PACKETS_MIN) found = d;
    }
    return found;
  };
  // Why there is no game connection, from what each adapter sees; "" = nothing wrong.
  const connectionProblem = (now) => {
    const devices = app.captureDevices || [];
    const game = gameAdapter(now);
    if (!app.aionRunning) return game ? t("pmWidget.error.noWindow", "The game is online but its window is not recognised") : "";
    if (!devices.some((d) => d.running)) return t("pmWidget.error.noAdapter", "Npcap cannot open any network adapter");
    if (!devices.some((d) => d.lastFrameMs > 0 && now - d.lastFrameMs < RECENT_MS))
      return t("pmWidget.error.noPackets", "The network adapters receive no packets: check Npcap or restart the PC");
    if (!game) return t("pmWidget.error.noGame", "Traffic arrives, but no game packets: VPN, ExitLag or an adapter not captured?");
    return tf("pmWidget.error.locking", { device: game.name }, `Game packets on ${game.name}, connecting…`);
  };
  // Fight over: the summary's Reset clears the meter like the old header reset.
  meter.querySelectorAll(".pmEndResetBtn, .pmLiveResetBtn").forEach((btn) =>
    btn.addEventListener("click", () => app.refreshDamageData({ reason: "fight summary reset" }))
  );

  // --- Trainer (the dashboard's, meter.tsx): a 3-2-1 countdown, then the meter starts from zero on
  // training dummies only and shows the local player's numbers. Stop freezes them, Restart runs the
  // countdown and the reset again; closing puts the old mode back (nothing changes during the countdown).
  // It reads the raw dps-update (tauriBridge.js): core.js's rows carry no localPlayerId or battleTime.
  const TRAINER_COUNTDOWN = 3;
  const trainerEl = $(".pmTrainer");
  const trainerBtn = $(".pmTrainerBtn");
  let trainer = null; // { n, timer, prevMode, started, ready, raw, cur, frozen } while open
  // You, or the only player hitting the dummy while the engine does not know you yet.
  const trainee = (d) => {
    if (!d?.map) return null;
    if (d.localPlayerId != null && d.map[d.localPlayerId]) return { id: String(d.localPlayerId), ...d.map[d.localPlayerId] };
    const hitting = Object.entries(d.map).filter(([id, v]) => Number(id) > 0 && v?.amount > 0);
    return hitting.length === 1 ? { id: hitting[0][0], ...hitting[0][1] } : null;
  };
  // Your badges and skills on the dummy, from the same breakdown as a row click (core.js getDetails),
  // at most once a second; the backend sums every dummy hit.
  const TRAINER_DETAIL_MS = 1000;
  const trainerDetailEl = $(".pmTrainerDetail");
  const refreshTrainerDetail = async (run, id) => {
    if (!trainerDetailEl || Date.now() - (run.detailAt || 0) < TRAINER_DETAIL_MS) return;
    run.detailAt = Date.now();
    try {
      const details = await app.getDetails({ id });
      if (trainer === run && !run.frozen) renderDetail({ id }, details, trainerDetailEl, false);
    } catch (err) {
      console.error("[PowerMeter] trainer breakdown failed", err);
    }
  };
  const renderTrainer = () => {
    const counting = trainer.n > 0;
    const cur = trainer.frozen || (trainer.ready ? trainer.cur : null);
    trainerEl.classList.toggle("isCounting", counting);
    trainerEl.classList.toggle("hasData", !!cur);
    trainerEl.classList.toggle("isFrozen", !!trainer.frozen);
    $(".pmTrainerStop").disabled = !cur;
    if (counting) return;
    setText(".pmTrainerDpsN", cur ? num(cur.dps) : "—");
    setText(".pmTrainerTime", cur ? clock(Math.floor(cur.ms / 1000)) : "");
    setText(".pmTrainerDmg", cur ? num(cur.dmg) : "");
    setText(".pmTrainerTarget", cur?.target || "");
  };
  const countdown = (n) => {
    trainer.n = n;
    if (n) $(".pmTrainerCount").innerHTML = `<span class="pmTrainerN">${n}</span>`;
    renderTrainer();
    if (!n) return;
    trainer.timer = setTimeout(() => {
      if (n === 1) {
        const run = trainer;
        run.started = true;
        run.ready = false; // until the reset is done the meter still holds the previous fight
        invoke("set_target_mode", { mode: "dummyTargets" })
          .then(() => invoke("reset_combat"))
          .then(() => {
            run.ready = true;
            if (trainer === run) renderTrainer();
          })
          .catch((err) => console.error("[PowerMeter] trainer start failed", err));
      }
      countdown(n - 1);
    }, 1000);
  };
  const clearTrainerDetail = () => trainerDetailEl?.querySelectorAll(".pmBadges, .pmSkills").forEach((el) => (el.innerHTML = ""));
  const openTrainer = () => {
    clearTrainerDetail();
    const mode = app.safeParseJSON(window.dpsData?.getDpsData?.(), null)?.targetMode;
    trainer = { prevMode: mode && mode !== "dummyTargets" ? mode : app.targetSelection };
    meter.classList.add("isPmTrainer");
    trainerEl.dataset.cls = $(".pmCharBar")?.dataset.cls || ""; // your class (src/widget/charBar.ts)
    countdown(TRAINER_COUNTDOWN);
    $(".pmTrainerClose").focus();
    emitMeterState();
  };
  function closeTrainer() {
    if (!trainer) return;
    clearTimeout(trainer.timer);
    // Through the bridge: the old mode's numbers at once, and late dummy updates dropped.
    if (trainer.started) window.javaBridge?.setTargetSelection?.(trainer.prevMode);
    trainer = null;
    const hadFocus = trainerEl.contains(document.activeElement);
    meter.classList.remove("isPmTrainer");
    if (hadFocus) trainerBtn?.focus();
    emitMeterState();
  }
  // To the Options window (Controls.tsx): the dummy test's state and the layout, at each change and on request.
  function emitMeterState() {
    if (!isActive()) return;
    window.__TAURI__.event
      .emit("pm-meter-state", { dummy: !!trainer, compact: meter.classList.contains("slim") })
      .catch((err) => console.error("[PowerMeter] pm-meter-state failed", err));
  }
  // Every poll: the latest numbers, parsed only when a new update came in.
  const tickTrainer = () => {
    if (!trainer?.ready || trainer.frozen) return;
    const raw = window.dpsData?.getDpsData?.() ?? null;
    if (raw === trainer.raw) return;
    trainer.raw = raw;
    const d = app.safeParseJSON(raw, null);
    const me = trainee(d);
    trainer.cur = me?.amount > 0 ? { dps: me.dps, dmg: me.amount, ms: Number(d.battleTime) || 0, target: d.targetName || "" } : null;
    renderTrainer();
    if (trainer.cur) refreshTrainerDetail(trainer, me.id);
  };
  trainerBtn?.addEventListener("click", openTrainer);
  // The Options window starts / stops the dummy test (its Mode switch).
  window.__TAURI__.event
    .listen("pm-trainer-toggle", () => (trainer ? closeTrainer() : openTrainer()))
    .catch((err) => console.error("[PowerMeter] pm-trainer-toggle listener failed", err));
  meter.querySelectorAll(".pmTrainerClose, .pmTrainerDone").forEach((btn) => btn.addEventListener("click", closeTrainer));
  trainerEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeTrainer();
  });
  $(".pmTrainerStop")?.addEventListener("click", () => {
    trainer.frozen = trainer.cur;
    renderTrainer();
    $(".pmTrainerDone").focus(); // Stop is gone; Close takes its place
  });
  $(".pmTrainerRestart")?.addEventListener("click", () => {
    trainer.frozen = null;
    trainer.cur = null;
    trainer.raw = null;
    trainer.detailAt = 0;
    clearTrainerDetail();
    countdown(TRAINER_COUNTDOWN);
    $(".pmTrainerClose").focus(); // the actions hide during the countdown
  });

  // --- render
  const setText = (sel, text) => {
    const el = $(sel);
    if (el && el.textContent !== text) el.textContent = text;
  };
  // Compact footer (the only layout that shows it): the party's total for the tab, every player in
  // the fight as core.js updateMeterTotalBar, short as the rows ("28,4k/s"). Aggro: damage taken.
  const TOTAL_OF = { dps: (r) => r.dps, heal: (r) => r.hps, aggro: (r) => r.damageTaken };
  const renderTotal = () => {
    const el = $(".pmTotal");
    const rows = frame?.rows || [];
    if (!el) return;
    el.hidden = !rows.length;
    if (el.hidden) return;
    const sum = rows.reduce((acc, r) => acc + (Number(TOTAL_OF[mode](r)) || 0), 0);
    setText(".pmTotalDps", `${app.meterUI.formatShort(sum)}${mode === "aggro" ? "" : "/s"}`);
  };
  const render = () => {
    meter.querySelectorAll(".pmTab").forEach((tab) => {
      const on = tab.dataset.pmMode === mode;
      tab.classList.toggle("isActive", on);
      tab.setAttribute("aria-selected", String(on));
    });
    setText(".pmColStat", mode === "heal" ? "HPS" : mode === "aggro" ? t("pmWidget.cols.hits", "Hits") : "DPS");
    setText(".pmColTab", t(`pmWidget.tabs.${mode === "dps" ? "dmg" : mode}`, mode));
    meter.classList.toggle("pmTab-aggro", mode === "aggro"); // Compact: no per-second column on Aggro
    meter.style.setProperty("--pm-you-label", JSON.stringify(` ${t("pmWidget.you", "(you)")}`));
    let title = "";
    if (view === "ended") title = t("pmWidget.end.title", "Ended");
    if (copied) title = t("pmWidget.copied", "Copied, paste it in Discord");
    setText(".pmBarTitle", title);
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
    setText(".pmModeTitle", app.getDefaultTargetLabel?.(frame?.targetMode || app.targetSelection) || "");
    if (avgOn) renderAvg();
    renderTotal();
  };

  const setView = (next) => {
    if (next === view) return;
    for (const v of ["live", "waiting", "ended", "error"]) meter.classList.toggle(`pmView-${v}`, next === v);
    view = next;
    render();
  };

  // Every poll (100 ms): work out which state the DPS view is in.
  const tick = () => {
    if (!isActive()) return;
    tickTrainer();
    const state = app.battleTime?.getState?.() || "";
    const fighting = state === "state-fighting" || state === "state-grace";
    if (fighting && !wasFighting) {
      endDismissed = false;
      upload = null;
      const label = $(".pmUploadLabel");
      if (label) label.textContent = t("pmWidget.end.upload", "Upload log");
      if (uploadBtn) uploadBtn.disabled = false;
      needLogin = false;
    }
    if (!fighting && wasFighting && (state === "state-ended" || state === "state-idle")) {
      lastFight = summarize() || lastFight;
      render();
    }
    wasFighting = fighting;

    let error = "";
    const now = Date.now();
    const problem = connectionProblem(now);
    if (app.pcapError) error = t("pmWidget.error.npcap", "Npcap is not available");
    else if (app.aionRunning ? app.isDetectingPort : problem) {
      detectingSince ||= now;
      if (now - detectingSince > DIAG_AFTER_MS) error = problem;
    } else detectingSince = 0;
    setText(".pmErrorText", error);
    setText(
      ".pmError .pmCardTitle",
      app.pcapError ? t("pmWidget.error.title", "Capture stopped") : t("pmWidget.error.notConnected", "Not connected to the game")
    );

    // Compact shows the status as its dot alone (the text did not fit): the dot's colour says the connection,
    // its tooltip and name say the words (powermeter-theme.css [data-pm-conn]).
    const statusRoot = document.querySelector(".battleTime");
    const statusDot = statusRoot?.querySelector(".status");
    if (statusDot) {
      const conn = app._captureSuspended || !app.aionRunning ? "off" : app.isDetectingPort ? "detecting" : "ok";
      if (statusRoot.dataset.pmConn !== conn) statusRoot.dataset.pmConn = conn;
      const words = statusRoot.querySelector(".analysisStatus")?.textContent.trim() || "";
      if (statusDot.title !== words) {
        statusDot.title = words;
        statusDot.setAttribute("aria-label", words);
        statusDot.setAttribute("role", "img");
      }
    }

    const hasRows = !!app.elList?.classList.contains("hasRows");
    let next = "live";
    if (!hasRows) next = error ? "error" : "waiting";
    else if (!fighting && lastFight && !endDismissed && summarize()) next = "ended";
    setView(next);

    // Pill: your DPS and the fight time; "Ready" with nothing to show.
    meter.classList.toggle("isPmIdle", !hasRows);
    if (summaryBtn) summaryBtn.disabled = !hasRows;
    const me = frame?.rows?.find((r) => r.isUser);
    setText(".pmPillDps", num(me?.dps ?? 0));
    setText(".pmPillTime", app.battleTime?.getCombatTimeText?.() || "0:00");
  };

  // After each render: title, HP readout and target extras.
  const onFrame = (next) => {
    frame = next;
    if (avgOn) renderAvg();
    renderTotal();
    setText(".pmModeTitle", app.getDefaultTargetLabel?.(next.targetMode || app.targetSelection) || "");
    // HP as the design writes it ("5.076.235 HP - 61,8%"), same remaining-HP rule as core.js updateBossHpBar.
    const maxHp = Number(next.targetMaxHp) || 0;
    meter.classList.toggle("hasPmHp", maxHp > 0);
    if (maxHp > 0) {
      const live = Number(next.targetCurrentHp);
      const left = live >= 0 ? Math.min(maxHp, live) : Math.max(0, maxHp - (Number(next.targetTotalDamage) || 0));
      setText(".pmHpText", `${num(left)} HP - ${oneDec((left / maxHp) * 100)}%`);
      setText(".pmHpPct", pct((left / maxHp) * 100));
      $(".bossHpBar")?.classList.toggle("isPmKilled", left <= 0);
    }
    const berserk = $(".pmBerserk");
    const berserkMs = Number(next.targetBerserkMs);
    const hasBerserk = next.targetBerserkMs != null && Number.isFinite(berserkMs) && berserkMs >= 0;
    if (berserk) {
      berserk.hidden = !hasBerserk;
      if (hasBerserk) {
        const sec = Math.ceil(berserkMs / 1000);
        setText(".pmBerserkTime", clock(sec));
        berserk.classList.toggle("isUrgent", sec <= 30); // design: red for the last 30 s
      }
    }
    const phase = $(".pmPhase");
    if (phase) {
      const n = Number(next.targetPhase);
      phase.hidden = !(next.targetPhase != null && Number.isFinite(n) && n > 0);
      if (!phase.hidden) phase.textContent = tf("pmWidget.phase", { n }, `Phase ${n}`);
    }
    const stagger = $(".pmStagger");
    const st = next.targetStagger;
    if (stagger) {
      stagger.hidden = !(st?.max > 0);
      if (!stagger.hidden) {
        // Broken (groggy): the gauge reads empty until the refill record. The engine keeps cur <= max.
        const p = st.broken ? 0 : Math.round((st.cur / st.max) * 100);
        stagger.classList.toggle("isBroken", !!st.broken);
        $(".pmStaggerFill").style.width = `${p}%`;
        setText(".pmStaggerPct", `${p}%`);
      }
    }
  };

  // --- Compact preferences, chosen in the Options window (Controls.tsx) and kept in the shared settings as one
  // JSON (pm.compactPrefs; localStorage up to 0.5.65, moved over once). Every value is read back through a
  // whitelist, so nothing saved ever reaches a style unchecked. Applied as classes and two custom properties
  // on .meter, used by the Compact rules only (powermeter-theme.css).
  const PREFS_KEY = "pm.compactPrefs";
  // "class" (default): each row's bar in its class colour, as in the Interface layout ([data-cls] --cls in
  // powermeter-theme.css); the UI accent (switches, your ring, the HP bar) is then the azure.
  const ACCENTS = { class: "#4cc2ff", azure: "#4cc2ff", violet: "#a78bfa", green: "#34d399", amber: "#fbbf24", pink: "#fb7185" };
  const PREFS_VERSION = 2; // 2: "class" bars became the default
  // Card opacity. The design's 0.4 / 0.7 left the text unreadable over a bright desktop (Nazario, 0.5.64):
  // 0.95 keeps the muted text well over 4.5:1 on white and hides what is behind; "clear" stays see-through
  // and gives the text a halo instead (powermeter-theme.css .pmBg-clear).
  const BGS = { clear: 0.7, soft: 0.95, full: 1 };
  const ROW_COUNTS = [3, 5, 8];
  const SWITCHES = ["icons", "rank", "bars", "header", "cTotal", "cRate", "cShare", "cDeaths"];
  // The Standard preset (Controls.tsx PRESETS.std).
  const DEFAULTS = { icons: true, rank: false, bars: true, header: true, cTotal: true, cRate: true, cShare: true, cDeaths: false, dense: true, rows: 5, bg: "soft", accent: "class" };
  const readPrefs = (raw) => {
    let saved = {};
    try {
      saved = JSON.parse(raw || "{}") || {};
    } catch {
      // unreadable: the defaults
    }
    const prefs = { ...DEFAULTS };
    for (const key of [...SWITCHES, "dense"]) if (typeof saved[key] === "boolean") prefs[key] = saved[key];
    if (saved.v !== PREFS_VERSION) prefs.icons = true; // class icons became the default with version 2
    if (ROW_COUNTS.includes(saved.rows)) prefs.rows = saved.rows;
    if (Object.hasOwn(BGS, saved.bg)) prefs.bg = saved.bg;
    // 0.5.64 saved its default azure with any change: only a colour picked since counts.
    if (Object.hasOwn(ACCENTS, saved.accent) && (saved.v === PREFS_VERSION || saved.accent !== "azure")) prefs.accent = saved.accent;
    return prefs;
  };
  let prefs = readPrefs(null);
  const isSlim = () => meter.classList.contains("slim");
  const usePrefs = (raw) => {
    prefs = readPrefs(raw);
    meter.style.setProperty("--pm-accent", ACCENTS[prefs.accent]);
    meter.classList.toggle("pmBars-class", prefs.accent === "class");
    meter.style.setProperty("--pm-card-alpha", String(BGS[prefs.bg]));
    for (const key of [...SWITCHES, "dense"]) meter.classList.toggle(`pmPref-${key}`, prefs[key]);
    meter.classList.toggle("pmBg-clear", prefs.bg === "clear");
    if (frame) app.meterUI.updateFromRows(frame.rows); // the visible players, at once
  };
  invoke("get_settings")
    .then((settings) => {
      const legacy = app.safeGetStorage(PREFS_KEY);
      if (settings[PREFS_KEY] != null || !legacy) return usePrefs(settings[PREFS_KEY]);
      // The choices made before 0.5.66 move to the settings, checked, and leave localStorage once they are saved.
      const value = JSON.stringify({ ...readPrefs(legacy), v: PREFS_VERSION });
      usePrefs(value);
      return invoke("update_settings", { key: PREFS_KEY, value }).then(() => localStorage.removeItem(PREFS_KEY));
    })
    .catch((err) => console.error("[PowerMeter] compact preferences failed", err));
  window.__TAURI__.event
    .listen("setting-changed", ({ payload }) => {
      if (payload?.key === PREFS_KEY) usePrefs(String(payload.value));
    })
    .catch((err) => console.error("[PowerMeter] setting-changed listener failed", err));
  // The settings button opens the Options window, or closes it when it is open.
  $(".pmCustomBtn")?.addEventListener("click", () =>
    invoke("toggle_controls_window").catch((err) => console.error("[PowerMeter] toggle_controls_window failed", err))
  );
  // The Options window shows whether the dummy test runs and offers the compact preferences in that layout only.
  window.__TAURI__.event
    .listen("pm-meter-state-request", () => emitMeterState())
    .catch((err) => console.error("[PowerMeter] pm-meter-state-request listener failed", err));
  // Compact shows the chosen number of players; the Interface layout keeps the Settings value.
  const rowLimit = () => (isSlim() ? prefs.rows : 0);

  window.i18n?.onChange?.(render);
  usePrefs(null);
  meter.classList.add("pmMode-dps"); // the three tabs share the DPS layout and states
  syncTheme();
  render();

  return { isActive, syncTheme, tick, onFrame, openDetail, getStat: () => mode, rowLimit };
};
