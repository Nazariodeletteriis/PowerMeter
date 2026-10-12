const createMeterUI = ({
  elList,
  dpsFormatter,
  getUserName,
  onClickUserRow,
  onHoverUserRow,
  onLeaveUserRow,
  getMetric,
  getSortDirection,
  getPinUserToTop,
  getPlayerLimit,
  getOnlyUser,
}) => {
  const MAX_CACHE = 32;
  const cjkRegex = /[\u3400-\u9FFF\uF900-\uFAFF]/;

  // PowerMeter: the backend names classes in Korean. The row carries a stable
  // English key so the theme can set the class colour and icon in CSS
  // (see src/powermeter-theme.css).
  const CLASS_KEY_BY_JOB = {
    \uAC80\uC131: "gladiator",
    \uC218\uD638\uC131: "templar",
    \uC0B4\uC131: "assassin",
    \uAD81\uC131: "ranger",
    \uB9C8\uB3C4\uC131: "sorcerer",
    \uC815\uB839\uC131: "spiritmaster",
    \uCE58\uC720\uC131: "cleric",
    \uD638\uBC95\uC131: "chanter",
    \uAD8C\uC131: "brawler",
  };
  // history.js shows the same CSS icons (its old <img src="./assets/<job>.png"> never reached the build).
  window.PM_CLASS_KEY_BY_JOB = CLASS_KEY_BY_JOB;

  // PowerMeter: one decimal in the UI language ("30,1" in Italian), as the design shows.
  const formatOneDecimal = (n) =>
    n.toLocaleString(window.i18n?.getLanguage?.() || "en", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
      useGrouping: "always",
    });
  // Total damage as the exact figure the character dealt, with the UI
  // language's thousands separators ("12.345.678").
  const formatDamage = (n) => dpsFormatter.format(Math.round(n));

  const rowViewById = new Map();
  let lastVisibleIds = new Set();
  let pendingRenderRows = null;
  let renderRowsRafId = 0;

  const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

  const createRowView = (id) => {
    const rowEl = document.createElement("div");
    rowEl.className = "item";
    rowEl.style.display = "none";
    rowEl.dataset.rowId = String(id);

    // The bar spans the full row, so 100% reads as 100%. The readout keeps
    // its own scrim (see .dps in styles.css) for where the bar passes behind.
    const fillTrackEl = document.createElement("div");
    fillTrackEl.className = "fillTrack";

    const fillEl = document.createElement("div");
    fillEl.className = "fill";
    fillTrackEl.appendChild(fillEl);

    const contentEl = document.createElement("div");
    contentEl.className = "content";

    // Ladder position by damage. Kept separate from row order so that
    // "pin me to top" moves the row without misreporting the rank.
    const rankEl = document.createElement("span");
    rankEl.className = "rank";

    // The class icon is CSS (--cls-icon from the row's data-cls, see
    // powermeter-theme.css), in every layout: the old ./assets/<job>.png files
    // are not in the build, so an <img> here showed a broken image.
    const classIconEl = document.createElement("div");
    classIconEl.className = "classIcon";

    const nameEl = document.createElement("div");
    nameEl.className = "name";

    // Party combat power, shown beside the name. Hidden unless the party roster
    // packet supplied a value for this player.
    const combatPowerEl = document.createElement("span");
    combatPowerEl.className = "combatPower";
    combatPowerEl.style.display = "none";

    const dpsContainer = document.createElement("div");
    const dpsNumber = document.createElement("p");
    dpsContainer.className = "dps";
    const dpsContribution = document.createElement("p");
    dpsContribution.className = "dpsContribution";
    // PowerMeter: total damage column. Hidden outside the powermeter theme.
    const dpsTotal = document.createElement("p");
    dpsTotal.className = "dpsTotal";

    dpsContainer.appendChild(dpsNumber);
    dpsContainer.appendChild(dpsContribution);
    dpsContainer.appendChild(dpsTotal);

    contentEl.appendChild(rankEl);
    contentEl.appendChild(classIconEl);
    contentEl.appendChild(nameEl);
    contentEl.appendChild(combatPowerEl);
    contentEl.appendChild(dpsContainer);
    rowEl.appendChild(fillTrackEl);
    rowEl.appendChild(contentEl);

    const view = {
      id,
      rowEl,
      prevContribClass: "",
      nameEl,
      combatPowerEl,
      rankEl,
      dpsContainer,
      classIconEl,
      dpsNumber,
      dpsContribution,
      dpsTotal,
      fillEl,
      currentRow: null,
      lastSeenAt: 0,
      isVisible: false,
      lastNameText: "",
      lastCombatPowerText: "",
      lastIsCjk: false,
      lastMetricText: "",
      lastContributionText: "",
      lastTotalText: "",
      lastRankText: "",
      lastFillRatio: -1,
      lastIsUser: false,
      lastIsIdentifying: false,
      hoverRipplePlayed: false,
      hoverRippleTimer: null,
    };

    rowEl.addEventListener("mouseenter", (event) => {
      if (!view.hoverRipplePlayed) {
        view.rowEl.classList.add("hoverRippleOnce");
        view.hoverRipplePlayed = true;
        if (view.hoverRippleTimer) {
          clearTimeout(view.hoverRippleTimer);
        }
        view.hoverRippleTimer = setTimeout(() => {
          view.rowEl.classList.remove("hoverRippleOnce");
          view.hoverRippleTimer = null;
        }, 950);
      }
      onHoverUserRow?.(view.currentRow, event);
    });


    rowEl.addEventListener("mousemove", (event) => {
      if (view._lastMoveMs && nowMs() - view._lastMoveMs < 100) return;
      view._lastMoveMs = nowMs();
      onHoverUserRow?.(view.currentRow, event);
    });
    rowEl.addEventListener("mouseleave", () => {
      view.hoverRipplePlayed = false;
      if (view.hoverRippleTimer) {
        clearTimeout(view.hoverRippleTimer);
        view.hoverRippleTimer = null;
      }
      view.rowEl.classList.remove("hoverRippleOnce");
      onLeaveUserRow?.(view.currentRow);
    });

    rowEl.addEventListener("click", () => {
      // if (view.currentRow?.isUser)
      onClickUserRow?.(view.currentRow);
    });

    return view;
  };

  const getRowView = (id) => {
    let view = rowViewById.get(id);
    if (!view) {
      view = createRowView(id);
      rowViewById.set(id, view);
      elList.appendChild(view.rowEl);
    }
    return view;
  };

  const getDisplayRows = (sortedAll) => {
    const limit = (typeof getPlayerLimit === "function" ? getPlayerLimit() : 6) || 6;
    const topN = sortedAll.slice(0, limit);
    const user = sortedAll.find((x) => x.isUser);

    if (!user) return topN;
    // You take the last slot when outside the top, so the list keeps the same
    // length whatever it is sorted by (the widget's tabs must not resize it).
    const others = topN.filter((row) => !row.isUser).slice(0, limit - 1);
    const pinUser = typeof getPinUserToTop === "function" && getPinUserToTop();
    if (pinUser) return [user, ...others];
    if (topN.includes(user)) return topN;
    return [...others, user];
  };

  const pruneCache = (keepIds) => {
    if (rowViewById.size <= MAX_CACHE) return;

    const candidates = [];
    for (const [id, view] of rowViewById) {
      if (keepIds.has(id)) {
        continue;
      }
      candidates.push({ id, t: view.lastSeenAt || 0 });
    }

    candidates.sort((a, b) => a.t - b.t); // 오래된거 제거

    for (let i = 0; rowViewById.size > MAX_CACHE && i < candidates.length; i++) {
      const id = candidates[i].id;
      const view = rowViewById.get(id);
      if (!view) continue;
      view.rowEl.remove();
      rowViewById.delete(id);
    }
  };

  const resolveMetric = (row) => {
    if (typeof getMetric === "function") {
      return getMetric(row);
    }
    const dps = Number(row?.dps) || 0;
    const suffix = window.i18n?.t?.("meter.dpsSuffix", "/s") ?? "/s";
    return { value: dps, text: `${dpsFormatter.format(dps)}${suffix}` };
  };

  let lastOrderKey = "";

  // shareRows: the rows the share column, the bar and the top value are measured
  // against. Only my DPS shows one row but keeps them against the whole party.
  const renderRows = (rows, rankById, shareRows = rows) => {
    const now = nowMs();
    const nextVisibleIds = new Set();

    const hadRows = elList.classList.contains("hasRows");
    const hasRows = rows.length > 0;
    if (hadRows !== hasRows) {
      elList.classList.toggle("hasRows", hasRows);
    }

    let topMetric = 1;
    for (const row of shareRows) {
      const metricValue = Number(resolveMetric(row)?.value) || 0;
      if (metricValue > topMetric) topMetric = metricValue;
    }
    // The share and total columns follow the metric's own total (healing, damage
    // taken) when it has one, the damage dealt otherwise.
    const totalOf = (row) => Number(resolveMetric(row)?.total ?? row?.totalDamage) || 0;
    const visibleTotalDamage = shareRows.reduce((sum, row) => sum + totalOf(row), 0);

    // Build order key to detect if DOM reordering is needed
    let orderKey = "";
    const validRows = [];
    for (const row of rows) {
      if (!row) continue;
      const id = row.id ?? row.name;
      if (!id) continue;
      validRows.push({ row, id });
      orderKey += id + ",";
    }

    const needsReorder = orderKey !== lastOrderKey;
    lastOrderKey = orderKey;

    for (const { row, id } of validRows) {
      nextVisibleIds.add(id);

      const view = getRowView(id);
      view.currentRow = row;
      view.lastSeenAt = now;

      if (!view.isVisible) {
        view.rowEl.style.display = "";
        view.isVisible = true;
      }

      const isUser = !!row.isUser;
      if (view.lastIsUser !== isUser) {
        view.rowEl.classList.toggle("isUser", isUser);
        view.lastIsUser = isUser;
      }

      const isIdentifying = !!row.isIdentifying;
      if (view.lastIsIdentifying !== isIdentifying) {
        view.rowEl.classList.toggle("isIdentifying", isIdentifying);
        view.lastIsIdentifying = isIdentifying;
      }

      const rowId = row.id ?? row.name ?? "";
      const nameText = row.isIdentifying
        ? window.i18n?.format?.("meter.identifyingPlayer", { id: rowId }, `#${rowId}`) ??
          `#${rowId}`
        : row.name ?? "";
      if (view.lastNameText !== nameText) {
        view.nameEl.textContent = nameText;
        view.lastNameText = nameText;
      }

      const isCjk = cjkRegex.test(nameText);
      if (view.lastIsCjk !== isCjk) {
        view.nameEl.classList.toggle("isCjk", isCjk);
        view.lastIsCjk = isCjk;
      }

      // Combat power sits beside the name, abbreviated to thousands the way
      // players quote it — 889,100 reads as "889k", 889,545 as "890k". The
      // exact figure stays on the row for the details panel. Below 500 the
      // abbreviation would collapse to "0k", so show the raw number there.
      const combatPower = Number(row.combatPower) || 0;
      const combatPowerK = Math.round(combatPower / 1000);
      const combatPowerText =
        combatPower <= 0
          ? ""
          : combatPowerK > 0
            ? `${combatPowerK.toLocaleString()}k`
            : combatPower.toLocaleString();
      if (view.lastCombatPowerText !== combatPowerText) {
        view.combatPowerEl.textContent = combatPowerText;
        view.combatPowerEl.style.display = combatPowerText ? "" : "none";
        view.lastCombatPowerText = combatPowerText;
      }

      const classKey = CLASS_KEY_BY_JOB[row.job] || "";
      if (view.rowEl.dataset.cls !== classKey) view.rowEl.dataset.cls = classKey;

      const metric = resolveMetric(row) || { value: 0, text: "-" };
      const metricValue = Number(metric.value) || 0;
      const damageContribution =
        visibleTotalDamage > 0 ? (totalOf(row) / visibleTotalDamage) * 100 : 0;

      let contributionClass = "";
      if (damageContribution < 3) {
        contributionClass = "error";
      } else if (damageContribution < 5) {
        contributionClass = "warning";
      }
      if (view.prevContribClass !== contributionClass) {
        if (view.prevContribClass) {
          view.rowEl.classList.remove(view.prevContribClass);
        }
        if (contributionClass) {
          view.rowEl.classList.add(contributionClass);
        }
        view.prevContribClass = contributionClass;
      }

      const metricText = metric.text;
      if (view.lastMetricText !== metricText) {
        view.dpsNumber.textContent = metricText;
        view.lastMetricText = metricText;
      }

      const contributionText = `${formatOneDecimal(damageContribution)}%`;
      if (view.lastContributionText !== contributionText) {
        view.dpsContribution.textContent = contributionText;
        // PowerMeter: the theme fills the row bar to this share (design), not to the top DPS.
        // On the bar itself (not the row), so only the bar restyles.
        view.fillEl.style.setProperty("--pm-share", (damageContribution / 100).toFixed(3));
        view.lastContributionText = contributionText;
      }

      const totalText = formatDamage(totalOf(row));
      if (view.lastTotalText !== totalText) {
        view.dpsTotal.textContent = totalText;
        view.lastTotalText = totalText;
      }

      const rankText = String(rankById?.get(id) ?? "");
      if (view.lastRankText !== rankText) {
        view.rankEl.textContent = rankText;
        view.rowEl.classList.toggle("isRankOne", rankText === "1");
        view.lastRankText = rankText;
      }

      const ratio = Math.max(0, Math.min(1, metricValue / topMetric));
      if (view.lastFillRatio !== ratio) {
        // Width rather than scaleX: the bar's lit leading edge is a fixed
        // 2px child, and a scaled parent would squash it (and its glow) by
        // the fill ratio. Six absolutely-positioned rows, rAF-throttled, so
        // the layout cost is not measurable.
        view.fillEl.style.width = `${(ratio * 100).toFixed(2)}%`;
        view.lastFillRatio = ratio;
      }

      // Only touch DOM order when the sorted list actually changed
      // moveBefore keeps the row's running bar transition; appendChild (older
      // WebView2) removes and re-inserts it, which snaps the bar.
      if (needsReorder) {
        if (elList.moveBefore) elList.moveBefore(view.rowEl, null);
        else elList.appendChild(view.rowEl);
      }
    }

    for (const id of lastVisibleIds) {
      if (nextVisibleIds.has(id)) continue;
      const view = rowViewById.get(id);
      if (view && view.isVisible) {
        view.rowEl.style.display = "none";
        view.isVisible = false;
      }
    }

    lastVisibleIds = nextVisibleIds;

    pruneCache(nextVisibleIds);
  };

  const flushPendingRows = () => {
    renderRowsRafId = 0;
    const rows = pendingRenderRows;
    pendingRenderRows = null;
    if (!rows) return;

    const arr = Array.isArray(rows) ? rows.slice() : [];
    const sortDirection = typeof getSortDirection === "function" ? getSortDirection() : "desc";
    arr.sort((a, b) => {
      const aMetric = Number(resolveMetric(a)?.value) || 0;
      const bMetric = Number(resolveMetric(b)?.value) || 0;
      return sortDirection === "asc" ? aMetric - bMetric : bMetric - aMetric;
    });

    // Rank is always "1 = most damage", independent of the ascending /
    // descending list toggle and of pinning the user to the top.
    const rankById = new Map();
    arr
      .slice()
      .sort((a, b) => (Number(resolveMetric(b)?.value) || 0) - (Number(resolveMetric(a)?.value) || 0))
      .forEach((row, index) => {
        const id = row?.id ?? row?.name;
        if (id) rankById.set(id, index + 1);
      });

    // Only my DPS: your row alone, measured against everyone. Until the meter
    // knows which row is yours it cannot pick one, so it shows them all.
    const onlyUser = typeof getOnlyUser === "function" && getOnlyUser() && arr.some((row) => row.isUser);
    if (onlyUser) renderRows(arr.filter((row) => row.isUser), rankById, arr);
    else renderRows(getDisplayRows(arr), rankById);
  };

  const updateFromRows = (rows) => {
    pendingRenderRows = rows;
    if (renderRowsRafId) return;
    renderRowsRafId = requestAnimationFrame(flushPendingRows);
  };
  const onResetMeterUi = () => {
    if (renderRowsRafId) {
      cancelAnimationFrame(renderRowsRafId);
      renderRowsRafId = 0;
    }
    pendingRenderRows = null;
    lastOrderKey = "";
    elList.classList.remove("hasRows");
    lastVisibleIds = new Set();

    const battleTimeEl = elList.querySelector(".battleTime");
    if (battleTimeEl) {
      elList.replaceChildren(battleTimeEl);
    } else {
      elList.replaceChildren();
    }

    rowViewById.clear();
  };

  const getRowById = (id) => {
    if (id === null || id === undefined) return null;
    const view = rowViewById.get(id) || rowViewById.get(String(id));
    return view?.currentRow || null;
  };

  return { updateFromRows, onResetMeterUi, getRowById };
};
