// Target modes the meter accepts. The first four are exclusive (each hit counts
// in exactly one); Target and All are the older cross-mode views.
const TARGET_MODES = ["bossTargets", "pveTargets", "pvpTargets", "lastHitByMe", "allTargets"];

class DpsApp {
  constructor() {
    if (DpsApp.instance) return DpsApp.instance;

    this.POLL_MS = 100;
    this.WINDOW_TITLE_POLL_MS = 3000;
    this.USER_NAME = "";
    this.onlyShowUser = false;
    this.debugLoggingEnabled = false;
    this.pinMeToTop = false;
    this.slimMode = false;
    this.mainPlayerNamesBold = true;
    this.mainPlayerDpsBold = true;
    this.includeMainMeterScreenshot = false;
    this.saveScreenshotToFolder = false;
    this.screenshotFolder = "";
    this.storageKeys = {
      userName: "dpsMeter.userName",
      // "Only my DPS" flag (footer): shared with the dashboard, "1" on / "" off.
      onlyShowUser: "pm.onlyMe",
      trainSelectionMode: "dpsMeter.trainSelectionMode",
      meterFillOpacity: "dpsMeter.meterFillOpacity",
      detailsBackgroundOpacity: "dpsMeter.detailsBackgroundOpacity",
      detailsFontSize: "dpsMeter.detailsFontSize",
      detailsIconSize: "dpsMeter.detailsIconSize",
      detailsIncludeMeterScreenshot: "dpsMeter.detailsIncludeMeterScreenshot",
      detailsSaveScreenshotToFolder: "dpsMeter.detailsSaveScreenshotToFolder",
      detailsScreenshotFolder: "dpsMeter.detailsScreenshotFolder",
      detailsHiddenColumns: "dpsMeter.detailsHiddenColumns",
      detailsSeenColumns: "dpsMeter.detailsSeenColumns",
      defaultMeterMode: "dpsMeter.defaultMeterMode",
      targetSelection: "dpsMeter.targetSelection",
      displayMode: "dpsMeter.displayMode",
      language: "dpsMeter.language",
      debugLogging: "dpsMeter.debugLoggingEnabled",
      pinMeToTop: "dpsMeter.pinMeToTop",
      mainPlayerNamesBold: "dpsMeter.mainPlayerNamesBold",
      mainPlayerDpsBold: "dpsMeter.mainPlayerDpsBold",
      showPing: "dpsMeter.showPing",
      showTotalDps: "dpsMeter.showTotalDps",
      roundDps: "dpsMeter.roundDps",
      playerLimit: "dpsMeter.playerLimit",
      theme: "dpsMeter.theme",
      slimMode: "dpsMeter.slimMode",
      saveRawPackets: "dpsMeter.saveRawPackets",
      windowOpacity: "dpsMeter.windowOpacity",
      bossNameSize: "dpsMeter.bossNameSize",
      detailsMonitor: "dpsMeter.detailsMonitor",
      showSuspendBtn: "dpsMeter.showSuspendBtn",
    };

    // PowerMeter: digits grouped the way the UI language does ("18.420" in
    // Italian, "9.264" too: Italian skips 4-digit grouping by default), as the
    // design shows. A stable object because details/history
    // hold on to it; the formatter underneath follows language changes.
    const numberFormats = new Map();
    this.dpsFormatter = {
      format: (n) => {
        const lang = window.i18n?.getLanguage?.() || "en";
        if (!numberFormats.has(lang)) numberFormats.set(lang, new Intl.NumberFormat(lang, { useGrouping: "always" }));
        return numberFormats.get(lang).format(n);
      },
    };
    this.lastJson = null;
    this.isCollapse = false;
    this._windowHidden = false;
    this.displayMode = "dps";
    // PowerMeter: the design's own theme is the default. One theme for all of PowerMeter:
    // the dashboard reads the same setting (src/dashboard/pages/system/theme.ts THEMES).
    this.theme = "powermeter";
    this.availableThemes = [
      "powermeter",
      "aion2",
      "asmodian",
      "cogni",
      "elyos",
      "ember",
      "fera",
      "frost",
      "natura",
      "obsidian",
      "varian",
    ];
    this.jobColorMap = {
      정령성: "#E06BFF",
      Spiritmaster: "#E06BFF",
      궁성: "#41D98A",
      Ranger: "#41D98A",
      살성: "#7BE35A",
      Assassin: "#7BE35A",
      수호성: "#5F8CFF",
      Templar: "#5F8CFF",
      마도성: "#9A6BFF",
      Sorcerer: "#9A6BFF",
      호법성: "#FF9A3D",
      Chanter: "#FF9A3D",
      치유성: "#F2C15A",
      Cleric: "#F2C15A",
      검성: "#4FD1C5",
      Gladiator: "#4FD1C5",
      권성: "#E85D5D",
      Brawler: "#E85D5D",
      Fighter: "#E85D5D",
    };

    // 빈데이터 덮어쓰기 방지 스냅샷
    this.lastSnapshot = null;
    // reset 직후 서버가 구 데이터 계속 주는 현상 방지
    this.resetPending = false;
    this.refreshPending = false;
    this.refreshPendingStartedAt = 0;

    this.BATTLE_TIME_BASIS = "render";
    this.GRACE_MS = 30000;
    this.GRACE_ARM_MS = 3000;
    this.DETAILS_FONT_SIZE_MIN = 11;
    this.DETAILS_FONT_SIZE_MAX = 20;
    this.DETAILS_ICON_SIZE_MIN = 20;
    this.DETAILS_ICON_SIZE_MAX = 56;


    // battleTime 캐시
    this._battleTimeVisible = false;
    this._lastBattleTimeMs = null;

    this._pollTimer = null;
    this._windowTitleTimer = null;

    this.i18n = window.i18n;
    this.targetSelection = "bossTargets";
    this.listSortDirection = "desc";
    this.lastTargetMode = "";
    this.lastTargetName = "";
    this.lastTargetId = 0;
    this._lastRenderedListSignature = "";
    this._lastRenderedTargetLabel = "";
    this._lastTargetSelection = this.targetSelection;
    this._lastRenderedRowsSummary = null;
    this.localPlayerId = null;
    this.trainSelectionMode = "all";
    this._detailsFlashTimer = null;
    this._meterFlashTimer = null;
    this._recentLocalIdByName = new Map();
    this.pinnedDetailsRowId = null;
    this.hoveredDetailsRowId = null;
    this.setWindowDragFreeze(false);
    this.latestRowsById = new Map();
    this.isWindowDragging = false;
    this.isMeterBarHovered = false;
    this.deferFetchUntilDragEnd = false;
    this.deferFetchUntilHoverEnd = false;
    this.suppressRowInteractionUntilMs = 0;
    this.hoverTooltipCacheByRowId = new Map();
    this.hoverTooltipRequestSeqByRowId = new Map();
    this.hoverTooltipEl = null;
    this.hoverMousePos = { x: 0, y: 0 };
    this.hoverTooltipPendingRowIds = new Set();

    DpsApp.instance = this;
  }

  safeGetStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      globalThis.uiDebug?.log?.("localStorage.get blocked", { key, error: String(e) });
      return null;
    }
  }

  safeSetStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      globalThis.uiDebug?.log?.("localStorage.set blocked", { key, error: String(e) });
    }
  }

  safeGetSetting(key) {
    try {
      const bridgeValue = window.javaBridge?.getSetting?.(key);
      if (bridgeValue !== undefined && bridgeValue !== null) {
        return bridgeValue;
      }
    } catch (e) {
      globalThis.uiDebug?.log?.("getSetting blocked", { key, error: String(e) });
    }
    return this.safeGetStorage(key);
  }

  safeSetSetting(key, value) {
    try {
      window.javaBridge?.setSetting?.(key, value);
    } catch (e) {
      globalThis.uiDebug?.log?.("setSetting blocked", { key, error: String(e) });
    }
    this.safeSetStorage(key, value);
  }


  static createInstance() {
    if (!DpsApp.instance) DpsApp.instance = new DpsApp();
    return DpsApp.instance;
  }

  start() {
    window._dpsApp = this;
    this.elList = document.querySelector(".list");
    this.elBossName = document.querySelector(".bossName");
    this.elBossName.textContent = this.getDefaultTargetLabel();
    this._lastRenderedTargetLabel = this.elBossName.textContent;
    this.elBossHpBar = document.querySelector(".bossHpBar");
    this.elBossHpFill = document.querySelector(".bossHpFill");
    this.elBossHpText = document.querySelector(".bossHpText");
    this.battleTimeRoot = document.querySelector(".battleTime");
    this.analysisStatusEl = document.querySelector(".analysisStatus");
    this.aionRunning = false;
    this.isDetectingPort = false;
    this._connectionStatusOverride = false;

    this.resetBtn = document.querySelector(".resetBtn");
    this.suspendBtn = document.querySelector(".suspendBtn");
    this.headerBtns = document.querySelector(".headerBtns");
    this.targetModeBtn = document.querySelector(".footerBtns .targetModeBtn");
    this.collapseBtn = document.querySelector(".collapseBtn");
    this.metricToggleBtn = document.querySelector(".metricToggleBtn");
    this.onlyMeBtn = document.querySelector(".onlyMeBtn");

    this.bindHeaderButtons();
    this.bindDragToMoveWindow();
    this.bindResizeHandle();
    this.initHoverTooltip();

    this.meterUI = createMeterUI({
      elList: this.elList,
      dpsFormatter: this.dpsFormatter,
      getUserName: () => this.USER_NAME,
      getMetric: (row) => this.getMetricForRow(row),
      getSortDirection: () => this.listSortDirection,
      getPinUserToTop: () => this.pinMeToTop,
      getPlayerLimit: () => this.playerLimit,
      getOnlyUser: () => this.onlyShowUser,
      onHoverUserRow: (row, event) => {
        if (this.shouldSuppressRowInteractions()) return;
        this.openHoverDetailsRow(row, event);
      },
      onLeaveUserRow: () => {
        this.hoveredDetailsRowId = null;
        requestAnimationFrame(() => {
          const hoveredRow = this.elList?.querySelector?.(".item:hover");
          if (hoveredRow) return;
          // Only the hover tooltip belongs to hovering. Leaving a row used to
          // close the Details view as well, which killed a Details opened any
          // other way — the target-name path clears pinnedDetailsRowId before
          // opening, so the pin guard never protected it. Hover never opens the
          // panel (openHoverDetailsRow bails when it is already open), so there
          // is nothing here for it to close.
          this.hideHoverTooltip();
        });
      },
      onClickUserRow: (row) => {
        if (!row || this.isWindowDragging) return;
        // PowerMeter: the breakdown opens inside the widget (design 8.3); its
        // header still leads to the full Details window.
        if (this.pmWidget?.isActive()) {
          this.hideHoverTooltip();
          this.pmWidget.openDetail(row);
          return;
        }
        this.openRowDetailsWindow(row);
      },
    });
    // PowerMeter: the Details window for a row, out of onClickUserRow so the
    // widget's breakdown and fight summary can open it too.
    this.openRowDetailsWindow = (row) => {
      const rowId = Number(row?.id);
      const pinnedId = Number.isFinite(rowId) && rowId > 0 ? rowId : null;
      this.hideHoverTooltip();
      const options = this.getDefaultDetailsOpenOptions();
      // Details lives in its own window; the overlay only says what to show.
      // Only the in-overlay fallback pins the row — pinning suppresses the
      // hover tooltip, which should stay live when the panel is elsewhere.
      this.openDetailsSurface(
        {
          kind: "row",
          row: {
            id: pinnedId,
            name: row?.name ?? "",
            job: row?.job ?? "",
            isIdentifying: !!row?.isIdentifying,
          },
          defaultTargetAll: !!options.defaultTargetAll,
          defaultTargetId: options.defaultTargetId ?? null,
        },
        () => {
          this.pinnedDetailsRowId = pinnedId;
          this.detailsUI.open(row, { pin: true, ...options });
        }
      );
    };


    const withBacklog = (text) => {
      if (!window.javaBridge?.isRunningFromIde?.()) return text;
      const backlog = window.javaBridge?.getParsingBacklog?.();
      if (!Number.isFinite(backlog)) return text;
      return `${text} (backlog: ${backlog})`;
    };

    const getBattleTimeStatusText = () => {
      if (this._captureSuspended) {
        return this.i18n?.t?.("battleTime.suspended", "App suspended") ?? "App suspended";
      }
      if (!this.aionRunning) {
        const text = this.i18n?.t("battleTime.notRunning", "AION2 not running") ?? "AION2 not running";
        return withBacklog(text);
      }
      if (this.isDetectingPort) {
        const text = this.i18n?.t("connection.detecting", "Detecting AION2 connection...") ??
          "Detecting AION2 connection...";
        return withBacklog(text);
      }
      if (this.battleTime?.getState?.() === "state-idle") {
        const text = this.i18n?.t("battleTime.idle", "Idle") ?? "Idle";
        return withBacklog(text);
      }
      const text = this.i18n?.t("battleTime.analysing", "Monitoring data...") ?? "Monitoring data...";
      return withBacklog(text);
    };

    this.battleTime = createBattleTimeUI({
      rootEl: document.querySelector(".battleTime"),
      tickSelector: ".tick",
      statusSelector: ".status",
      analysisSelector: ".analysisStatus",
      getAnalysisText: getBattleTimeStatusText,
      graceMs: this.GRACE_MS,
      graceArmMs: this.GRACE_ARM_MS,
      idleMs: 60000,
      visibleClass: "isVisible",
      mirrorRootEl: document.querySelector(".pmDuration"),
    });
    this.battleTime.setVisible(false);
    this.updateConnectionStatusUi();

    this.pingEl = document.querySelector(".pingDisplay");
    this.signalEl = document.querySelector(".pmSignal");
    this.showPing = this.safeGetSetting(this.storageKeys.showPing) !== "false";
    // Ping is pushed immediately from PingTracker via window._dpsApp.updatePing().
    // A slow fallback poll handles edge cases (e.g. push not wired yet on startup).
    this._pingTimer = setInterval(() => this.updatePing(), 30000);

    this.showTotalDps = this.safeGetSetting(this.storageKeys.showTotalDps) !== "false";
    // PowerMeter: defaults off, so the meter shows the full figure ("18.420")
    // as the design does. `=== "true"` treats "never set" as disabled.
    this.roundDps = this.safeGetSetting(this.storageKeys.roundDps) === "true";
    this.meterTotalBar = document.querySelector(".meterTotalBar");
    this.meterTotalDpsEl = document.querySelector(".meterTotalDps");
    this.meterTotalDmgEl = document.querySelector(".meterTotalDmg");
    const savedLimit = parseInt(this.safeGetSetting(this.storageKeys.playerLimit), 10);
    this.playerLimit = Number.isFinite(savedLimit) && savedLimit >= 1 ? savedLimit : 6;

    this.detailsPanel = document.querySelector(".detailsPanel");
    this.detailsClose = document.querySelector(".detailsClose");
    this.detailsBackBtn = document.querySelector(".detailsBackBtn");
    this.detailsFightTitleEl = document.querySelector(".detailsFightTitle");
    this.detailsPartyListEl = document.querySelector(".detailsPartyList");
    this.detailsScreenshotBtn = document.querySelector(".detailsScreenshotBtn");
    this.detailsScreenshotNote = document.querySelector(".detailsScreenshotNote");
    this.detailsStatsEl = document.querySelector(".detailsStats");
    this.skillsListEl = document.querySelector(".skills");

    this.detailsUI = createDetailsUI({
      detailsPanel: this.detailsPanel,
      detailsClose: this.detailsClose,
      detailsBackBtn: this.detailsBackBtn,
      detailsFightTitleEl: this.detailsFightTitleEl,
      detailsPartyListEl: this.detailsPartyListEl,
      detailsStatsEl: this.detailsStatsEl,
      skillsListEl: this.skillsListEl,
      dpsFormatter: this.dpsFormatter,
      getDetails: (row, options) => this.getDetails(row, options),
      getDetailsContext: () => this.getDetailsContext(),
      onPinnedRowChange: (rowId) => {
        const nextId = Number(rowId);
        this.pinnedDetailsRowId = Number.isFinite(nextId) && nextId > 0 ? nextId : null;
      },
      // "Back to History" means the History window now, not a list drawn over
      // the fight — a fight window is one of several and the list is a window
      // in its own right. Only the overlay still opens the panel inline.
      onBack: () => {
        if (window.A2_VIEW === "main") {
          this.historyUI?.open?.();
          return;
        }
        // detailsUI.close() already ran, so a fight window is now empty. Going
        // back means "done with this fight": raise the list and dismiss this
        // window rather than leaving a blank one behind.
        const label = window.__TAURI__?.window?.getCurrentWindow?.()?.label || "";
        const isFightWindow = label.startsWith("details-");
        const sent = window.javaBridge?.requestDetailsView?.({ kind: "history" });
        Promise.resolve(sent)
          .catch(() => { if (!isFightWindow) this.historyUI?.open?.(); })
          .then(() => { if (isFightWindow) window.javaBridge?.closeToolWindow?.(); });
      },
    });
    if (this.detailsScreenshotBtn) {
      let screenshotNoteTimer = null;
      this.detailsScreenshotBtn.addEventListener("click", () => {
        const tooltipText =
          this.i18n?.t("details.screenshot.captured", "Captured Screenshot") ?? "Captured Screenshot";
        const meterRect = document.querySelector(".meter")?.getBoundingClientRect?.();
        const detailsRect = this.detailsPanel?.classList?.contains("open")
          ? this.detailsPanel.getBoundingClientRect()
          : null;
        const includeMeter = !!this.includeMainMeterScreenshot;
        const baseRect = includeMeter ? meterRect || detailsRect : detailsRect;
        if (!baseRect) return;
        const minX = includeMeter && meterRect && detailsRect
          ? Math.min(meterRect.left, detailsRect.left)
          : baseRect.left;
        const minY = includeMeter && meterRect && detailsRect
          ? Math.min(meterRect.top, detailsRect.top)
          : baseRect.top;
        const maxX = includeMeter && meterRect && detailsRect
          ? Math.max(meterRect.right, detailsRect.right)
          : baseRect.right;
        const maxY = includeMeter && meterRect && detailsRect
          ? Math.max(meterRect.bottom, detailsRect.bottom)
          : baseRect.bottom;
        const rectWidth = Math.max(1, maxX - minX);
        const rectHeight = Math.max(1, maxY - minY);
        const scale = window.devicePixelRatio || 1;
        const clipboardSuccess = window.javaBridge?.captureScreenshotToClipboard?.(
          minX,
          minY,
          rectWidth,
          rectHeight,
          scale
        );
        let fileSuccess = false;
        if (this.saveScreenshotToFolder && this.screenshotFolder) {
          const filename = this.buildScreenshotFilename();
          fileSuccess = !!window.javaBridge?.captureScreenshotToFile?.(
            minX,
            minY,
            rectWidth,
            rectHeight,
            scale,
            this.screenshotFolder,
            filename
          );
        }
        if ((!clipboardSuccess && !fileSuccess) || !this.detailsScreenshotNote) return;
        this.detailsScreenshotBtn.setAttribute("title", tooltipText);
        if (clipboardSuccess && fileSuccess) {
          this.detailsScreenshotNote.textContent = "Saved to clipboard + file";
        } else if (fileSuccess) {
          this.detailsScreenshotNote.textContent = "Saved to file";
        } else {
          this.detailsScreenshotNote.textContent = "Saved to clipboard";
        }
        this.detailsScreenshotNote.classList.add("isVisible");
        if (this.detailsPanel) {
          this.triggerDetailsFlash();
        }
        if (includeMeter && meterRect) {
          this.triggerMeterFlash();
        }
        if (screenshotNoteTimer) window.clearTimeout(screenshotNoteTimer);
        screenshotNoteTimer = window.setTimeout(() => {
          this.detailsScreenshotNote?.classList.remove("isVisible");
          this.detailsScreenshotNote.textContent = "";
        }, 2000);
      });
    }
    this.setupDetailsPanelSettings();
    this.applyStoredSettings();
    this.detailsUI?.updateLabels?.();
    this.i18n?.onChange?.(() => {
      this.detailsUI?.updateLabels?.();
      this.detailsUI?.refresh?.();
      this.updateDisplayToggleLabel();
      if (this.battleTime?.setAnalysisTextProvider) {
        this.battleTime.setAnalysisTextProvider(getBattleTimeStatusText);
      }
      this.refreshConnectionInfo();
      this.refreshBossLabel();
    });
    window.ReleaseChecker?.start?.();
    this.setupConsoleDebugging();
    this.bindNativeHotkeyBridge();

    const storedDisplayMode = this.safeGetStorage(this.storageKeys.displayMode);
    this.setDisplayMode(storedDisplayMode || this.displayMode, { persist: false });

    // History is a browser you leave open: picking a fight launches it into a
    // window of its own so several can be compared, and the list stays put.
    // Only the in-overlay fallback closes itself, because there the list and
    // the fight would otherwise be stacked in the same 30px-row window.
    this.historyUI = typeof createHistoryUI === "function"
      ? createHistoryUI({
          onOpenFight: (record) => {
            const inPlace = () => {
              this.historyUI?.close?.();
              this.detailsUI?.openHistoryFight?.(record);
            };
            const fightId = record?.id ? String(record.id) : "";
            if (!fightId) {
              inPlace();
              return;
            }
            this.openDetailsSurface({ kind: "fight", fightId }, inPlace);
          },
        })
      : null;

    // PowerMeter: widget chrome and modes (public/src/js/pmWidget.js).
    this.pmWidget =
      window.A2_VIEW === "main" && typeof createPmWidget === "function" ? createPmWidget(this) : null;

    this.startPolling();
    this.startWindowTitlePolling();
    this.fetchDps();
  }

  bindNativeHotkeyBridge() {
    if (this._nativeHotkeyBridgeBound) return;
    this._nativeHotkeyBridgeBound = true;

    window.addEventListener("nativeResetHotKey", () => {
      this.refreshDamageData({ reason: "native hotkey refresh" });
    });
  }

  nowMs() {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  }

  shouldSuppressRowInteractions() {
    return this.isWindowDragging || this.nowMs() < Number(this.suppressRowInteractionUntilMs || 0);
  }

  setWindowDragFreeze(active) {
    const enabled = !!active;
    document.documentElement?.classList?.toggle?.("windowDragFreeze", enabled);
    document.body?.classList?.toggle?.("windowDragFreeze", enabled);
    if (enabled) {
      try {
        const selection = window.getSelection?.();
        selection?.removeAllRanges?.();
      } catch {
        // noop
      }
    }
  }

  setMeterHoverFreeze(active) {
    const next = !!active;
    if (this.isMeterBarHovered === next) return;
    this.isMeterBarHovered = next;
    if (!next && this.deferFetchUntilHoverEnd) {
      this.deferFetchUntilHoverEnd = false;
      this.fetchDps();
    }
  }

  formatBattleTime(ms) {
    const totalMs = Number(ms);
    if (!Number.isFinite(totalMs) || totalMs <= 0) return "00:00";
    const totalSeconds = Math.floor(totalMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  safeParseJSON(raw, fallback = {}) {
    if (typeof raw !== "string") {
      return fallback;
    }
    try {
      const value = JSON.parse(raw);
      return value && typeof value === "object" ? value : fallback;
    } catch {
      return fallback;
    }
  }

  startPolling() {
    if (this._pollTimer) return;
    this._pollTimer = setInterval(() => {
      this.fetchDps();
      this.pmWidget?.tick(); // PowerMeter: widget states (waiting, fight over, error)
    }, this.POLL_MS);
  }

  startWindowTitlePolling() {
    if (this._windowTitleTimer) return;
    this._windowTitleTimer = setInterval(
      () => this.checkAion2WindowTitle(),
      this.WINDOW_TITLE_POLL_MS
    );
    this.checkAion2WindowTitle();
  }

  parseCharacterNameFromWindowTitle(title) {
    const trimmed = String(title ?? "").trim();
    if (!trimmed) return "";
    if (!trimmed.toLowerCase().startsWith("aion2")) return "";
    const remainder = trimmed.slice(5).trim();
    if (!remainder) return "";
    return remainder.replace(/^[|l:-]+/i, "").trim();
  }

  checkAion2WindowTitle() {
    const title = window.javaBridge?.getAion2WindowTitle?.();
    const running = typeof title === "string" && title.trim().length > 0;
    const changed = running !== this.aionRunning;
    this.aionRunning = running;
    // Every poll, not only when the window comes or goes: the lock and the adapters move
    // on while the window stays, and a status read once at "window found" (not locked
    // yet) left the widget on "detecting" / "no packets" with the meter connected.
    this.refreshConnectionInfo();
    if (changed) this.updateConnectionStatusUi();
    if (!running) return;
    const detectedName = this.parseCharacterNameFromWindowTitle(title);
    // Only a title that changed names a new character: the title can stay on the previous one after a
    // switch in game, and re-sending it would undo the name the game's self record just gave the backend.
    if (!detectedName || detectedName === this._lastTitleName) return;
    this._lastTitleName = detectedName;
    if (detectedName === this.USER_NAME) return;
    const hadPreviousName = !!this.USER_NAME;
    if (hadPreviousName) {
      // Character switch means new TCP connection — full refresh resets
      // port detection, backend data, and UI so new damage displays immediately.
      this.refreshDamageData({ reason: "character switch" });
    }
    this.setUserName(detectedName, { persist: true, syncBackend: true });
  }

  stopPolling() {
    if (!this._pollTimer) return;
    clearInterval(this._pollTimer);
    this._pollTimer = null;
  }

  /** Called from Kotlin when the window is hidden/shown (hotkey or auto-hide). */
  _setWindowHidden(hidden) {
    this._windowHidden = !!hidden;
    if (hidden) {
      this.stopPolling();
    } else {
      this.startPolling();
    }
  }

  resetAll({ callBackend = true } = {}) {
    this.resetPending = !!callBackend;


    this.lastSnapshot = null;
    this.lastJson = null;
    this.lastTargetMode = "";
    this.lastTargetName = "";
    this.lastTargetId = 0;
    this._lastRenderedListSignature = "";
    this._lastRenderedTargetLabel = "";
    this._lastRenderedRowsSummary = null;

    this._battleTimeVisible = false;
    this._lastBattleTimeMs = null;
    this.battleTime?.reset?.();
    this.battleTime?.setVisible?.(false);

    this.pinnedDetailsRowId = null;
    this.hoveredDetailsRowId = null;
    this.setWindowDragFreeze(false);
    this.setMeterHoverFreeze(false);
    this.detailsUI?.close?.({ keepPinned: false });
    this.meterUI?.onResetMeterUi?.();
    if (this.meterTotalBar) this.meterTotalBar.style.display = "none";

    if (this.elBossName) {
      this.elBossName.textContent = this.getDefaultTargetLabel();
    }
    if (this.battleTimeRoot) {
      this.battleTimeRoot.classList.add("isVisible");
    }
    if (this.analysisStatusEl) {
      if (this._captureSuspended) {
        this.analysisStatusEl.textContent =
          this.i18n?.t?.("battleTime.suspended", "App suspended") ?? "App suspended";
      } else {
        this.analysisStatusEl.textContent =
          this.i18n?.t("battleTime.analysing", "Monitoring data...") ?? "Monitoring data...";
      }
      this.analysisStatusEl.style.display = "";
    }
    this.updateConnectionStatusUi();
    this.logDebug("Target label reset: resetAll invoked.");
    this.logDebug("Meter list reset: resetAll invoked.");
    if (callBackend) {
      window.javaBridge?.resetDps?.();
    }
  }




  initHoverTooltip() {
    const container = document.querySelector(".container");
    if (!container || this.hoverTooltipEl) return;
    const tooltip = document.createElement("div");
    tooltip.className = "hoverDetailsTooltip";
    tooltip.setAttribute("aria-hidden", "true");
    container.appendChild(tooltip);
    this.hoverTooltipEl = tooltip;
  }

  hideHoverTooltip() {
    if (!this.hoverTooltipEl) return;
    this.hoverTooltipEl.classList.remove("isVisible");
    this.hoverTooltipEl.innerHTML = "";
  }

  openHoverDetailsRow(row, event = null) {
    if (!row || this.pinnedDetailsRowId !== null || this.shouldSuppressRowInteractions()) return;
    // PowerMeter: the design has no hover tooltip; a click opens the breakdown in place.
    if (this.pmWidget?.isActive()) return;
    const rowId = Number(row?.id);
    if (!Number.isFinite(rowId) || rowId <= 0) return;
    if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
      this.hoverMousePos = { x: event.clientX, y: event.clientY };
    }
    const isSameRow = this.hoveredDetailsRowId === rowId;
    this.hoveredDetailsRowId = rowId;
    if (this.detailsUI?.isOpen?.()) {
      return;
    }
    // Skip redundant tooltip renders when still hovering the same row
    if (isSameRow && this.hoverTooltipEl?.classList.contains("isVisible")) {
      return;
    }
    this.detailsUI?.close?.({ keepPinned: false });
    this.applyHoverTooltip(row, { forceRefresh: !isSameRow });
  }

  getJobColor(job) {
    return this.jobColorMap[String(job || "")] || "";
  }

  renderHoverTooltip(details, row, rowEl) {
    if (!this.hoverTooltipEl || !rowEl) return;
    const skills = Array.isArray(details?.skills) ? details.skills.slice(0, 5) : [];
    let top = 0;
    let left = 372;
    const dps = Number(row?.dps) || 0;
    const dpsText = `${this.dpsFormatter.format(dps)}${this.i18n?.t("meter.dpsSuffix", "/s") ?? "/s"}`;
    const totalDamage = Number(row?.totalDamage) || 0;
    const totalDamageText = this.dpsFormatter.format(totalDamage);

    const skillsHtml = skills
      .map((skill, index) => {
        const name = String(skill?.name || "-").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const dmg = this.dpsFormatter.format(Number(skill?.dmg) || 0);
        const theostoneNameColor = window.skillIcons?.getTheostoneNameColor?.(skill) || "";
        const skillColor = theostoneNameColor || this.getJobColor(skill?.job || row?.job);
        const skillStyle = skillColor ? ` style="color:${skillColor}"` : "";
        const iconHtml = `<img class="skillIcon isPlaceholder" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" onerror="window.skillIcons&&window.skillIcons.handleImgError&&window.skillIcons.handleImgError(this)">`;
        return `<div class="hoverDetailsTooltipSkill"><span class="idx">${index + 1}.</span><span class="name">${iconHtml}<span class="skillName"${skillStyle}>${name}</span></span><span class="dmg">${dmg}</span></div>`;
      })
      .join("");

    const tooltipName = String(row?.name || "-").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const tooltipClassIcon = row?.job ? `<img class="hoverDetailsTooltipClassIcon" src="./assets/${row.job}.png" alt="" onerror="this.style.display='none'">` : "";
    this.hoverTooltipEl.innerHTML = `
      <div class="hoverDetailsTooltipHeader">${tooltipClassIcon}${tooltipName}</div>
      <div class="hoverDetailsTooltipStats">
        <span>${this.i18n?.t("header.display.dps", "DPS") ?? "DPS"}: ${dpsText}</span>
        <span>${this.i18n?.t("details.stats.totalDamage", "Total Damage") ?? "Total Damage"}: ${totalDamageText}</span>
      </div>
      <div class="hoverDetailsTooltipSkills">${skillsHtml || `<div class="hoverDetailsTooltipSkill muted">${this.i18n?.t("details.refresh.loading", "Loading...") ?? "Loading..."}</div>`}</div>
    `;
    // Apply cached skill icons to tooltip img elements
    if (window.skillIcons?.applyIconToImage && skills.length) {
      const iconEls = this.hoverTooltipEl.querySelectorAll(".hoverDetailsTooltipSkill .skillIcon");
      iconEls.forEach((img, i) => {
        if (skills[i]) window.skillIcons.applyIconToImage(img, skills[i]);
      });
    }
    const maxLeft = Math.max(372, (this.elList?.clientWidth || 0) - (this.hoverTooltipEl.offsetWidth || 0) - 8);
    const maxTop = Math.max(8, (this.elList?.clientHeight || 0) - (this.hoverTooltipEl.offsetHeight || 0) - 8);
    left = Math.max(372, Math.min(maxLeft, left));
    top = Math.max(0, Math.min(maxTop, top));

    this.hoverTooltipEl.style.left = `${left}px`;
    this.hoverTooltipEl.style.top = `${top}px`;
    this.hoverTooltipEl.classList.add("isVisible");
  }

  applyHoverTooltip(row, { forceRefresh = false } = {}) {
    const rowId = Number(row?.id);
    if (!Number.isFinite(rowId) || rowId <= 0) return;
    const rowEl = this.elList?.querySelector?.(`.item[data-row-id="${rowId}"]`);
    if (!rowEl) return;

    const cached = this.hoverTooltipCacheByRowId.get(rowId);
    if (cached) {
      this.renderHoverTooltip(cached, row, rowEl);
      if (!forceRefresh) return;
    }

    this.renderHoverTooltip({ skills: [] }, row, rowEl);
    if (!forceRefresh && this.hoverTooltipPendingRowIds.has(rowId)) {
      return;
    }
    const requestSeq = (this.hoverTooltipRequestSeqByRowId.get(rowId) || 0) + 1;
    this.hoverTooltipRequestSeqByRowId.set(rowId, requestSeq);
    this.hoverTooltipPendingRowIds.add(rowId);

    this.getDetails(row, { maxSkills: 5, showSkillIcons: false })
      .then((details) => {
        this.hoverTooltipPendingRowIds.delete(rowId);
        const currentSeq = this.hoverTooltipRequestSeqByRowId.get(rowId);
        if (currentSeq !== requestSeq || this.hoveredDetailsRowId !== rowId) return;
        const lightweightDetails = { skills: Array.isArray(details?.skills) ? details.skills.slice(0, 5) : [] };
        this.hoverTooltipCacheByRowId.set(rowId, lightweightDetails);
        this.renderHoverTooltip(lightweightDetails, row, rowEl);
      })
      .catch(() => {
        this.hoverTooltipPendingRowIds.delete(rowId);
        const currentSeq = this.hoverTooltipRequestSeqByRowId.get(rowId);
        if (currentSeq !== requestSeq || this.hoveredDetailsRowId !== rowId) return;
        this.renderHoverTooltip({ skills: [] }, row, rowEl);
      });
  }




  _isAnyPanelOpen() {
    return this.historyUI?.isOpen?.()
      || this.detailsUI?.isOpen?.();
  }

  fetchDps() {
    if (this.isCollapse || this._windowHidden) return;
    if (this.isWindowDragging) {
      this.deferFetchUntilDragEnd = true;
      return;
    }
    if (this.isMeterBarHovered) {
      this.deferFetchUntilHoverEnd = true;
      return;
    }
    const now = this.nowMs();
    // Throttle meter DOM updates while a panel is open (1s instead of 100ms)
    if (this._isAnyPanelOpen()) {
      if (this._lastPanelRenderAt && now - this._lastPanelRenderAt < 1000) return;
      this._lastPanelRenderAt = now;
    } else {
      this._lastPanelRenderAt = 0;
    }
    const raw = window.dpsData?.getDpsData?.();
    // globalThis.uiDebug?.log?.("getBattleDetail", raw);

    // 값이 없으면 타이머 숨김
    if (typeof raw !== "string") {
      this._rawLastChangedAt = now;

      this._lastBattleTimeMs = null;
      this._battleTimeVisible = false;
      this.battleTime.setVisible(false);
      this.updateConnectionStatusUi();
      return;
    }

    if (raw === this.lastJson && !this.refreshPending) {
      // Staleness watchdog: if the backend JSON hasn't changed for 10+ seconds
      // but the backend IS still parsing packets, something may be stuck.
      // Force a re-process to recover from invisible backend exceptions.
      if (!this._rawLastChangedAt) this._rawLastChangedAt = now;
      const staleMs = now - this._rawLastChangedAt;
      if (staleMs > 5_000) {
        const lastParsed = Number(window.javaBridge?.getLastParsedAtMs?.());
        const parsingRecently = Number.isFinite(lastParsed) && lastParsed > 0 && (Date.now() - lastParsed) < 15_000;
        if (parsingRecently) {
          this.logDebug(`Staleness watchdog: data unchanged for ${Math.round(staleMs/1000)}s while backend parsing active — forcing re-render`);
          this.lastJson = null;
          this._rawLastChangedAt = now;
          return;
        }
      }

      const shouldBeVisible = this._battleTimeVisible && !this.isCollapse;

      this.battleTime.setVisible(shouldBeVisible);
      if (shouldBeVisible) {
        this.battleTime.update(now, this._lastBattleTimeMs);
      }

      this.updateConnectionStatusUi();
      return;
    }
    this._rawLastChangedAt = now;

    const previousTargetName = this.lastTargetName;
    const previousTargetMode = this.lastTargetMode;
    const previousTargetId = this.lastTargetId;
    const {
      rows,
      targetName,
      targetMode,
      battleTimeMs,
      targetId,
      localPlayerId,
      targetMaxHp,
      targetTotalDamage,
      targetCurrentHp,
      targetBerserkMs,
      targetPhase,
      targetStagger,
      recordingKind,
      recordingName,
    } = this.buildRowsFromPayload(raw);
    if (this.refreshPending) {
      const pendingAgeMs = Math.max(0, now - (Number(this.refreshPendingStartedAt) || 0));
      const allowFallbackResume = rows.length > 0 && pendingAgeMs >= 1000;

      if (rows.length > 0 && !allowFallbackResume) {
        return;
      }

      this.refreshPending = false;
      this.refreshPendingStartedAt = 0;

      if (rows.length === 0) {
        this.lastJson = raw;
        this.lastSnapshot = [];
        this._lastRenderedListSignature = "";
        this._lastRenderedRowsSummary = null;
        this.meterUI?.onResetMeterUi?.();
        return;
      }
    }

    this.lastJson = raw;
    this.applyLocalPlayerIdUpdate(localPlayerId, "backend local id update");
    this.updateLocalPlayerIdentity(rows);
    const prevBattleTimeMs = this._lastBattleTimeMs;
    this._lastBattleTimeMs = battleTimeMs;
    this.followFightMode(recordingKind, targetMode);
    this.lastTargetMode = targetMode;
    this.lastTargetName = targetName;
    this.lastTargetId = targetId;

    if (
      targetId !== this._lastLoggedTargetId ||
      targetMode !== this._lastLoggedTargetMode ||
      targetName !== this._lastLoggedTargetName
    ) {
      const reasons = [];
      if (targetId !== this._lastLoggedTargetId) reasons.push("targetId changed");
      if (targetMode !== this._lastLoggedTargetMode) reasons.push("mode changed");
      if (targetName !== this._lastLoggedTargetName) reasons.push("name changed");
      console.log("[Target Lock]", {
        targetId,
        targetName,
        targetMode,
        reason: reasons.join(", ") || "initial",
      });
      this._lastLoggedTargetId = targetId;
      this._lastLoggedTargetMode = targetMode;
      this._lastLoggedTargetName = targetName;
    }


    const showByServer = rows.length > 0;
    if (this.resetPending) {
      const resetAck = rows.length === 0;

      this._battleTimeVisible = false;
      this.battleTime.setVisible(false);

      if (!resetAck) {
        return;
      }

      this.resetPending = false;
    }
    const isOutOfCombat = this.isOutOfCombatState();
    // 빈값은 ui 안덮어씀
    let rowsToRender = rows;
    const listReasons = [];
    // Modes are exclusive: a new mode (picked here or in the dashboard) must not
    // keep showing the previous mode's rows. Out of combat the snapshot below is
    // held as is, and the backend re-sends the same JSON until new damage, so a
    // kept snapshot froze the meter on the old mode's rows.
    if (previousTargetMode && targetMode !== previousTargetMode) {
      this.lastSnapshot = rows.length === 0 ? [] : null;
    }
    if (rows.length === 0) {
      if (this.lastSnapshot) rowsToRender = this.lastSnapshot;
      else {
        this._battleTimeVisible = false;
        this.battleTime.setVisible(false);
        return;
      }
    } else if (!isOutOfCombat) {
      this.lastSnapshot = rows;
    } else if (this.lastSnapshot) {
      const updatedSnapshot = this.updateSnapshotIdentity(rows, this.lastSnapshot);
      this.lastSnapshot = updatedSnapshot;
      rowsToRender = updatedSnapshot;
    } else {
      this.lastSnapshot = rows;
      rowsToRender = rows;
      listReasons.push("idle baseline captured");
    }

    // 타이머 표시 여부
    const showByRender = rowsToRender.length > 0;
    const showBattleTime = this.BATTLE_TIME_BASIS === "server" ? showByServer : showByRender;

    let nextBattleTimeMs = battleTimeMs;
    // Hold small backward jitter only. A drop of seconds is a new fight on the same id
    // (PVE is always id 0, a re-pull keeps the boss id): holding it froze the timer, the
    // meter read "ended" and kept the previous boss's rows.
    if (
      Number.isFinite(Number(nextBattleTimeMs)) &&
      Number.isFinite(Number(prevBattleTimeMs)) &&
      targetId === previousTargetId &&
      Number(nextBattleTimeMs) < Number(prevBattleTimeMs)
    ) {
      if (Number(prevBattleTimeMs) - Number(nextBattleTimeMs) < 3000) {
        nextBattleTimeMs = prevBattleTimeMs;
      } else if (rows.length > 0) {
        this.lastSnapshot = rows;
        rowsToRender = rows;
      }
    }

    const eligible = showBattleTime && Number.isFinite(Number(nextBattleTimeMs));

    this._battleTimeVisible = eligible;
    const shouldBeVisible = eligible && !this.isCollapse;

    this.battleTime.setVisible(shouldBeVisible);

    if (shouldBeVisible) {
      this.battleTime.update(now, nextBattleTimeMs);
    }

    this.updateConnectionStatusUi();
    if (targetMode === "trainTargets" && this.isLocalUserIdentified()) {
      rowsToRender = rowsToRender.filter((row) => row.name === this.USER_NAME);
    }
    // render
    const nextTargetLabel = this.getTargetLabel({ targetId, targetName, targetMode });
    if (this.elBossName) {
      if (this.elBossName.textContent !== nextTargetLabel) {
        this.elBossName.textContent = nextTargetLabel;
        this.fitBossName();
      }
      this.elBossName.classList.toggle("isAllTargets", targetMode === "allTargets");
    }
    this.updateBossHpBar(targetMaxHp, targetTotalDamage, targetCurrentHp);
    this.updateRecordingBadge(recordingKind, recordingName);
    if (
      nextTargetLabel !== this._lastRenderedTargetLabel ||
      previousTargetName !== targetName ||
      previousTargetMode !== targetMode
    ) {
      const reasons = [];
      if (previousTargetName !== targetName || previousTargetMode !== targetMode) {
        reasons.push("payload target changed");
      }
      if (!targetName) {
        reasons.push(`default label for mode ${targetMode || "unknown"}`);
      }
      this.logDebug(
        `Target label changed: "${this._lastRenderedTargetLabel}" -> "${nextTargetLabel}" (reason: ${reasons.join(
          "; "
        )}).`
      );
      this._lastRenderedTargetLabel = nextTargetLabel;
    }
    const rowsSummary = this.getRowsSummary(rowsToRender);
    if (rowsSummary.listSignature !== this._lastRenderedListSignature) {
      const changeReasons = this.describeRowsChange(rowsSummary, this._lastRenderedRowsSummary);
      const reasonText = [...changeReasons, ...listReasons].filter(Boolean).join("; ");
      this.logDebug(
        `Meter list changed (${rowsToRender.length} rows). reason: ${
          reasonText || "list membership changed"
        }.`
      );
      this._lastRenderedListSignature = rowsSummary.listSignature;
      this._lastRenderedRowsSummary = rowsSummary;
    }
    this.latestRowsById = new Map(rowsToRender.map((row) => [String(row.id), row]));
    this.hoverTooltipCacheByRowId.clear();
    this.updateMeterTotalBar(rowsToRender);
    this.meterUI.updateFromRows(rowsToRender);
    this.pmWidget?.onFrame({
      rows: rowsToRender,
      targetMode,
      targetId,
      targetMaxHp,
      targetTotalDamage,
      targetCurrentHp,
      targetBerserkMs,
      targetPhase,
      targetStagger,
    });
  }

  buildRowsFromPayload(raw) {
    const payload = this.safeParseJSON(raw, {});
    const targetName = typeof payload?.targetName === "string" ? payload.targetName : "";
    const targetMode = typeof payload?.targetMode === "string" ? payload.targetMode : "";
    const targetIdRaw = payload?.targetId;
    const targetId = Number.isFinite(Number(targetIdRaw)) ? Number(targetIdRaw) : 0;
    const localPlayerIdRaw = payload?.localPlayerId;
    const localPlayerId = Number.isFinite(Number(localPlayerIdRaw))
      ? Number(localPlayerIdRaw)
      : null;

    const mapObj = payload?.map && typeof payload.map === "object" ? payload.map : {};
    const rows = this.buildRowsFromMapObject(mapObj);

    const battleTimeMsRaw = payload?.battleTime;
    const battleTimeMs = Number.isFinite(Number(battleTimeMsRaw)) ? Number(battleTimeMsRaw) : null;

    const targetMaxHp = Number.isFinite(Number(payload?.targetMaxHp)) ? Number(payload.targetMaxHp) : 0;
    const targetTotalDamage = Number.isFinite(Number(payload?.targetTotalDamage))
      ? Number(payload.targetTotalDamage)
      : 0;
    const targetCurrentHp = Number.isFinite(Number(payload?.targetCurrentHp))
      ? Number(payload.targetCurrentHp)
      : -1;

    return {
      rows,
      targetName,
      targetMode,
      battleTimeMs,
      targetId,
      localPlayerId,
      targetMaxHp,
      targetTotalDamage,
      targetCurrentHp,
      // PowerMeter: berserk countdown (ms left) and boss phase for the widget's
      // target header. The engine does not send them yet; absent = hidden.
      targetBerserkMs: payload?.targetBerserkMs ?? null,
      targetPhase: payload?.targetPhase ?? null,
      // Stagger gauge { cur, max, broken } of the current target, null when it has none.
      targetStagger: payload?.targetStagger ?? null,
      recordingKind: typeof payload?.recordingKind === "string" ? payload.recordingKind : "",
      recordingName: typeof payload?.recordingName === "string" ? payload.recordingName : "",
    };
  }

  buildRowsFromMapObject(mapObj) {
    const rows = [];

    for (const [id, value] of Object.entries(mapObj || {})) {
      const numericId = Number(id);
      if (Number.isFinite(numericId) && numericId <= 0) {
        continue;
      }
      const isObj = value && typeof value === "object";

      const job = isObj ? (value.job ?? "") : "";
      const nickname = isObj ? (value.nickname ?? "") : "";
      const idText = String(id);
      // The local player's own row can arrive before the engine has its nickname:
      // we already know who "you" are, so show your name rather than "#id".
      const isMe = numericId > 0 && numericId === Number(this.localPlayerId);
      const isLocalId = isMe && !!this.USER_NAME;
      const hasNickname = (!!nickname && nickname !== idText) || isLocalId;
      const isIdentifying = !hasNickname;
      const name = nickname && nickname !== idText ? nickname : isLocalId ? this.USER_NAME : idText;

      const dpsRaw = isObj ? value.dps : value;
      const dps = Math.trunc(Number(dpsRaw));
      const totalDamage = Math.trunc(Number(isObj ? value.amount : 0));

      // 소수점 한자리
      const contribRaw = isObj ? Number(value.damageContribution) : NaN;
      const damageContribution = Number.isFinite(contribRaw)
        ? Math.round(contribRaw * 10) / 10
        : NaN;

      if (!Number.isFinite(dps)) {
        continue;
      }

      // Combat power comes from the party roster packet, so it only exists for
      // players actually in your party; 0 means "unknown", not "zero CP".
      const combatPower = Math.trunc(Number(isObj ? value.combatPower : 0)) || 0;

      rows.push({
        id: String(id),
        name,
        job,
        dps,
        totalDamage,
        damageContribution,
        combatPower,
        // PowerMeter: the widget's HEAL and AGGRO tabs (getMetricForRow).
        healDone: Number(isObj ? value.healDone : 0) || 0,
        hps: Number(isObj ? value.hps : 0) || 0,
        hitsTaken: Number(isObj ? value.hitsTaken : 0) || 0,
        damageTaken: Number(isObj ? value.damageTaken : 0) || 0,
        // By id too: "Only my DPS" and the highlight must not hang on the typed name.
        isUser: isMe || name === this.USER_NAME,
        isIdentifying,
      });
    }

    return this.dedupeRowsByName(rows);
  }

  dedupeRowsByName(rows) {
    const dedupedByName = new Map();
    for (const row of rows) {
      const key = String(row.name ?? "");
      if (!key) continue;
      const existing = dedupedByName.get(key);
      if (!existing) {
        dedupedByName.set(key, row);
        continue;
      }
      const scoreRow = (candidate) => {
        let score = 0;
        if (candidate.job) score += 2;
        if (!candidate.isIdentifying) score += 1;
        return score;
      };
      const existingScore = scoreRow(existing);
      const nextScore = scoreRow(row);
      if (nextScore > existingScore) {
        dedupedByName.set(key, row);
        continue;
      }
      if (nextScore < existingScore) {
        continue;
      }
      const existingId = Number(existing.id);
      const nextId = Number(row.id);
      if (!Number.isFinite(existingId) || (Number.isFinite(nextId) && nextId > existingId)) {
        dedupedByName.set(key, row);
      }
    }

    return Array.from(dedupedByName.values());
  }

  isOutOfCombatState() {
    const state = this.battleTime?.getState?.();
    return state === "state-idle" || state === "state-ended";
  }

  // Out of combat the meter holds the fight's last rows, but names and classes
  // keep resolving after it (party roster, self record, the local id). Copy who
  // each row is from the latest update onto the held rows, the numbers stay.
  updateSnapshotIdentity(rows, snapshot) {
    if (!Array.isArray(snapshot) || snapshot.length === 0) return snapshot;
    const incomingById = new Map((rows || []).map((row) => [String(row.id), row]));
    const merged = snapshot.map((row) => {
      const incoming = incomingById.get(String(row.id));
      const isLocalId = !!this.USER_NAME && Number(row.id) === Number(this.localPlayerId);
      const named = incoming && !incoming.isIdentifying;
      const name = named ? incoming.name : row.isIdentifying && isLocalId ? this.USER_NAME : row.name;
      const job = incoming?.job || row.job;
      const combatPower = incoming?.combatPower || row.combatPower;
      return {
        ...row,
        name,
        job,
        combatPower,
        isIdentifying: row.isIdentifying && !named && !isLocalId,
        isUser: Number(row.id) === Number(this.localPlayerId) || name === this.USER_NAME,
      };
    });
    return this.dedupeRowsByName(merged);
  }

  getDefaultMeterFillOpacity() {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--meter-fill-opacity")
      .trim();
    const value = Number.parseFloat(raw);
    if (!Number.isFinite(value)) return 100;
    return Math.round(value * 100);
  }

  normalizeMeterOpacity(value, fallback = 100) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(100, Math.max(10, Math.round(numeric)));
  }

  applyMeterFillOpacity(percent) {
    const normalized = this.normalizeMeterOpacity(percent, 100);
    document.documentElement.style.setProperty("--meter-fill-opacity", String(normalized / 100));
  }

  getDefaultBossNameSize() {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--boss-name-size")
      .trim();
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? value : 15;
  }

  normalizeBossNameSize(value, fallback = 15) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(20, Math.max(8, Math.round(numeric * 2) / 2));
  }

  applyBossNameSize(px) {
    const normalized = this.normalizeBossNameSize(px, 15);
    document.documentElement.style.setProperty("--boss-name-size", `${normalized}px`);
    // fitBossName reads the computed size, so re-run it: a bigger size may now
    // overflow and need shrinking, a smaller one may have room to grow back.
    this.fitBossName();
  }

  applyWindowOpacity(percent, { persist } = {}) {
    const value = Number(percent);
    if (!Number.isFinite(value)) return; // an unreadable stored or broadcast value keeps the current one
    const normalized = Math.max(0, Math.min(100, Math.round(value)));
    document.documentElement.style.setProperty("--window-opacity", String(normalized / 100));
    if (persist) {
      this.safeSetSetting(this.storageKeys.windowOpacity, String(normalized));
    }
  }

  triggerDetailsFlash() {
    if (!this.detailsPanel) return;
    this.detailsPanel.classList.remove("flash");
    void this.detailsPanel.offsetWidth;
    this.detailsPanel.classList.add("flash");
    if (this._detailsFlashTimer) window.clearTimeout(this._detailsFlashTimer);
    this._detailsFlashTimer = window.setTimeout(() => {
      this.detailsPanel?.classList.remove("flash");
    }, 1000);
  }

  triggerMeterFlash() {
    const meterEl = document.querySelector(".meter");
    if (!meterEl) return;
    meterEl.classList.remove("flash");
    void meterEl.offsetWidth;
    meterEl.classList.add("flash");
    if (this._meterFlashTimer) window.clearTimeout(this._meterFlashTimer);
    this._meterFlashTimer = window.setTimeout(() => {
      meterEl.classList.remove("flash");
    }, 1000);
  }

  captureMainMeterScreenshot() {
    const meterRect = document.querySelector(".meter")?.getBoundingClientRect?.();
    if (!meterRect) return;
    const scale = window.devicePixelRatio || 1;
    const success = window.javaBridge?.captureScreenshotToClipboard?.(
      meterRect.left,
      meterRect.top,
      meterRect.width,
      meterRect.height,
      scale
    );
    if (success) {
      this.triggerMeterFlash();
    }
  }

  reinitTargetSelection(reason) {
    this.resetTargetTrackingState();
    window.javaBridge?.restartTargetSelection?.();
    this.refreshPending = false;
    this.refreshPendingStartedAt = 0;
    this.resetPending = false;
    this.lastJson = null;
    this.lastSnapshot = null;
    this._lastRenderedListSignature = "";
    this._lastRenderedRowsSummary = null;
    this.setTargetSelection(this.targetSelection, { persist: false, syncBackend: true, reason });
    if (!this.isCollapse) {
      this.fetchDps();
    }
  }

  resetTargetTrackingState() {
    this.lastTargetMode = "";
    this.lastTargetName = "";
    this.lastTargetId = 0;
    this._lastRenderedTargetLabel = "";
    this._lastLoggedTargetId = null;
    this._lastLoggedTargetMode = null;
    this._lastLoggedTargetName = null;
  }

  updateLocalPlayerIdentity(rows = []) {
    if (!Array.isArray(rows) || !rows.length || !this.USER_NAME) {
      return;
    }
    // Stay sticky: if our current local id is still an active row, keep it. The
    // canonical id for the local player can flip between co-existing self-ids as
    // damage accumulates; re-binding on every flip churned the binding needlessly.
    if (this.localPlayerId && rows.some((row) => Number(row?.id) === this.localPlayerId)) {
      return;
    }
    const matched = rows.find((row) => row?.name === this.USER_NAME);
    if (!matched) {
      return;
    }
    const actorId = Number(matched.id);
    this.applyLocalPlayerIdUpdate(actorId, "local id update");
  }

  applyLocalPlayerIdUpdate(actorId, reason) {
    if (!Number.isFinite(actorId) || actorId <= 0) {
      return;
    }
    if (this.localPlayerId === actorId) {
      return;
    }
    this.localPlayerId = actorId;
    window.javaBridge?.bindLocalActorId?.(String(actorId));
    window.javaBridge?.setLocalPlayerId?.(String(actorId));
    // The backend's own pick is a guess it can still correct: binding your name to it
    // permanently made a wrong guess (a summon, a same-class teammate) stick as `#id` on you.
    // The same for a row the backend already named after you.
    if (this.USER_NAME && reason !== "backend local id update" && reason !== "local id update") {
      window.javaBridge?.bindLocalNickname?.(String(actorId), this.USER_NAME);
      this.setUserName(this.USER_NAME, { persist: true, syncBackend: true });
      this.rememberLocalIdForName(this.USER_NAME, actorId);
    }
    this.refreshConnectionInfo();
    // NOTE: do NOT reinitTargetSelection() here. Which entity id is "you" can
    // change several times within one fight (the local player churns entity ids,
    // e.g. after casting Divine Aura), and reinit → restartTargetSelection →
    // reset_combat wipes ALL combat data and every teammate nickname. That fired
    // on every poll, causing the meter to reset over and over (PC lag), teammates
    // to flip to raw ids, and skills like Divine Aura to be dropped. Re-labelling
    // who "you" are is a display concern only — the next dps poll re-renders the
    // highlight from the updated localPlayerId with no reset.
  }

  rememberLocalIdForName(name, actorId) {
    const key = String(name ?? "").trim().toLowerCase();
    if (!key || !Number.isFinite(actorId) || actorId <= 0) return;
    this._recentLocalIdByName.set(key, { actorId, timestamp: Date.now() });
  }

  getRecentLocalIdForName(name) {
    const key = String(name ?? "").trim().toLowerCase();
    if (!key) return null;
    const entry = this._recentLocalIdByName.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > 120000) {
      this._recentLocalIdByName.delete(key);
      return null;
    }
    return entry.actorId;
  }

  getDetailsContext() {
    const raw = window.dpsData?.getDetailsContext?.();
    if (!raw) return null;
    if (typeof raw === "string") {
      return this.safeParseJSON(raw, null);
    }
    return raw;
  }

  async getDetails(
    row,
    { targetId = null, attackerIds = null, totalTargetDamage = null, showSkillIcons = false, maxSkills = null } = {}
  ) {
    let raw = null;
    let backendFiltered = false;
    if (window._historyDetailsOverride) {
      raw = window._historyDetailsOverride;
    } else if (targetId && window.dpsData?.getTargetDetails) {
      const payload = Array.isArray(attackerIds) ? JSON.stringify(attackerIds) : "";
      raw = await window.dpsData.getTargetDetails(targetId, payload);
      backendFiltered = true;
    } else {
      raw = await window.dpsData?.getBattleDetail?.(row.id);
    }
    let detailObj = raw;
    // globalThis.uiDebug?.log?.("getBattleDetail", detailObj);

    if (typeof raw === "string") detailObj = this.safeParseJSON(raw, {});
    if (!detailObj || typeof detailObj !== "object") detailObj = {};

    const skills = [];
    let totalDmg = 0;

    let totalTimes = 0;
    let totalCrit = 0;
    let totalParry = 0;
    let totalBack = 0;
    let totalPerfect = 0;
    let totalDouble = 0;
    let totalMultiHitCount = 0;
    let totalMultiHitDamage = 0;
    let totalMultiHitHits = 0;
    let totalRegen = 0;
    let totalSmite = 0;
    let totalPowershard = 0;

    const pushSkill = ({
      codeKey,
      name,
      time,
      dmg,
      crit = 0,
      parry = 0,
      back = 0,
      frontal = 0,
      perfect = 0,
      double = 0,
      smite = 0,
      powershard = 0,
      regen = 0,
      multiHitCount = 0,
      multiHitDamage = 0,
      multiHitHits = 0,
      minDmg = 0,
      maxDmg = 0,
      countForTotals = true,
      job = "",
      actorId = null,
      isDot = false,
      hitTimestamps = null,
      specs = null,
    }) => {
      const dmgInt = Math.trunc(Number(String(dmg ?? "").replace(/,/g, ""))) || 0;
      if (dmgInt <= 0) {
        return;
      }

      const t = Number(time) || 0;

      totalDmg += dmgInt;
      totalRegen += Number(regen) || 0;
      if (countForTotals) {
        totalTimes += t;
        totalCrit += Number(crit) || 0;
        totalParry += Number(parry) || 0;
        totalBack += Number(back) || 0;
        totalPerfect += Number(perfect) || 0;
        totalDouble += Number(double) || 0;
        totalSmite += Number(smite) || 0;
        totalPowershard += Number(powershard) || 0;
        totalMultiHitCount += Number(multiHitCount) || 0;
        totalMultiHitDamage += Number(multiHitDamage) || 0;
        totalMultiHitHits += Number(multiHitHits) || 0;
      }
      skills.push({
        code: String(codeKey),
        name,
        time: t,
        crit: Number(crit) || 0,
        parry: Number(parry) || 0,
        back: Number(back) || 0,
        frontal: Number(frontal) || 0,
        perfect: Number(perfect) || 0,
        double: Number(double) || 0,
        smite: Number(smite) || 0,
        powershard: Number(powershard) || 0,
        regen: Number(regen) || 0,
        multiHitCount: Number(multiHitCount) || 0,
        multiHitDamage: Number(multiHitDamage) || 0,
        multiHitHits: Number(multiHitHits) || 0,
        minDmg: Number(minDmg) || 0,
        maxDmg: Number(maxDmg) || 0,
        dmg: dmgInt,
        job,
        actorId,
        isDot,
        hitTimestamps: Array.isArray(hitTimestamps) ? hitTimestamps : [],
        specs: Array.isArray(specs) ? specs : null,
      });
    };

    const detailSkills = Array.isArray(detailObj?.skills) ? detailObj.skills : null;
    const attackerIdSet = !backendFiltered && Array.isArray(attackerIds) && attackerIds.length > 0
      ? new Set(attackerIds.map(Number))
      : null;
    if (detailSkills) {
      for (const value of detailSkills) {
        if (!value || typeof value !== "object") continue;
        // Filter by selected player when viewing history (skip when backend already filtered)
        if (attackerIdSet) {
          const skillActorId = Number(value.actorId);
          if (!Number.isFinite(skillActorId) || !attackerIdSet.has(skillActorId)) continue;
        }
        const code = String(value.code ?? "");
        const nameRaw = typeof value.name === "string" ? value.name.trim() : "";
        const translatedName = (this.i18n?.getSkillName?.(code, nameRaw) ?? nameRaw).replace(/^Theostone:/, "Theo:");
        const baseName =
          translatedName ||
          this.i18n?.format?.("skills.fallback", { code }, `Skill ${code}`) ||
          `Skill ${code}`;
        const dotName =
          this.i18n?.format?.("skills.dot", { name: baseName }, `${baseName} - DOT`) ||
          `${baseName} - DOT`;
        const isDot = !!value.isDot;
        const actorId = Number(value.actorId);

        pushSkill({
          codeKey: isDot ? `${code}-dot` : code,
          name: isDot ? dotName : baseName,
          time: value.time,
          dmg: value.dmg,
          crit: value.crit,
          parry: value.parry,
          back: value.back,
          frontal: value.frontal,
          perfect: value.perfect,
          double: value.double,
          smite: value.smite,
          powershard: value.powershard,
          regen: value.regen,
          multiHitCount: value.multiHitCount,
          multiHitDamage: value.multiHitDamage,
          multiHitHits: value.multiHitHits,
          minDmg: value.minDmg,
          maxDmg: value.maxDmg,
          job: value.job ?? "",
          countForTotals: !isDot,
          actorId: Number.isFinite(actorId) ? actorId : null,
          isDot,
          hitTimestamps: Array.isArray(value.hitTimestamps) ? value.hitTimestamps : [],
          specs: Array.isArray(value.specs) ? value.specs : null,
        });
      }
    } else {
      for (const [code, value] of Object.entries(detailObj)) {
        if (!value || typeof value !== "object") continue;

        const nameRaw = typeof value.skillName === "string" ? value.skillName.trim() : "";
        const translatedName = (this.i18n?.getSkillName?.(code, nameRaw) ?? nameRaw).replace(/^Theostone:/, "Theo:");
        const baseName =
          translatedName ||
          this.i18n?.format?.("skills.fallback", { code }, `Skill ${code}`) ||
          `Skill ${code}`;
        const dotName =
          this.i18n?.format?.("skills.dot", { name: baseName }, `${baseName} - DOT`) ||
          `${baseName} - DOT`;

        // 일반 피해
        pushSkill({
          codeKey: code,
          name: baseName,
          time: value.times,
          dmg: value.damageAmount,
          crit: value.critTimes,
          parry: value.parryTimes,
          back: value.backTimes,
          frontal: value.frontalTimes,
          perfect: value.perfectTimes,
          double: value.doubleTimes,
          regen: value.healAmount,
        });

        // 도트피해
        if (Number(String(value.dotDamageAmount ?? "").replace(/,/g, "")) > 0) {
          pushSkill({
            codeKey: `${code}-dot`, // 유니크키
            name: dotName,
            time: value.dotTimes,
            dmg: value.dotDamageAmount,
            countForTotals: false,
          });
        }
      }
    }


    if (Number.isFinite(Number(maxSkills)) && Number(maxSkills) > 0 && skills.length > Number(maxSkills)) {
      skills.sort((a, b) => (Number(b?.dmg) || 0) - (Number(a?.dmg) || 0));
      skills.length = Number(maxSkills);
    }
    const pct = (num, den) => {
      if (den <= 0) return 0;
      return Math.round((num / den) * 1000) / 10;
    };
    const perActorStatsMap = new Map();
    for (const skill of skills) {
      if (!Number.isFinite(Number(skill.actorId))) continue;
      const actorId = Number(skill.actorId);
      const entry =
        perActorStatsMap.get(actorId) || {
          actorId,
          job: skill.job ?? "",
          totalDmg: 0,
          totalTimes: 0,
          totalCrit: 0,
          totalParry: 0,
          totalBack: 0,
          totalPerfect: 0,
          totalDouble: 0,
          totalHits: 0,
          totalSmite: 0,
          totalPowershard: 0,
          totalRegen: 0,
          multiHitCount: 0,
          multiHitDamage: 0,
        };
      entry.totalDmg += Number(skill.dmg) || 0;
      entry.totalRegen += Number(skill.regen) || 0;
      entry.multiHitCount += Number(skill.multiHitCount) || 0;
      entry.multiHitDamage += Number(skill.multiHitDamage) || 0;
      if (!skill.isDot) {
        entry.totalHits += Number(skill.time) || 0;
        entry.totalTimes += Number(skill.time) || 0;
        entry.totalCrit += Number(skill.crit) || 0;
        entry.totalParry += Number(skill.parry) || 0;
        entry.totalBack += Number(skill.back) || 0;
        entry.totalPerfect += Number(skill.perfect) || 0;
        entry.totalDouble += Number(skill.double) || 0;
        entry.totalSmite += Number(skill.smite) || 0;
        entry.totalPowershard += Number(skill.powershard) || 0;
      }
      if (!entry.job && skill.job) {
        entry.job = skill.job;
      }
      perActorStatsMap.set(actorId, entry);
    }
    const fallbackContribution = Number(row?.damageContribution);
    const baseTotalDamage = Number.isFinite(Number(totalTargetDamage))
      ? Number(totalTargetDamage)
      : Number(detailObj?.totalTargetDamage);
    const contributionPct =
      Number.isFinite(baseTotalDamage) && baseTotalDamage > 0
        ? (totalDmg / baseTotalDamage) * 100
        : fallbackContribution;
    const battleTimeMsRaw = Number(detailObj?.battleTime);
    const combatTime = Number.isFinite(battleTimeMsRaw)
      ? this.formatBattleTime(battleTimeMsRaw)
      : this.battleTime?.getCombatTimeText?.() ?? "00:00";

    const perActorStats = [...perActorStatsMap.values()]
      .map((entry) => ({
        actorId: entry.actorId,
        job: entry.job,
        totalDmg: entry.totalDmg,
        totalTimes: entry.totalTimes,
        totalCrit: entry.totalCrit,
        totalParry: entry.totalParry,
        totalBack: entry.totalBack,
        totalPerfect: entry.totalPerfect,
        totalDouble: entry.totalDouble,
        totalSmite: entry.totalSmite,
        totalPowershard: entry.totalPowershard,
        totalHits: entry.totalHits,
        totalRegen: entry.totalRegen,
        multiHitCount: entry.multiHitCount,
        multiHitDamage: entry.multiHitDamage,
        contributionPct:
          Number.isFinite(baseTotalDamage) && baseTotalDamage > 0
            ? (entry.totalDmg / baseTotalDamage) * 100
            : 0,
        totalCritPct: pct(entry.totalCrit, entry.totalTimes),
        totalParryPct: pct(entry.totalParry, entry.totalTimes),
        totalBackPct: pct(entry.totalBack, entry.totalTimes),
        totalPerfectPct: pct(entry.totalPerfect, entry.totalTimes),
        totalDoublePct: pct(entry.totalDouble, entry.totalTimes),
        totalSmitePct: pct(entry.totalSmite, entry.totalTimes),
        totalPowershardPct: pct(entry.totalPowershard, entry.totalTimes),
        combatTime,
      }))
      .sort((a, b) => b.totalDmg - a.totalDmg);

    // Process healing (DMG/HEAL toggle): filter by selected member, resolve skill
    // names, and compute heal-mode stat totals. Mirrors the damage skill pipeline.
    const healSkillsRaw = Array.isArray(detailObj?.healSkills) ? detailObj.healSkills : [];
    const healSkillsOut = [];
    let totalHeal = 0;
    let healTicks = 0;
    let healHotTicks = 0;
    const healActors = new Set();
    for (const v of healSkillsRaw) {
      if (!v || typeof v !== "object") continue;
      const aId = Number(v.actorId);
      if (attackerIdSet && (!Number.isFinite(aId) || !attackerIdSet.has(aId))) continue;
      const code = String(v.code ?? "");
      const nameRaw = typeof v.name === "string" ? v.name.trim() : "";
      const name = (this.i18n?.getSkillName?.(code, nameRaw) ?? nameRaw) || `Skill ${code}`;
      const amt = Number(v.dmg) || 0;
      const ticks = Number(v.time) || 0;
      const isHot = !!v.isDot;
      if (amt <= 0) continue;
      totalHeal += amt;
      healTicks += ticks;
      if (isHot) healHotTicks += ticks;
      if (Number.isFinite(aId)) healActors.add(aId);
      healSkillsOut.push({
        actorId: Number.isFinite(aId) ? aId : null,
        code: Number.isFinite(Number(code)) ? Number(code) : v.code,
        name,
        dmg: amt,
        time: ticks,
        isDot: isHot,
        crit: 0, parry: 0, back: 0, frontal: 0, perfect: 0, double: 0, smite: 0, powershard: 0,
        regen: 0, multiHitCount: 0, multiHitDamage: 0, multiHitHits: 0,
        minDmg: 0, maxDmg: 0, job: v.job ?? "", specs: null, hitTimestamps: [],
      });
    }
    const healBattleMs = Number.isFinite(battleTimeMsRaw) ? battleTimeMsRaw : 0;
    const healPerSecText = healBattleMs > 0
      ? `${this.formatAbbreviatedNumber(totalHeal / healBattleMs * 1000)}`
      : "-";

    return {
      totalDmg,
      totalHeal,
      healTicks,
      healHotTicks,
      healSkillCount: healSkillsOut.length,
      healPerSecText,
      contributionPct,
      totalCritPct: pct(totalCrit, totalTimes),
      totalParryPct: pct(totalParry, totalTimes),
      totalBackPct: pct(totalBack, totalTimes),
      totalPerfectPct: pct(totalPerfect, totalTimes),
      totalDoublePct: pct(totalDouble, totalTimes),
      totalSmitePct: pct(totalSmite, totalTimes),
      totalPowershardPct: pct(totalPowershard, totalTimes),
      totalHits: totalTimes,
      multiHitCount: totalMultiHitCount,
      multiHitDamage: totalMultiHitDamage,
      multiHitPct: totalTimes > 0 ? Math.round((totalMultiHitHits / totalTimes) * 1000) / 10 : 0,
      totalRegen,
      combatTime,
      battleTimeMs: Number.isFinite(battleTimeMsRaw) ? battleTimeMsRaw : 0,
      maxHp: Number(detailObj?.maxHp) || 0,

      skills,
      // Per-actor/skill healing (DMG/HEAL toggle), filtered to the selected member
      // and name-resolved (see processing above).
      healSkills: healSkillsOut,
      showSkillIcons,
      perActorStats,
      showCombinedTotals: !attackerIds || attackerIds.length === 0,
      pingHistory: Array.isArray(detailObj?.pingHistory) ? detailObj.pingHistory : [],
    };
  }

  bindHeaderButtons() {
    this.logoBtn = document.querySelector(".bossIcon");
    this.collapseBtn?.addEventListener("click", () => {
      this.listSortDirection = this.listSortDirection === "asc" ? "desc" : "asc";
      this.renderCurrentRows();

      const iconName =
        this.listSortDirection === "asc" ? "arrow-down-wide-narrow" : "arrow-up-wide-narrow";
      const iconEl =
        this.collapseBtn.querySelector("svg") || this.collapseBtn.querySelector("[data-lucide]");
      if (!iconEl) {
        return;
      }

      iconEl.setAttribute("data-lucide", iconName);
      window.lucide?.createIcons?.({ root: this.collapseBtn });
    });
    this.resetBtn?.addEventListener("click", () => {
      this.refreshDamageData({ reason: "manual refresh" });
    });
    this.suspendBtn?.addEventListener("click", () => {
      this._setCaptureSuspended(!this._captureSuspended);
    });
    // The four exclusive modes (each hit counts in exactly one), picked from a
    // select. The bridge fetches the new mode's snapshot and redraws at once.
    this.targetModeBtn?.addEventListener("change", () => {
      this.setTargetSelection(this.targetModeBtn.value, {
        persist: true,
        syncBackend: true,
        reason: "header select",
      });
    });
    this.onlyMeBtn?.addEventListener("click", () => {
      this.setOnlyShowUser(!this.onlyShowUser, { persist: true });
    });
    this.metricToggleBtn?.addEventListener("click", () => {
      const nextMode = this.displayMode === "totalDamage" ? "dps" : "totalDamage";
      this.setDisplayMode(nextMode, { persist: true });
      this.renderCurrentRows();
    });
    this.logoBtn?.addEventListener("click", () => {
      this.captureMainMeterScreenshot();
    });
    this.logoBtn?.setAttribute("data-no-drag", "true");

    // Click on boss name area → open Details for current mob (all players) or history
    // The target name is a plain label now: no click target and no data-no-drag,
    // so the whole top of the window is grab-and-drag surface. Details is opened
    // from a player row, History from its own header button.

    const historyBtn = document.querySelector(".historyBtn");
    if (historyBtn) {
      // History is part of the Details surface, not the overlay: opening it
      // here would make the 30px-tall meter grow to swallow a fight list. It
      // goes to the Details window, which then swaps between the list and a
      // fight in place. The in-overlay panel remains the fallback for when
      // that window cannot be reached at all.
      const openHistory = () => {
        this.openDetailsSurface({ kind: "history" }, () => this.historyUI?.open?.());
      };
      historyBtn.addEventListener("click", () => {
        if (this.isWindowDragging) return;
        openHistory();
      });
      historyBtn.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openHistory();
        }
      });
      historyBtn.setAttribute("data-no-drag", "true");
    }
  }

  // The widget's settings are edited in the dashboard (Settings > Widget DPS): read
  // them once here; applyRemoteSettingChange() follows every later change.
  applyStoredSettings() {
    let storedMeterOpacity = this.safeGetSetting(this.storageKeys.meterFillOpacity) ||
      this.safeGetStorage(this.storageKeys.meterFillOpacity);
    if (this.safeGetSetting("dpsMeter.migration.opacityReset1") !== "done") {
      storedMeterOpacity = "80";
      this.safeSetSetting(this.storageKeys.meterFillOpacity, "80");
      this.safeSetSetting("dpsMeter.migration.opacityReset1", "done");
    }
    const storedDebugLogging = this.safeGetSetting(this.storageKeys.debugLogging) === "true";
    const storedPinMeToTop = this.safeGetSetting(this.storageKeys.pinMeToTop) === "true";
    const mainPlayerNamesBoldSetting = this.safeGetSetting(this.storageKeys.mainPlayerNamesBold);
    const storedMainPlayerNamesBold = mainPlayerNamesBoldSetting !== "false";
    const mainPlayerDpsBoldSetting = this.safeGetSetting(this.storageKeys.mainPlayerDpsBold);
    const storedMainPlayerDpsBold = mainPlayerDpsBoldSetting !== "false";
    const storedDefaultMeterMode = this.safeGetSetting(this.storageKeys.defaultMeterMode) || "bossTargets";
    const storedLanguage = this.safeGetStorage(this.storageKeys.language);
    const storedTheme = this.safeGetSetting(this.storageKeys.theme);

    this.setUserName(this.safeGetStorage(this.storageKeys.userName) || "", { persist: false, syncBackend: true });
    this.setOnlyShowUser(this.safeGetSetting(this.storageKeys.onlyShowUser) === "1", { persist: false });
    this.setDebugLogging(storedDebugLogging, { syncBackend: true });
    this.setPinMeToTop(storedPinMeToTop);
    this.setSlimMode(this.safeGetSetting(this.storageKeys.slimMode) === "true");
    this.setMainPlayerNamesBold(storedMainPlayerNamesBold);
    this.setMainPlayerDpsBold(storedMainPlayerDpsBold);
    if (mainPlayerNamesBoldSetting === null || mainPlayerNamesBoldSetting === undefined || mainPlayerNamesBoldSetting === "") {
      this.safeSetSetting(this.storageKeys.mainPlayerNamesBold, "true");
    }
    if (mainPlayerDpsBoldSetting === null || mainPlayerDpsBoldSetting === undefined || mainPlayerDpsBoldSetting === "") {
      this.safeSetSetting(this.storageKeys.mainPlayerDpsBold, "true");
    }
    const defaultMode = storedDefaultMeterMode === "trainTargets" ? "pveTargets" : storedDefaultMeterMode;
    this.defaultMeterMode = TARGET_MODES.includes(defaultMode) ? defaultMode : "bossTargets";
    this.setTargetSelection(this.defaultMeterMode, {
      persist: false,
      syncBackend: true,
      reason: "default meter mode setting",
    });
    this.applyTheme(storedTheme || this.theme);
    if (storedLanguage) {
      this.i18n?.setLanguage?.(storedLanguage, { persist: false });
    }

    // Read by the Details defaults for training targets (getDefaultDetailsOpenOptions).
    this.trainSelectionMode =
      this.safeGetSetting(this.storageKeys.trainSelectionMode) === "highestDamage" ? "highestDamage" : "all";

    this._applySuspendBtnVisibility(this.safeGetSetting(this.storageKeys.showSuspendBtn) === "true");
    // Restore suspend state from backend on load
    this._captureSuspended = !!window.javaBridge?.isCaptureSuspended?.();
    this._updateSuspendBtnIcon();
    this._updateSuspendStatusMessage();

    // Packet logging can read on from localStorage while the backend's setting is missing (reinstall,
    // reset settings.json): re-send it so the backend writes what the setting says.
    if (this.safeGetSetting(this.storageKeys.saveRawPackets) === "true") window.javaBridge?.setSaveRawPackets?.(true);
    // Packet and debug logs are for the Debugger and Admin roles only: the backend refuses them to
    // anyone else (the re-sends above included).
    Promise.resolve(window.javaBridge?.mayLog?.()).then((ok) => this.applyLogPermission(!!ok));

    const defaultOpacity = this.getDefaultMeterFillOpacity();
    const hasStoredOpacity =
      storedMeterOpacity !== null &&
      storedMeterOpacity !== undefined &&
      String(storedMeterOpacity).trim() !== "";
    this.applyMeterFillOpacity(
      hasStoredOpacity ? this.normalizeMeterOpacity(storedMeterOpacity, defaultOpacity) : defaultOpacity
    );

    const defaultBossNameSize = this.getDefaultBossNameSize();
    const storedBossNameSize = this.safeGetSetting(this.storageKeys.bossNameSize);
    this.applyBossNameSize(
      storedBossNameSize !== null && String(storedBossNameSize).trim() !== ""
        ? this.normalizeBossNameSize(storedBossNameSize, defaultBossNameSize)
        : defaultBossNameSize
    );

    // settings.json first, as for every other option: the dashboard writes it there.
    const storedWindowOpacity = this.safeGetSetting(this.storageKeys.windowOpacity);
    // 60: PowerMeter, the design's standard widget opacity.
    this.applyWindowOpacity(String(storedWindowOpacity ?? "").trim() !== "" ? storedWindowOpacity : 60);

    // Mirror each Details slider's position into a CSS custom property so the
    // track can paint a filled portion. Presentation only — no setting reads it.
    const syncRangeFill = (input) => {
      const min = Number(input.min);
      const max = Number(input.max);
      const value = Number(input.value);
      if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(value) || max <= min) {
        return;
      }
      const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
      input.style.setProperty("--range-pct", `${pct}%`);
    };
    if (this.detailsPanel) {
      this.detailsPanel.querySelectorAll('input[type="range"]').forEach(syncRangeFill);
      this.detailsPanel.addEventListener("input", (event) => {
        if (event.target?.tagName === "INPUT" && event.target.type === "range") syncRangeFill(event.target);
      });
    }

    // Re-open the Details window if it was left enabled last session.
    const detailsMonitor = this.getDetailsMonitorSetting();
    if (detailsMonitor !== "off" && window.A2_VIEW !== "details") {
      this.applyDetailsMonitor(detailsMonitor);
    }

    // PowerMeter: the widget's settings live in the dashboard (Settings > Widget DPS).
    document.querySelector(".settingsBtn")?.addEventListener("click", () => {
      window.javaBridge?.openWidgetSettings?.();
    });
  }

  setupDetailsPanelSettings() {
    this.detailsOpacityInput = document.querySelector(".detailsOpacityInput");
    this.detailsOpacityValue = document.querySelector(".detailsOpacityValue");
    this.detailsFontSizeInput = document.querySelector(".detailsFontSizeInput");
    this.detailsFontSizeValue = document.querySelector(".detailsFontSizeValue");
    this.detailsIconSizeInput = document.querySelector(".detailsIconSizeInput");
    this.detailsIconSizeValue = document.querySelector(".detailsIconSizeValue");
    this.detailsSettingsBtn = document.querySelector(".detailsSettingsBtn");
    this.detailsSettingsMenu = document.querySelector(".detailsSettingsMenu");
    this.detailsIncludeMeterCheckbox = document.querySelector(".detailsIncludeMeterCheckbox");
    this.detailsSaveScreenshotCheckbox = document.querySelector(".detailsSaveScreenshotCheckbox");
    this.detailsScreenshotFolderRow = document.querySelector(".detailsSettingsFolder");
    this.detailsScreenshotFolderPath = document.querySelector(".detailsSettingsFolderPath");
    this.detailsScreenshotFolderBtn = document.querySelector(".detailsSettingsFolderBtn");
    this.detailsColumnToggles = document.querySelectorAll(".detailsColumnToggle");

    const storedOpacity = this.safeGetSetting(this.storageKeys.detailsBackgroundOpacity);
    const initialOpacity = this.parseDetailsOpacity(storedOpacity);
    this.setDetailsBackgroundOpacity(initialOpacity, { persist: false });

    const storedFontSize = this.safeGetSetting(this.storageKeys.detailsFontSize);
    const initialFontSize = this.parseDetailsFontSize(storedFontSize);
    this.setDetailsFontSize(initialFontSize, { persist: false });

    const storedIconSize = this.safeGetSetting(this.storageKeys.detailsIconSize);
    const initialIconSize = this.parseDetailsIconSize(storedIconSize);
    this.setDetailsIconSize(initialIconSize, { persist: false });

    const storedIncludeMeter =
      this.safeGetSetting(this.storageKeys.detailsIncludeMeterScreenshot) === "true";
    const storedSaveToFolder =
      this.safeGetSetting(this.storageKeys.detailsSaveScreenshotToFolder) === "true";
    const storedFolder = this.safeGetSetting(this.storageKeys.detailsScreenshotFolder);
    this.includeMainMeterScreenshot = storedIncludeMeter;
    this.saveScreenshotToFolder = storedSaveToFolder;
    this.screenshotFolder = storedFolder || this.getDefaultScreenshotFolder();

    if (this.detailsIncludeMeterCheckbox) {
      this.detailsIncludeMeterCheckbox.checked = this.includeMainMeterScreenshot;
      this.detailsIncludeMeterCheckbox.addEventListener("change", (event) => {
        this.includeMainMeterScreenshot = !!event.target?.checked;
        this.safeSetSetting(
          this.storageKeys.detailsIncludeMeterScreenshot,
          String(this.includeMainMeterScreenshot)
        );
      });
    }
    if (this.detailsSaveScreenshotCheckbox) {
      this.detailsSaveScreenshotCheckbox.checked = this.saveScreenshotToFolder;
      this.detailsSaveScreenshotCheckbox.addEventListener("change", (event) => {
        this.saveScreenshotToFolder = !!event.target?.checked;
        if (this.saveScreenshotToFolder && !this.screenshotFolder) {
          this.screenshotFolder = this.getDefaultScreenshotFolder();
        }
        this.safeSetSetting(
          this.storageKeys.detailsSaveScreenshotToFolder,
          String(this.saveScreenshotToFolder)
        );
        if (this.screenshotFolder) {
          this.safeSetSetting(this.storageKeys.detailsScreenshotFolder, this.screenshotFolder);
        }
        this.updateScreenshotFolderDisplay();
      });
    }
    if (this.detailsScreenshotFolderBtn) {
      this.detailsScreenshotFolderBtn.addEventListener("click", () => {
        const selected = window.javaBridge?.chooseScreenshotFolder?.(this.screenshotFolder);
        if (!selected || typeof selected !== "string") return;
        this.screenshotFolder = selected;
        this.safeSetSetting(this.storageKeys.detailsScreenshotFolder, this.screenshotFolder);
        this.updateScreenshotFolderDisplay();
      });
    }
    this.updateScreenshotFolderDisplay();

    const storedHiddenColumns = this.safeGetSetting(this.storageKeys.detailsHiddenColumns);
    const storedSeenColumns = this.safeGetSetting(this.storageKeys.detailsSeenColumns);
    const hiddenColumns = new Set();
    // Columns added in v2.0.4 — default hidden for both new and upgrading users
    const NEW_COLUMNS_DEFAULT_HIDDEN = ["powershard", "regen"];
    if (typeof storedHiddenColumns === "string" && storedHiddenColumns.trim()) {
      const parsedHidden = this.safeParseJSON(storedHiddenColumns, []);
      if (Array.isArray(parsedHidden)) {
        parsedHidden.forEach((column) => {
          if (typeof column === "string" && column.trim()) {
            hiddenColumns.add(column);
          }
        });
      }
    }
    // Track which columns the user has seen in their settings UI. Any column
    // not yet seen defaults to hidden, regardless of upgrade state.
    const seenColumns = new Set();
    if (typeof storedSeenColumns === "string" && storedSeenColumns.trim()) {
      const parsedSeen = this.safeParseJSON(storedSeenColumns, []);
      if (Array.isArray(parsedSeen)) {
        parsedSeen.forEach((c) => { if (typeof c === "string") seenColumns.add(c); });
      }
    }
    NEW_COLUMNS_DEFAULT_HIDDEN.forEach((col) => {
      if (!seenColumns.has(col)) hiddenColumns.add(col);
    });
    const applyDetailsColumnVisibility = () => {
      if (!this.detailsPanel) return;
      const columns = ["hit", "dmg", "dmgpct", "mhit", "mdmg", "crit", "parry", "perfect", "double", "back", "powershard", "regen", "mindmg", "avgdmg", "maxdmg"];
      columns.forEach((column) => {
        this.detailsPanel.classList.toggle(`hide-col-${column}`, hiddenColumns.has(column));
      });
      this.detailsUI?.updateGridColumns?.();
    };
    if (this.detailsColumnToggles && this.detailsColumnToggles.length) {
      this.detailsColumnToggles.forEach((toggle) => {
        const column = toggle.dataset.column;
        if (!column) return;
        toggle.checked = !hiddenColumns.has(column);
        toggle.addEventListener("change", (event) => {
          const isVisible = !!event.target?.checked;
          if (isVisible) {
            hiddenColumns.delete(column);
          } else {
            hiddenColumns.add(column);
          }
          // Mark as seen so the default-hidden behaviour doesn't override the user's choice
          seenColumns.add(column);
          this.safeSetSetting(this.storageKeys.detailsHiddenColumns, JSON.stringify([...hiddenColumns]));
          this.safeSetSetting(this.storageKeys.detailsSeenColumns, JSON.stringify([...seenColumns]));
          applyDetailsColumnVisibility();
        });
      });
    }
    applyDetailsColumnVisibility();

    if (this.detailsOpacityInput) {
      this.detailsOpacityInput.value = String(Math.round(initialOpacity * 100));
      const stopDrag = (event) => event.stopPropagation();
      this.detailsOpacityInput.addEventListener("mousedown", stopDrag);
      this.detailsOpacityInput.addEventListener("touchstart", stopDrag, { passive: true });
      this.detailsOpacityInput.addEventListener("input", (event) => {
        const nextValue = Number(event.target?.value);
        const nextOpacity = Number.isFinite(nextValue) ? nextValue / 100 : 1;
        this.setDetailsBackgroundOpacity(nextOpacity, { persist: true });
      });
    }

    if (this.detailsFontSizeInput) {
      this.detailsFontSizeInput.value = String(Math.round(initialFontSize));
      const stopDrag = (event) => event.stopPropagation();
      this.detailsFontSizeInput.addEventListener("mousedown", stopDrag);
      this.detailsFontSizeInput.addEventListener("touchstart", stopDrag, { passive: true });
      this.detailsFontSizeInput.addEventListener("input", (event) => {
        const nextValue = Number(event.target?.value);
        if (!Number.isFinite(nextValue)) return;
        this.setDetailsFontSize(nextValue, { persist: true });
      });
    }

    if (this.detailsIconSizeInput) {
      this.detailsIconSizeInput.value = String(Math.round(initialIconSize));
      const stopDrag = (event) => event.stopPropagation();
      this.detailsIconSizeInput.addEventListener("mousedown", stopDrag);
      this.detailsIconSizeInput.addEventListener("touchstart", stopDrag, { passive: true });
      this.detailsIconSizeInput.addEventListener("input", (event) => {
        const nextValue = Number(event.target?.value);
        if (!Number.isFinite(nextValue)) return;
        this.setDetailsIconSize(nextValue, { persist: true });
      });
    }

    this.detailsSettingsBtn?.addEventListener("click", (event) => {
      event.stopPropagation();
      this.toggleDetailsSettingsMenu(event);
    });

    this.detailsSettingsMenu?.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    this.detailsClose?.addEventListener("click", () => {
      this.closeDetailsSettingsMenu();
    });

    document.addEventListener("click", (event) => {
      if (!this.detailsSettingsMenu?.classList.contains("isOpen")) {
        return;
      }
      const target = event.target;
      if (
        this.detailsSettingsMenu?.contains(target) ||
        this.detailsSettingsBtn?.contains(target)
      ) {
        return;
      }
      this.closeDetailsSettingsMenu();
    });
  }

  setupConsoleDebugging() {
    if (this._consoleDebuggingEnabled) {
      return;
    }
    this._consoleDebuggingEnabled = true;

    window.addEventListener("error", (event) => {
      console.error("[UI Error]", event.error || event.message, event);
    });

    window.addEventListener("unhandledrejection", (event) => {
      console.error("[UI Promise Rejection]", event.reason || event);
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!target || typeof target.closest !== "function") return;
      const menuTarget =
        target.closest("[role='menu']") ||
        target.closest(".detailsSettingsMenu") ||
        target.closest(".detailsDropdownMenu");
      if (!menuTarget) return;
      const menuClass = menuTarget.className || menuTarget.getAttribute?.("role") || "menu";
      const targetLabel =
        target.getAttribute?.("aria-label") ||
        target.getAttribute?.("data-i18n") ||
        target.textContent?.trim() ||
        target.tagName;
      console.log("[UI Menu Click]", { menu: menuClass, target: targetLabel });
    });
  }

  parseDetailsOpacity(value) {
    if (value === null || value === undefined || value === "") {
      return 0.8;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 0.8;
    }
    return Math.min(1, Math.max(0, parsed));
  }

  getDefaultDetailsFontSize() {
    const rootSize = getComputedStyle(document.documentElement).getPropertyValue("--font");
    const parsed = Number.parseFloat(rootSize);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
    return 16;
  }

  parseDetailsFontSize(value) {
    if (value === null || value === undefined || value === "") {
      return this.getDefaultDetailsFontSize();
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return this.getDefaultDetailsFontSize();
    }
    return Math.min(this.DETAILS_FONT_SIZE_MAX, Math.max(this.DETAILS_FONT_SIZE_MIN, parsed));
  }


  parseDetailsIconSize(value) {
    if (value === null || value === undefined || value === "") {
      return 36;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 36;
    }
    return Math.min(this.DETAILS_ICON_SIZE_MAX, Math.max(this.DETAILS_ICON_SIZE_MIN, parsed));
  }

  setDetailsBackgroundOpacity(opacity, { persist = false } = {}) {
    const clamped = Math.min(1, Math.max(0, opacity));
    if (this.detailsPanel) {
      this.detailsPanel.style.setProperty("--details-bg-opacity", clamped);
    }
    if (this.detailsOpacityValue) {
      this.detailsOpacityValue.textContent = `${Math.round(clamped * 100)}%`;
    }
    if (this.detailsOpacityInput && document.activeElement !== this.detailsOpacityInput) {
      this.detailsOpacityInput.value = String(Math.round(clamped * 100));
    }
    if (persist) {
      this.safeSetSetting(this.storageKeys.detailsBackgroundOpacity, String(clamped));
    }
  }

  setDetailsFontSize(size, { persist = false } = {}) {
    const clamped = Math.min(this.DETAILS_FONT_SIZE_MAX, Math.max(this.DETAILS_FONT_SIZE_MIN, size));
    if (this.detailsPanel) {
      this.detailsPanel.style.setProperty("--details-font-size", `${clamped}px`);
    }
    if (this.detailsFontSizeValue) {
      this.detailsFontSizeValue.textContent = `${Math.round(clamped)}px`;
    }
    if (this.detailsFontSizeInput && document.activeElement !== this.detailsFontSizeInput) {
      this.detailsFontSizeInput.value = String(Math.round(clamped));
    }
    if (persist) {
      this.safeSetSetting(this.storageKeys.detailsFontSize, String(clamped));
    }
  }


  setDetailsIconSize(size, { persist = false } = {}) {
    const clamped = Math.min(this.DETAILS_ICON_SIZE_MAX, Math.max(this.DETAILS_ICON_SIZE_MIN, size));
    if (this.detailsPanel) {
      this.detailsPanel.style.setProperty("--details-skill-icon-size", `${clamped}px`);
    }
    const tooltipSize = Math.round(Math.min(28, Math.max(16, clamped * 0.56)));
    document.documentElement.style.setProperty("--tooltip-skill-icon-size", `${tooltipSize}px`);
    if (this.detailsIconSizeValue) {
      this.detailsIconSizeValue.textContent = `${Math.round(clamped)}px`;
    }
    if (this.detailsIconSizeInput && document.activeElement !== this.detailsIconSizeInput) {
      this.detailsIconSizeInput.value = String(Math.round(clamped));
    }
    if (persist) {
      this.safeSetSetting(this.storageKeys.detailsIconSize, String(clamped));
    }
  }

  getDefaultScreenshotFolder() {
    return (
      window.javaBridge?.getDefaultScreenshotFolder?.() ||
      this.safeGetSetting(this.storageKeys.detailsScreenshotFolder) ||
      ""
    );
  }

  updateScreenshotFolderDisplay() {
    if (!this.detailsScreenshotFolderRow) return;
    this.detailsScreenshotFolderRow.classList.toggle("isHidden", !this.saveScreenshotToFolder);
    if (this.detailsScreenshotFolderPath) {
      this.detailsScreenshotFolderPath.textContent = this.screenshotFolder || "-";
    }
  }

  buildScreenshotFilename() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
      now.getHours()
    )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return `AION2_DPS_${stamp}.png`;
  }

  toggleDetailsSettingsMenu(event) {
    if (!this.detailsSettingsMenu) return;
    if (this.detailsSettingsMenu.classList.contains("isOpen")) {
      this.closeDetailsSettingsMenu();
      return;
    }
    this.openDetailsSettingsMenu(event);
  }

  openDetailsSettingsMenu(event) {
    if (!this.detailsSettingsMenu) return;
    this.detailsSettingsMenu.classList.add("isOpen");
  }

  closeDetailsSettingsMenu() {
    if (!this.detailsSettingsMenu) return;
    this.detailsSettingsMenu.classList.remove("isOpen");
  }

  setUserName(name, { persist = false, syncBackend = false } = {}) {
    const previousName = this.USER_NAME;
    const trimmed = String(name ?? "").trim();
    this.USER_NAME = trimmed;
    if (persist) {
      localStorage.setItem(this.storageKeys.userName, trimmed);
    }
    if (syncBackend) {
      window.javaBridge?.setCharacterName?.(trimmed);
    }
    if (previousName && previousName !== trimmed) {
      const cachedId = this.getRecentLocalIdForName(trimmed);
      if (cachedId) {
        this.refreshDamageData({ reason: "local name update" });
        this.applyLocalPlayerIdUpdate(cachedId, "local name update cached id");
        return;
      }
      this.localPlayerId = null;
      this.refreshDamageData({ reason: "local name update" });
      this.reinitTargetSelection("local name update");
    }
    if (!this.isCollapse) {
      this.fetchDps();
    }
  }

  // "Only my DPS": the list keeps just your row (meter.js getOnlyUser); its % stays
  // your share of the whole party's damage and the party total stays the real one.
  setOnlyShowUser(enabled, { persist = false } = {}) {
    this.onlyShowUser = !!enabled;
    this.onlyMeBtn?.setAttribute("aria-pressed", String(this.onlyShowUser));
    this.onlyMeBtn?.classList.toggle("isActive", this.onlyShowUser);
    if (persist) {
      this.safeSetSetting(this.storageKeys.onlyShowUser, this.onlyShowUser ? "1" : "");
    }
    this.renderCurrentRows();
  }

  applyLogPermission(allowed) {
    if (!allowed) this.setDebugLogging(false);
  }

  setDebugLogging(enabled, { syncBackend = false } = {}) {
    this.debugLoggingEnabled = !!enabled;
    if (syncBackend) {
      window.javaBridge?.setDebugLoggingEnabled?.(this.debugLoggingEnabled);
    }
  }

  setPinMeToTop(enabled) {
    this.pinMeToTop = !!enabled;
    this.renderCurrentRows();
  }

  // The "details" window runs this same bundle. Rather than a second app, it
  // reuses the panel that already exists in index.html: the overlay chrome is
  // hidden by CSS and the panel is held open on the whole fight.
  /** "off" or a monitor index as a string. */
  getDetailsMonitorSetting() {
    const raw = this.safeGetSetting(this.storageKeys.detailsMonitor);
    if (raw === null || raw === undefined || String(raw).trim() === "") return "off";
    return String(raw);
  }

  /**
   * Re-open the Details window on the saved monitor (the dashboard opens and
   * closes it when the setting changes). Best-effort: if that display has been
   * unplugged since it was saved, leave the window closed rather than stranded
   * off-screen.
   */
  async applyDetailsMonitor(value) {
    const index = Number(value);
    const monitors = await window.javaBridge?.listMonitors?.();
    if (!Number.isFinite(index) || !Array.isArray(monitors) || !monitors.some((m) => Number(m.index) === index)) {
      await window.javaBridge?.closeDetailsWindow?.();
      return;
    }
    try {
      await window.javaBridge?.openDetailsWindow?.(index);
    } catch (err) {
      console.error("[A2Tools] openDetailsWindow failed", err);
    }
  }

  /**
   * Hand a Details view to the standalone Details window.
   *
   * Every route into Details from the overlay — a meter row, a fight picked in
   * History — goes through here, so there is exactly one Details surface and
   * the overlay never grows to contain the panel. The backend creates the
   * window if it is not up yet and places it where the user last left it.
   *
   * `fallback` is the old in-overlay behaviour, run when the window cannot be
   * reached at all (bridge without the command, window build failed). Showing
   * the panel in the overlay beats showing nothing.
   */
  openDetailsSurface(request, fallback) {
    const runFallback = () => {
      try { fallback?.(); } catch (err) { console.error("[A2Tools] details fallback failed", err); }
    };
    // A Details window is already the destination, so it renders in place
    // rather than asking for yet another window. The overlay and the History
    // window are both senders: History in particular must route, or picking a
    // fight would replace the list instead of opening beside it.
    if (window.A2_VIEW === "details") {
      runFallback();
      return;
    }
    const send = window.javaBridge?.requestDetailsView;
    if (typeof send !== "function") {
      runFallback();
      return;
    }
    let result;
    try {
      result = send.call(window.javaBridge, request);
    } catch (err) {
      console.error("[A2Tools] requestDetailsView failed", err);
      runFallback();
      return;
    }
    Promise.resolve(result).catch((err) => {
      console.error("[A2Tools] requestDetailsView failed", err);
      runFallback();
    });
  }

  // The Battle History window: this bundle again, showing only the history
  // panel. It is a browser the user leaves open — picking a fight opens that
  // fight in a window of its own and the list stays exactly as it was, so
  // several fights can be read side by side.
  enterHistoryWindowMode() {
    document.body.classList.add("isHistoryWindow");
    const openList = () => this.historyUI?.open?.();
    openList();
    // open() reads a cache that an async prefetch fills, and this window is
    // created precisely in order to show the list — so it renders before its
    // own prefetch lands and would otherwise sit empty forever. Re-render once
    // the data is genuinely there. Safe to re-open blindly: this resolves in
    // the first moments of the window, before anyone can scroll or filter.
    Promise.resolve(window.javaBridge?.refreshFightHistory?.())
      .then(() => openList())
      .catch(() => {});

    // Frameless, so the panel's own × closes the window rather than just
    // hiding the list — there is nothing behind it here.
    document.querySelector(".historyClose")?.addEventListener("click", (event) => {
      event.stopPropagation();
      window.javaBridge?.closeToolWindow?.();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") window.javaBridge?.closeToolWindow?.();
    });

    // Nothing sits behind the list, so if something closes it, put it back.
    if (this._historyWindowTimer) clearInterval(this._historyWindowTimer);
    this._historyWindowTimer = setInterval(() => {
      if (!this.historyUI?.isOpen?.()) openList();
    }, 1000);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.javaBridge?.toolWindowReady?.("history"));
    });
  }

  enterDetailsWindowMode() {
    document.body.classList.add("isDetailsWindow");
    // Two kinds of window run this mode: the single live "details" window, which
    // is the one the monitor setting governs, and a "details-<fightId>" window
    // showing one saved fight, of which there can be several.
    const label = window.__TAURI__?.window?.getCurrentWindow?.()?.label || "details";
    const isFightWindow = label.startsWith("details-");
    if (isFightWindow) document.body.classList.add("isFightWindow");

    // Frameless window, so the panel header supplies the close control.
    document.querySelector(".detailsWindowClose")?.addEventListener("click", () => {
      if (isFightWindow) {
        // One of several, and nothing to do with the monitor setting.
        window.javaBridge?.closeToolWindow?.();
        return;
      }
      // Closing the live window also turns the setting off, otherwise it would
      // reopen on next launch.
      this.safeSetSetting(this.storageKeys.detailsMonitor, "off");
      window.javaBridge?.closeDetailsWindow?.();
    });
    const openAll = () => {
      this.detailsUI?.open?.(null, { defaultTargetAll: true, pin: true, force: true });
    };
    // Confirm on the screen itself which monitor this is. Backed by the
    // placement the backend actually performed, not by what was requested.
    window.__TAURI__?.event?.listen?.("details-placed", (event) => {
      const badge = document.querySelector(".detailsMonitorBadge");
      if (!badge) return;
      const p = event?.payload || {};
      const numEl = badge.querySelector(".detailsMonitorBadgeNum");
      const textEl = badge.querySelector(".detailsMonitorBadgeText");
      if (numEl) numEl.textContent = String(p.number ?? "");
      if (textEl) {
        const label = this.i18n?.t?.("settings.detailsMonitor.badge", "Monitor") ?? "Monitor";
        const primary = p.isPrimary
          ? ` · ${this.i18n?.t?.("settings.detailsMonitor.primary", "primary") ?? "primary"}`
          : "";
        textEl.textContent = `${label} ${p.number ?? ""} · ${p.width}×${p.height}${primary}`;
      }
      badge.classList.remove("isVisible");
      void badge.offsetWidth; // restart the fade if it fires twice
      badge.classList.add("isVisible");
    });

    // Views routed here from the overlay (a meter row, a fight from History).
    // The request arrives two ways and only one of them can be relied on: a
    // window that was created to serve the request has no listener attached
    // when it is emitted, so it pulls the parked request on startup instead.
    // The seq stamp makes applying it twice a no-op.
    this._lastDetailsRequestSeq = 0;
    this._detailsRequestsInFlight = 0;
    const applyRequest = async (payload) => {
      if (!payload || typeof payload !== "object") return;
      const seq = Number(payload.seq) || 0;
      if (seq && seq <= this._lastDetailsRequestSeq) return;
      this._lastDetailsRequestSeq = seq;
      // Hold off the keep-open watchdog: a fight has to be loaded from disk
      // before the panel opens, and the panel is closed until it lands.
      this._detailsRequestsInFlight += 1;
      try {
        if (payload.kind === "fight") {
          const raw = await window.javaBridge?.getFightDetails?.(String(payload.fightId || ""));
          const record = typeof raw === "string" ? this.safeParseJSON(raw, null) : raw;
          if (!record) {
            openAll();
            return;
          }
          this.detailsUI?.resetDetailsMode?.();
          await this.detailsUI?.openHistoryFight?.(record);
          return;
        }
        const row = payload.row && typeof payload.row === "object" ? payload.row : null;
        await this.detailsUI?.open?.(row, {
          force: true,
          pin: true,
          defaultTargetAll: !!payload.defaultTargetAll,
          defaultTargetId: payload.defaultTargetId ?? null,
        });
      } catch (err) {
        console.error("[A2Tools] details request failed", err);
      } finally {
        this._detailsRequestsInFlight = Math.max(0, this._detailsRequestsInFlight - 1);
      }
    };
    const listening = window.__TAURI__?.event?.listen?.(
      "details-request",
      (event) => { void applyRequest(event?.payload); }
    );

    // A fight window has a saved fight waiting for it, so showing live combat
    // first would only flash the wrong content. The fight branch of
    // applyRequest falls back to openAll() if the record cannot be loaded, so
    // this cannot strand the window empty.
    if (!isFightWindow) openAll();
    // Tell the backend to reveal the window now that the panel has painted.
    // Sequenced after the listener so a request emitted meanwhile is not lost.
    Promise.resolve(listening)
      .catch(() => {})
      .then(() => window.javaBridge?.takePendingDetailsRequest?.())
      .then((pending) => (pending ? applyRequest(pending) : undefined))
      .catch(() => {})
      .then(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => window.javaBridge?.detailsWindowReady?.());
        });
      });
    // The panel can be closed from inside (back button, escape). In this window
    // there is nothing behind it, so re-assert rather than leave a blank screen.
    // History counts as content: it is the other panel that legitimately fills
    // this window, and reopening Details over it would fight the back button.
    // Only the live window: openAll() shows current combat, which in a window
    // opened to display one saved fight would quietly replace that fight.
    if (!isFightWindow) {
      if (this._detailsWindowTimer) clearInterval(this._detailsWindowTimer);
      this._detailsWindowTimer = setInterval(() => {
        if (this._detailsRequestsInFlight > 0) return;
        if (!this.detailsPanel?.classList?.contains("open")) openAll();
      }, 1000);
    }
  }

  // Re-run the latest engine update now (identity merge included) instead of
  // waiting for the next one: out of combat the backend re-sends the same JSON,
  // which fetchDps skips, so a layout switch would otherwise keep stale rows.
  redrawFromLatest() {
    this.lastJson = null;
    this.fetchDps();
  }

  setSlimMode(enabled) {
    this.slimMode = !!enabled;
    document.querySelector(".meter")?.classList.toggle("slim", this.slimMode);
    // Compact keeps the target selector and Reset in its footer (pmWidget.js).
    this.pmWidget?.syncTheme();
    // Compact hides the boss row, so the name is fitted again on the way back.
    this.fitBossName();
  }

  setMainPlayerNamesBold(enabled) {
    this.mainPlayerNamesBold = !!enabled;
    document.body?.classList.toggle("mainPlayerNamesBold", this.mainPlayerNamesBold);
  }

  setMainPlayerDpsBold(enabled) {
    this.mainPlayerDpsBold = !!enabled;
    document.body?.classList.toggle("mainPlayerDpsBold", this.mainPlayerDpsBold);
  }

  // The meter follows the fight on its own: a boss → BOSS, players → PVP, anything
  // else (mobs, training dummies) → PVE. It acts only when the activity changes, so a
  // mode picked by hand stays until the next one. BOSS holds for 30 s after the last
  // boss hit, so adds and a quick mob after the kill don't throw the boss view away.
  // The Trainer's dummy-only mode is left alone: the Trainer puts the old one back.
  followFightMode(kind, backendMode) {
    if (backendMode === "dummyTargets") return;
    const now = Date.now();
    if (kind === "boss") this._lastBossHitAt = now;
    let want = { boss: "bossTargets", pvp: "pvpTargets", pve: "pveTargets" }[kind];
    if (want === "pveTargets" && now - (this._lastBossHitAt || 0) < 30000) want = "bossTargets";
    if (!want || want === this._followedMode) return;
    this._followedMode = want;
    if (want !== this.targetSelection) {
      this.setTargetSelection(want, { syncBackend: true, reason: `auto: ${kind} hit` });
    }
  }

  setTargetSelection(mode, { persist = false, syncBackend = false, reason = "update" } = {}) {
    const previousSelection = this.targetSelection;
    if (mode === "trainTargets") mode = "pveTargets"; // training dummies are PVE since 0.4.4
    this.targetSelection = TARGET_MODES.includes(mode) ? mode : "lastHitByMe";
    if (persist) {
      this.safeSetStorage(this.storageKeys.targetSelection, String(this.targetSelection));
    }
    if (syncBackend) {
      window.javaBridge?.setTargetSelection?.(this.targetSelection);
    }
    if (previousSelection !== this.targetSelection) {
      this.logDebug(
        `Target selection changed: "${previousSelection}" -> "${this.targetSelection}" (reason: ${reason}).`
      );
      this._lastTargetSelection = this.targetSelection;
    }
    this.updateTargetModeButton();
  }

  applyTheme(themeId) {
    const normalized = this.availableThemes.includes(themeId) ? themeId : this.availableThemes[0];
    this.theme = normalized;
    document.documentElement.dataset.theme = normalized;
    this.pmWidget?.syncTheme();
  }

  setDisplayMode(mode, { persist = false } = {}) {
    this.displayMode = mode === "totalDamage" ? "totalDamage" : "dps";
    if (persist) {
      this.safeSetStorage(this.storageKeys.displayMode, this.displayMode);
    }
    this.updateDisplayToggleLabel();
  }

  updateDisplayToggleLabel() {
    if (!this.metricToggleBtn) return;
    const label =
      this.displayMode === "totalDamage"
        ? this.i18n?.t("header.display.total", "DMG") ?? "DMG"
        : this.i18n?.t("header.display.dps", "DPS") ?? "DPS";
    const ariaLabel =
      this.displayMode === "totalDamage"
        ? this.i18n?.t("header.display.ariaDamage", "Showing total damage")
        : this.i18n?.t("header.display.ariaDps", "Showing DPS");
    this.metricToggleBtn.textContent = label;
    this.metricToggleBtn.setAttribute("aria-label", ariaLabel);
  }

  // Boss remaining-HP bar. There is no live boss current-HP packet, so remaining
  // is derived from spawn-time max HP minus the damage the meter has tracked
  // against this target. Hidden unless a single boss target with known max HP.
  updateBossHpBar(maxHp, totalDamage, currentHp) {
    if (!this.elBossHpBar) return;
    const max = Number(maxHp) || 0;
    if (max <= 0) {
      if (this.elBossHpBar.style.display !== "none") {
        this.elBossHpBar.style.display = "none";
      }
      return;
    }
    // Prefer the real current-HP feed when we have one (>= 0); otherwise fall back
    // to deriving remaining = max - tracked damage.
    const live = Number(currentHp);
    const remaining =
      Number.isFinite(live) && live >= 0
        ? Math.min(max, Math.max(0, live))
        : Math.max(0, max - Math.max(0, Number(totalDamage) || 0));
    const pct = Math.max(0, Math.min(100, (remaining / max) * 100));
    if (this.elBossHpBar.style.display === "none") {
      this.elBossHpBar.style.display = "";
    }
    if (this.elBossHpFill) {
      this.elBossHpFill.style.width = `${pct.toFixed(1)}%`;
    }
    // Color shifts as the boss is whittled down.
    this.elBossHpBar.classList.toggle("isMid", pct > 25 && pct <= 50);
    this.elBossHpBar.classList.toggle("isLow", pct <= 25);
    if (this.elBossHpText) {
      // Split to the two ends of the band: the percentage rides the fill,
      // the absolute HP sits on the track. A single centred label was
      // getting sliced in half by the fill's leading edge at mid HP.
      const pctEl = this.elBossHpText.querySelector(".bossHpPct");
      const amtEl = this.elBossHpText.querySelector(".bossHpAmt");
      if (pctEl && amtEl) {
        // PowerMeter: one decimal in the UI language ("62,0%"), as in the design.
        pctEl.textContent = `${pct.toLocaleString(this.i18n?.getLanguage?.() || "en", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })}%`;
        amtEl.textContent = `${this.formatAbbreviatedNumber(remaining)} / ${this.formatAbbreviatedNumber(max)}`;
      } else {
        this.elBossHpText.textContent = `${this.formatAbbreviatedNumber(remaining)} · ${Math.round(pct)}%`;
      }
    }
  }

  formatAbbreviatedNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "-";
    const abs = Math.abs(n);
    const units = [
      { value: 1e12, suffix: "t" },
      { value: 1e9, suffix: "b" },
      { value: 1e6, suffix: "m" },
      { value: 1e3, suffix: "k" },
    ];
    for (const unit of units) {
      if (abs >= unit.value) {
        const scaled = (n / unit.value).toFixed(2);
        const trimmed = scaled.replace(/\.?0+$/, "");
        return `${trimmed}${unit.suffix}`;
      }
    }
    return this.dpsFormatter.format(n);
  }

  // DPS to the nearest thousand: 1,012,326 reads as "1,012k", 554,874 as "555k".
  // Same rule as the combat power beside the name, so the two numbers on a row
  // are at the same precision. Below 500 the abbreviation would collapse to
  // "0k", so show the raw figure there instead. Turned off by the "Round DPS"
  // setting, which falls back to the exact figure.
  formatDpsThousands(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "-";
    if (!this.roundDps) return this.dpsFormatter.format(Math.round(n));
    const thousands = Math.round(n / 1000);
    return thousands > 0
      ? `${this.dpsFormatter.format(thousands)}k`
      : this.dpsFormatter.format(Math.round(n));
  }

  refreshDamageData({ reason = "refresh" } = {}) {
    this.refreshPending = true;
    this.refreshPendingStartedAt = this.nowMs();
    this.lastSnapshot = null;
    this.lastJson = null;
    this.lastTargetMode = "";
    this.lastTargetName = "";
    this.lastTargetId = 0;
    this._lastRenderedListSignature = "";
    this._lastRenderedTargetLabel = "";
    this._lastRenderedRowsSummary = null;
    this.pinnedDetailsRowId = null;
    this.hoveredDetailsRowId = null;
    this.setWindowDragFreeze(false);
    this.setMeterHoverFreeze(false);
    this.detailsUI?.close?.({ keepPinned: false });
    this.lastSnapshot = [];
    this._lastRenderedRowsSummary = null;
    this._lastRenderedListSignature = "";
    this.meterUI?.onResetMeterUi?.();
    this.renderCurrentRows();

    if (this.elBossName) {
      this.elBossName.textContent = this.getDefaultTargetLabel(this.targetSelection);
    }

    const lastParsedAtMs = Number(window.javaBridge?.getLastParsedAtMs?.());
    if (Number.isFinite(lastParsedAtMs) && lastParsedAtMs > 0) {
      const idleMs = Date.now() - lastParsedAtMs;
      if (idleMs > 30_000) {
        window.javaBridge?.resetAutoDetection?.();
      }
    }

    window.javaBridge?.resetDps?.();
    window.javaBridge?.restartTargetSelection?.();
    this.logDebug(`Damage data refreshed (${reason}).`);
  }

  // Settings are edited in the dashboard, so this window has to be told when one
  // changes or it keeps rendering with the value it read at startup. Only the
  // options that change what the meter draws are here; nothing is written back
  // (the backend already stored the value), so a change never echoes.
  applyRemoteSettingChange(key, value) {
    const keys = this.storageKeys;
    const on = value !== "false";
    switch (key) {
      case keys.slimMode:
        this.setSlimMode(value === "true");
        return this.redrawFromLatest();
      case keys.onlyShowUser:
        return this.setOnlyShowUser(value === "1");
      case keys.theme:
        return this.applyTheme(value);
      case keys.playerLimit: {
        const limit = parseInt(value, 10);
        if (!(limit >= 1) || limit === this.playerLimit) return;
        this.playerLimit = limit;
        return this.renderCurrentRows();
      }
      case keys.defaultMeterMode: {
        const mode = value === "trainTargets" ? "pveTargets" : value;
        if (!TARGET_MODES.includes(mode) || mode === this.defaultMeterMode) return;
        this.defaultMeterMode = mode;
        // As a pick in the widget: the meter switches to it now. One window tells the backend.
        return this.setTargetSelection(mode, { syncBackend: window.A2_VIEW === "main", reason: "default meter mode changed" });
      }
      case keys.roundDps:
        this.roundDps = on;
        return this.renderCurrentRows();
      case keys.showTotalDps:
        this.showTotalDps = on;
        return this.renderCurrentRows();
      case keys.pinMeToTop:
        return this.setPinMeToTop(on);
      case keys.mainPlayerNamesBold:
        return this.setMainPlayerNamesBold(on);
      case keys.mainPlayerDpsBold:
        return this.setMainPlayerDpsBold(on);
      case keys.showPing:
        this.showPing = on;
        return this.updatePing();
      case keys.bossNameSize:
        return this.applyBossNameSize(value);
      case keys.windowOpacity:
        return this.applyWindowOpacity(value);
      case keys.meterFillOpacity:
        return this.applyMeterFillOpacity(value);
      case keys.showSuspendBtn:
        this._applySuspendBtnVisibility(on);
        // Hiding the button also resumes a suspended capture.
        if (!on) this._setCaptureSuspended(false);
        return;
    }
  }

  getMetricForRow(row) {
    // PowerMeter: the widget's HEAL tab reads healing done (HPS, total healed) and
    // AGGRO the mobs' hits on the player (hits, total damage taken: the order); `total` also
    // drives the share column and bar (meter.js).
    const stat = this.pmWidget?.isActive() ? this.pmWidget.getStat() : "dps";
    if (stat === "heal") {
      const hps = Number(row?.hps) || 0;
      return { value: hps, text: this.formatDpsThousands(hps), total: Number(row?.healDone) || 0 };
    }
    if (stat === "aggro") {
      const taken = Number(row?.damageTaken) || 0;
      return { value: taken, text: this.dpsFormatter.format(Number(row?.hitsTaken) || 0), total: taken };
    }
    // PowerMeter: the widget shows DPS and total damage side by side and has no
    // DPS/DMG toggle, so the metric column always reads DPS, as a bare number (no "/s").
    const dps = Number(row?.dps) || 0;
    return {
      value: dps,
      text: `${this.formatDpsThousands(dps)}`,
    };
  }


  updateMeterTotalBar(rows) {
    if (!this.meterTotalBar) return;
    if (!this.showTotalDps || !Array.isArray(rows) || rows.length <= 1) {
      this.meterTotalBar.style.display = "none";
      return;
    }
    const totalDmg = rows.reduce((sum, r) => sum + (Number(r?.totalDamage) || 0), 0);
    const totalDps = rows.reduce((sum, r) => sum + (Number(r?.dps) || 0), 0);
    this.meterTotalBar.style.display = "";
    if (this.meterTotalDpsEl) {
      // Matches the per-row readout directly above it; a full-precision total
      // over abbreviated rows reads as two different units.
      this.meterTotalDpsEl.textContent = `${this.formatDpsThousands(totalDps)}`;
    }
    if (this.meterTotalDmgEl) {
      this.meterTotalDmgEl.textContent = this.formatAbbreviatedNumber(totalDmg);
    }
  }

  renderCurrentRows() {
    if (this.isCollapse) return;
    let rowsToRender = Array.isArray(this.lastSnapshot) ? this.lastSnapshot : [];
    if (this.lastTargetMode === "trainTargets" && this.isLocalUserIdentified()) {
      rowsToRender = rowsToRender.filter((row) => row.name === this.USER_NAME);
    }
    const rowsSummary = this.getRowsSummary(rowsToRender);
    if (rowsSummary.listSignature !== this._lastRenderedListSignature) {
      const reasons = this.describeRowsChange(rowsSummary, this._lastRenderedRowsSummary);
      if (!Array.isArray(this.lastSnapshot) || this.lastSnapshot.length === 0) {
        reasons.push("no snapshot available");
      } else {
        reasons.push("renderCurrentRows refresh");
      }
      this.logDebug(
        `Meter list changed (${rowsToRender.length} rows). reason: ${
          reasons.join("; ") || "list membership changed"
        }.`
      );
      this._lastRenderedListSignature = rowsSummary.listSignature;
      this._lastRenderedRowsSummary = rowsSummary;
    }
    this.updateMeterTotalBar(rowsToRender);
    this.meterUI?.updateFromRows?.(rowsToRender);
  }

  getDefaultDetailsOpenOptions() {
    const numericLastTargetId = Number(this.lastTargetId);
    const hasConcreteTarget = Number.isFinite(numericLastTargetId) && numericLastTargetId > 0;
    const fallbackAllTargets =
      this.lastTargetMode === "lastHitByMe" &&
      !hasConcreteTarget &&
      !this.lastTargetName;
    const isTrainTargets = this.lastTargetMode === "trainTargets";
    const shouldDefaultAllTrainTargets = isTrainTargets && this.trainSelectionMode === "all";
    const shouldDefaultTrainTarget = isTrainTargets && this.trainSelectionMode === "highestDamage";
    const defaultTargetId = shouldDefaultTrainTarget
      ? (hasConcreteTarget ? numericLastTargetId : null)
      : hasConcreteTarget
        ? numericLastTargetId
        : null;
    return {
      defaultTargetAll: fallbackAllTargets || shouldDefaultAllTrainTargets || (!hasConcreteTarget && this.lastTargetMode === "allTargets"),
      defaultTargetId,
    };
  }

  // Capture state for the widget's status line and its connection diagnosis
  // (pmWidget.js): game window found, port locked, capture error, who "you" are.
  refreshConnectionInfo() {
    const raw = window.javaBridge?.getConnectionInfo?.();
    if (typeof raw !== "string") {
      this.isDetectingPort = this.aionRunning;
      this.updateConnectionStatusUi();
      return;
    }
    const info = this.safeParseJSON(raw, {});
    this.captureDevices = Array.isArray(info?.devices) ? info.devices : []; // PowerMeter: widget connection diagnosis

    const pcapErr = typeof info?.pcapError === "string" ? info.pcapError.trim() : "";
    this.pcapError = pcapErr; // PowerMeter: read by the widget's capture-error state
    if (pcapErr) {
      this.updateConnectionStatusUi();
      return;
    }

    const hasPort = info?.port != null && Number.isFinite(Number(info.port)); // unlocked = port null, and Number(null) is 0
    this.isDetectingPort = this.aionRunning && !hasPort;
    const localPlayerId = Number(info?.localPlayerId);
    this.localPlayerId = Number.isFinite(localPlayerId) && localPlayerId > 0
      ? Math.trunc(localPlayerId)
      : null;
    // The backend's name is authoritative once the game has said who you are
    // playing (self record): follow it, without echoing it back (no syncBackend).
    const backendName = String(info?.characterName || "").trim();
    if (backendName && backendName !== this.USER_NAME) {
      this.setUserName(backendName, { persist: true });
    }
    // Do NOT reinitTargetSelection() when the backend-reported local id changes:
    // the local player churns entity ids mid-fight, and reinit → reset_combat
    // wipes all combat data and every teammate nickname. The "you" highlight
    // follows this.localPlayerId on the next dps render with no reset.
    this.updateConnectionStatusUi();
  }

  fitBossName() {
    const el = this.elBossName;
    if (!el) return;
    const container = el.parentElement;
    if (!container) return;
    // The stylesheet owns the boss-name size; this only ever shrinks a long
    // name to fit. It used to start from a hard-coded 18px (16 slim) and write
    // that as an inline style, which silently overrode whatever the CSS asked
    // for — so the header label ignored the design's type scale entirely.
    el.style.fontSize = "";
    const base = Number.parseFloat(getComputedStyle(el).fontSize);
    if (!Number.isFinite(base) || base <= 0) return;
    if (el.scrollWidth <= container.clientWidth) return;
    const minFs = Math.max(7, base * 0.72);
    for (let fs = base - 0.5; fs >= minFs; fs -= 0.5) {
      el.style.fontSize = `${fs}px`;
      if (el.scrollWidth <= container.clientWidth) return;
    }
  }

  updatePing(pushedMs) {
    const ms = typeof pushedMs === "number" ? pushedMs : window.javaBridge?.getPingMs?.();
    const known = this.showPing && typeof ms === "number" && ms >= 0;
    // PowerMeter: the signal at the head of the bar (index.html .pmSignal).
    if (this.signalEl) {
      this.signalEl.dataset.level = known ? (ms < 100 ? "good" : ms < 200 ? "warn" : "bad") : "";
      this.signalEl.setAttribute("aria-label", known ? `Ping ${ms} ms` : "Ping");
      this.signalEl.querySelector(".pmSignalMs").textContent = known ? String(ms) : ""; // the bars say it's the ping; the label says ms
    }
    if (!this.pingEl) return;
    if (!known) {
      this.pingEl.classList.remove("isVisible");
      return;
    }
    const textEl = this.pingEl.querySelector(".pingText");
    if (textEl) textEl.textContent = `${ms} ms`;
    else this.pingEl.textContent = `${ms} ms`;
    this.pingEl.classList.add("isVisible");
    this.pingEl.classList.remove("ping-good", "ping-warn", "ping-high", "ping-bad");
    this.pingEl.classList.add(
      ms < 100 ? "ping-good" : ms < 200 ? "ping-warn" : ms < 225 ? "ping-high" : "ping-bad"
    );
  }

  updateConnectionStatusUi() {
    if (!this.battleTimeRoot || !this.analysisStatusEl) return;
    if (!this.aionRunning) {
      this.applyConnectionStatusOverride(
        this.i18n?.t("battleTime.notRunning", "AION2 not running") ?? "AION2 not running"
      );
      return;
    }
    if (this.isDetectingPort) {
      this.applyConnectionStatusOverride(
        this.i18n?.t("connection.detecting", "Detecting AION2 connection...") ??
          "Detecting AION2 connection..."
      );
      return;
    }
    this.clearConnectionStatusOverride();
  }

  applyConnectionStatusOverride(text) {
    this._connectionStatusOverride = true;
    this.battleTimeRoot.classList.add("isVisible", "state-idle");
    this.analysisStatusEl.textContent = text;
    this.analysisStatusEl.style.display = "";
  }

  clearConnectionStatusOverride() {
    if (!this._connectionStatusOverride) return;
    this._connectionStatusOverride = false;
    this.battleTimeRoot.classList.remove("state-idle");
    if (!this._battleTimeVisible) {
      this.battleTimeRoot.classList.remove("isVisible");
    }
    if (this._captureSuspended) {
      this.analysisStatusEl.textContent =
        this.i18n?.t?.("battleTime.suspended", "App suspended") ?? "App suspended";
    } else {
      this.analysisStatusEl.textContent =
        this.i18n?.t("battleTime.analysing", "Ready - monitoring combat...") ??
        "Ready - monitoring combat...";
    }
    this.analysisStatusEl.style.removeProperty("display");
  }

  getRowsSummary(rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const ids = safeRows.map((row) => String(row?.id ?? "")).sort();
    const names = safeRows.map((row) => String(row?.name ?? "")).sort();
    return {
      count: safeRows.length,
      ids,
      names,
      listSignature: ids.join("|"),
    };
  }

  describeRowsChange(nextSummary, previousSummary) {
    const reasons = [];
    if (!previousSummary) {
      reasons.push("initial meter render");
      return reasons;
    }
    if (previousSummary.count !== nextSummary.count) {
      reasons.push(`row count ${previousSummary.count} -> ${nextSummary.count}`);
    }
    const idsChanged =
      previousSummary.ids.length !== nextSummary.ids.length ||
      previousSummary.ids.some((id, index) => id !== nextSummary.ids[index]);
    if (idsChanged) {
      reasons.push("row ids changed");
    }
    const namesChanged =
      previousSummary.names.length !== nextSummary.names.length ||
      previousSummary.names.some((name, index) => name !== nextSummary.names[index]);
    if (namesChanged && !idsChanged) {
      reasons.push("row names changed");
    }
    return reasons;
  }

  logDebug(message) {
    if (!message) return;
    try {
      window.javaBridge?.logDebug?.(String(message));
    } catch (e) {
      globalThis.uiDebug?.log?.("logDebug blocked", { message: String(message), error: String(e) });
    }
  }

  isLocalUserIdentified() {
    const name = String(this.USER_NAME ?? "").trim();
    const localId = Number(this.localPlayerId);
    return Boolean(name) && Number.isFinite(localId) && localId > 0;
  }

  getDefaultTargetLabel(targetMode = "") {
    if (targetMode === "bossTargets") {
      return this.i18n?.t("target.boss", "Boss Targets") ?? "Boss Targets";
    }
    if (targetMode === "allTargets") {
      return this.i18n?.t("target.all", "All Targets") ?? "All Targets";
    }
    if (targetMode === "trainTargets") {
      if (!this.isLocalUserIdentified()) {
        return this.i18n?.t("target.identifying", "Identifying you...") ?? "Identifying you...";
      }
      return this.i18n?.t("target.train", "Training Scarecrow") ?? "Training Scarecrow";
    }
    if (targetMode === "pveTargets") {
      return this.i18n?.t("target.pve", "All mobs (PVE)") ?? "All mobs (PVE)";
    }
    if (targetMode === "pvpTargets") {
      return this.i18n?.t("target.pvp", "Players (PvP)") ?? "Players (PvP)";
    }
    return this.i18n?.t("header.title", "PowerMeter") ?? "PowerMeter";
  }

  getTargetLabel({ targetId = 0, targetName = "", targetMode = "" } = {}) {
    if (targetMode === "trainTargets" && !this.isLocalUserIdentified()) {
      return this.i18n?.t("target.identifying", "Identifying you...") ?? "Identifying you...";
    }
    if (["allTargets", "trainTargets", "pveTargets", "pvpTargets"].includes(targetMode)) {
      return this.getDefaultTargetLabel(targetMode);
    }
    if (targetMode === "bossTargets" && (!Number(targetId) || Number(targetId) <= 0) && !targetName) {
      return this.getDefaultTargetLabel(targetMode);
    }
    if (targetMode === "lastHitByMe" && (!Number(targetId) || Number(targetId) <= 0) && !targetName) {
      // Only prompt to identify when we genuinely don't know who the player is.
      // Once identified, an empty target (idle / just after a reset or zone change)
      // should fall back to the neutral mode label, not keep showing "Identifying...".
      if (!this.isLocalUserIdentified()) {
        return this.i18n?.t("target.identifying", "Identifying you...") ?? "Identifying you...";
      }
      return this.getDefaultTargetLabel(targetMode);
    }
    const numericTargetId = Number(targetId);
    const cleanTargetName = typeof targetName === "string" ? targetName.trim() : "";
    if (Number.isFinite(numericTargetId) && numericTargetId > 0) {
      const localizedName = this.i18n?.getNpcName?.(numericTargetId, cleanTargetName) ?? cleanTargetName;
      return localizedName || `Mob #${numericTargetId}`;
    }
    if (cleanTargetName) {
      return cleanTargetName;
    }
    return this.getDefaultTargetLabel(targetMode);
  }

  // What the engine is counting right now (the last target hit, any mode), so a
  // widget-only user sees e.g. "PVE Wolf" while the Boss tab is on screen.
  updateRecordingBadge(kind, name) {
    const badge = document.querySelector(".recBadge");
    if (!badge) return;
    badge.hidden = !kind;
    if (!kind) return;
    const kindEl = badge.querySelector(".recKind");
    const nameEl = badge.querySelector(".recName");
    const kindText = kind === "pvp" ? "PVP" : kind.toUpperCase();
    if (kindEl.textContent !== kindText) kindEl.textContent = kindText;
    badge.dataset.kind = kind;
    if (nameEl.textContent !== name) nameEl.textContent = name;
    badge.title = `${this.i18n?.t("target.recording", "Recording") ?? "Recording"}: ${kindText}${name ? ` · ${name}` : ""}`;
  }

  updateTargetModeButton() {
    if (!this.targetModeBtn) return;
    const mode = this.targetSelection;
    this.targetModeBtn.classList.toggle("isAllTargets", mode === "allTargets");
    this.targetModeBtn.classList.toggle("isTrainTargets", mode === "trainTargets");
    this.targetModeBtn.value = mode;
  }

  refreshBossLabel() {
    if (!this.elBossName) return;
    if (this.lastTargetName || this.lastTargetId) {
      return;
    }
    this.elBossName.textContent = this.getTargetLabel({
      targetMode: this.lastTargetMode,
      targetId: this.lastTargetId,
      targetName: this.lastTargetName,
    });
    this.elBossName.classList.toggle("isAllTargets", this.lastTargetMode === "allTargets");
  }

  bindDragToMoveWindow() {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialStageX = 0;
    let initialStageY = 0;
    let pendingStageX = 0;
    let pendingStageY = 0;
    let lastMovedX = Number.NaN;
    let lastMovedY = Number.NaN;
    let dragRafId = null;
    let hasDragMoved = false;

    const flushMove = (force = false) => {
      dragRafId = null;
      if ((!isDragging && !force) || !window.javaBridge) return;
      const deltaSinceLastX = Math.abs(pendingStageX - lastMovedX);
      const deltaSinceLastY = Math.abs(pendingStageY - lastMovedY);
      if (!force && Number.isFinite(deltaSinceLastX) && Number.isFinite(deltaSinceLastY)) {
        if (deltaSinceLastX < 2 && deltaSinceLastY < 2) return;
      }
      if (pendingStageX === lastMovedX && pendingStageY === lastMovedY) return;
      window.javaBridge.moveWindow(pendingStageX, pendingStageY);
      lastMovedX = pendingStageX;
      lastMovedY = pendingStageY;
    };

    document.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      const targetEl = e.target?.nodeType === Node.TEXT_NODE ? e.target.parentElement : e.target;
      if (targetEl?.closest?.(".resizeHandle")) {
        return;
      }
      if (targetEl?.closest?.(".headerBtn, .footerBtn, .bossIcon")) {
        return;
      }
      if (targetEl?.closest?.(".historyPanel, .detailsBody, .detailsSettingsMenu")) {
        return;
      }
      if (targetEl?.closest?.("button, input, select, textarea, a, [data-no-drag]")) {
        return;
      }
      isDragging = true;
      hasDragMoved = false;
      this.isWindowDragging = true;
      this.deferFetchUntilDragEnd = true;
      // Don't freeze pointer events yet — defer until the 3px drag threshold
      // is crossed so that simple clicks on meter bars still fire normally.
      startX = e.screenX;
      startY = e.screenY;
      initialStageX = window.screenX;
      initialStageY = window.screenY;
      pendingStageX = initialStageX;
      pendingStageY = initialStageY;
      lastMovedX = Number.NaN;
      lastMovedY = Number.NaN;
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging || !window.javaBridge) return;

      const deltaX = e.screenX - startX;
      const deltaY = e.screenY - startY;
      if (!hasDragMoved && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
        hasDragMoved = true;
        this.setWindowDragFreeze(true);
        this.elList?.classList?.add?.("dragInteracting");
        // Hide heavy panels during drag to reduce per-frame repaint cost;
        // place a lightweight ghost outline so the user sees where they are.
        for (const sel of [".detailsPanel", ".historyPanel"]) {
          const el = document.querySelector(sel);
          if (el && el.offsetParent !== null) {
            const r = el.getBoundingClientRect();
            const ghost = document.createElement("div");
            ghost.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;`
              + "background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.12);border-radius:8px;pointer-events:none;z-index:9999;";
            document.body.appendChild(ghost);
            el.style.visibility = "hidden";
            el._dragHidden = true;
            el._dragGhost = ghost;
          }
        }
      }
      pendingStageX = initialStageX + deltaX;
      pendingStageY = initialStageY + deltaY;

      if (dragRafId !== null) return;
      dragRafId = requestAnimationFrame(flushMove);
    });

    document.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      this.isWindowDragging = false;
      this.setWindowDragFreeze(false);
      if (hasDragMoved) {
        this.elList?.classList?.remove?.("dragInteracting");
        this.suppressRowInteractionUntilMs = this.nowMs() + 120;
        // Restore panels hidden during drag
        for (const sel of [".detailsPanel", ".historyPanel"]) {
          const el = document.querySelector(sel);
          if (el?._dragHidden) {
              el.style.visibility = "";
              el._dragGhost?.remove();
              delete el._dragHidden;
              delete el._dragGhost;
            }
        }
      }
      if (dragRafId !== null) {
        cancelAnimationFrame(dragRafId);
        dragRafId = null;
      }
      flushMove(true);
      if (this.deferFetchUntilDragEnd) {
        this.deferFetchUntilDragEnd = false;
        this.fetchDps();
      }
    });
  }

  bindResizeHandle() {
    this.resizeHandle = document.querySelector(".resizeHandle");
    this.meterEl = document.querySelector(".meter");
    if (!this.resizeHandle || !this.meterEl) return;

    let isResizing = false;
    let axes = "xy";
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;
    let startScale = 1;
    // PowerMeter: dragging the width scales the whole widget (CSS zoom: text, rows,
    // icons grow with the frame) instead of stretching an empty frame around content
    // of fixed size. The width itself stays the layout's own (Interface / Compact);
    // dragging the height adds room for rows. Both kept as { scale, h } (h in screen px).
    const MIN_SCALE = 0.6;
    const MAX_SCALE = 2.5;
    const minHeight = 160;
    const SIZE_KEY = "pm.meterSize";
    const scaleOf = () => parseFloat(this.meterEl.style.zoom) || 1;
    const applySize = (scale, h) => {
      this.meterEl.style.zoom = String(scale);
      if (h > 0) this.meterEl.style.minHeight = `${h / scale}px`;
    };

    // The size the user left the meter at (older saves had a width: start from scale 1).
    try {
      const saved = JSON.parse(this.safeGetStorage(SIZE_KEY) || "null");
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(saved?.scale) || 1));
      applySize(scale, Math.min(Math.max(minHeight, Number(saved?.h) || 0), screen.availHeight));
    } catch {
      // unreadable: keep the default size
    }

    // Height is dragged as min-height: the meter can still grow for new rows, and a
    // fixed height would lose to the CSS min-height (420px) and never shrink.
    const onMove = (event) => {
      if (!isResizing) return;
      let scale = scaleOf();
      if (axes.includes("x")) {
        const visualWidth = startWidth + (event.clientX - startX);
        scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, (startScale * visualWidth) / startWidth));
      }
      const h = axes.includes("y") ? Math.max(minHeight, startHeight + (event.clientY - startY)) : 0;
      applySize(scale, h);
    };

    const onEnd = () => {
      if (!isResizing) return;
      isResizing = false;
      const scale = scaleOf();
      const h = (parseFloat(this.meterEl.style.minHeight) || 0) * scale;
      this.safeSetStorage(SIZE_KEY, JSON.stringify({ scale: Math.round(scale * 1000) / 1000, h: Math.round(h) }));
    };

    // PowerMeter: the design's frame has several grips (8.1). Each one says which
    // axes it drags in data-resize; the window grows right and down only, so the
    // grips on the left/top edges resize the axis they can.
    // Pointer capture keeps the drag (and its release) even when the cursor leaves the window.
    document.querySelectorAll(".meter .resizeHandle").forEach((handle) => {
      handle.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        handle.setPointerCapture(event.pointerId);
        const rect = this.meterEl.getBoundingClientRect();
        axes = handle.dataset.resize || "xy";
        startWidth = rect.width;
        startHeight = rect.height;
        startScale = scaleOf();
        startX = event.clientX;
        startY = event.clientY;
        isResizing = true;
      });
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onEnd);
      handle.addEventListener("lostpointercapture", onEnd);
    });
  }

  _applySuspendBtnVisibility(show) {
    if (this.suspendBtn) {
      this.suspendBtn.style.display = show ? "" : "none";
    }
    if (this.headerBtns) {
      this.headerBtns.classList.toggle("hasSuspendBtn", !!show);
    }
  }

  _setCaptureSuspended(suspended) {
    this._captureSuspended = !!suspended;
    window.javaBridge?.suspendCapture?.(this._captureSuspended);
    this._updateSuspendBtnIcon();
    this._updateSuspendStatusMessage();
  }

  // PowerMeter: the header icons are inline Phosphor SVGs, so the suspended
  // state is shown by colour (.isSuspended) and announced via aria-pressed
  // instead of swapping the glyph.
  _updateSuspendBtnIcon() {
    if (!this.suspendBtn) return;
    this.suspendBtn.classList.toggle("isSuspended", !!this._captureSuspended);
    this.suspendBtn.setAttribute("aria-pressed", String(!!this._captureSuspended));
  }

  _updateSuspendStatusMessage() {
    const el = this.analysisStatusEl || document.querySelector(".battleTime .analysisStatus");
    if (!el) return;
    if (this._captureSuspended) {
      el.textContent = this.i18n?.t?.("battleTime.suspended", "App suspended") ?? "App suspended";
      el.style.display = "";
      // Ensure the battle time bar is visible so the message shows
      if (this.battleTimeRoot) this.battleTimeRoot.classList.add("isVisible");
    } else {
      el.textContent = this.i18n?.t?.("battleTime.analysing", "Monitoring data...") ?? "Monitoring data...";
    }
  }

}

DpsApp.instance = null;

// 디버그콘솔
const setupDebugConsole = () => {
  if (globalThis.uiDebug?.log) return globalThis.uiDebug;

  const consoleDiv = document.querySelector(".console");
  if (!consoleDiv) {
    globalThis.uiDebug = { log: () => {}, clear: () => {} };
    return globalThis.uiDebug;
  }

  const safeStringify = (value) => {
    if (typeof value === "string") return value;
    if (value instanceof Error) return `${value.name}: ${value.message}`;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  const appendLine = (line) => {
    consoleDiv.style.display = "block";
    consoleDiv.innerHTML += line + "<br>";
    consoleDiv.scrollTop = consoleDiv.scrollHeight;
  };

  const originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  const printToPanel = (level, args) => {
    const line = args.map(safeStringify).join(" ");
    appendLine(`[${level}] ${line}`);
  };

  if (!globalThis.__uiConsolePatched) {
    ["log", "info", "warn", "error"].forEach((level) => {
      console[level] = (...args) => {
        originalConsole[level](...args);
        printToPanel(level, args);
      };
    });
    globalThis.__uiConsolePatched = true;
  }

  globalThis.uiDebug = {
    clear() {
      consoleDiv.innerHTML = "";
    },
    log(...args) {
      printToPanel("debug", args);
    },
  };

  return globalThis.uiDebug;
};

// Keep JavaFX overlay console hidden unless explicitly re-enabled for troubleshooting.
// setupDebugConsole();
const dpsApp = DpsApp.createInstance();
window.dpsApp = dpsApp;
const debug = globalThis.uiDebug || { log: () => {}, clear: () => {} };

window.addEventListener("error", (event) => {
  debug?.log?.("window.error", {
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  debug?.log?.("unhandledrejection", event.reason);
});


let appStarted = false;
const startApp = async ({ forced = false } = {}) => {
  if (appStarted) return;
  appStarted = true;
  debug?.log?.("startApp", {
    readyState: document.readyState,
    hasDpsData: !!window.dpsData,
    hasJavaBridge: !!window.javaBridge,
    forced,
  });
  try {
    await window.i18n?.init?.();
    window.lucide?.createIcons?.();
    dpsApp.start();
    if (window.A2_VIEW === "details") {
      dpsApp.enterDetailsWindowMode();
    } else if (window.A2_VIEW === "history") {
      dpsApp.enterHistoryWindowMode();
    }
    window.javaBridge?.notifyUiReady?.();

  } catch (err) {
    debug?.log?.("startApp.error", err);
  }
};

const waitForBridgeAndStart = (attempt = 0) => {
  // JavaFX WebView injects these after loadWorker SUCCEEDED (slightly later than DOMContentLoaded)
  const ready = !!window.javaBridge && !!window.dpsData;

  debug?.log?.("waitForBridge", {
    attempt,
    readyState: document.readyState,
    hasDpsData: !!window.dpsData,
    hasJavaBridge: !!window.javaBridge,
  });

  if (ready) {
    startApp();
    return;
  }

  if (attempt >= 200) {
    debug?.log?.("waitForBridge.timeout", "Bridge not ready after 10s; forcing UI startup.");
    startApp({ forced: true });
    return;
  }

  setTimeout(() => waitForBridgeAndStart(attempt + 1), 50);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", waitForBridgeAndStart, { once: true });
} else {
  waitForBridgeAndStart();
}
