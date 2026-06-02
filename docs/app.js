const LOW_SAMPLE_THRESHOLD = 30;
const DEFAULT_TARGET_PCT = 95;

const state = {
  rows: [],
  target: DEFAULT_TARGET_PCT,
  tableSortKey: "on_time_pct",
  tableSortType: "num",
  tableSortAscending: false,
  chartSort: "worst",
  hideLowSample: false,
};

const TINTS = {
  "var(--good)": "rgba(63,185,80,0.12)",
  "var(--warn)": "rgba(210,153,34,0.12)",
  "var(--bad)": "rgba(248,81,73,0.12)",
  "var(--fg-3)": "rgba(107,119,131,0.12)",
};

function motionOK() {
  return !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

const format = {
  delaySeconds(seconds) {
    if (seconds === null || seconds === undefined) return "–";
    const sign = seconds > 0 ? "+" : seconds < 0 ? "−" : "";
    const absolute = Math.abs(seconds);
    const minutes = Math.floor(absolute / 60);
    const remainder = absolute % 60;
    return minutes
      ? `${sign}${minutes}m ${String(remainder).padStart(2, "0")}s`
      : `${sign}${remainder}s`;
  },
  serviceDate(yyyymmdd) {
    if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd || "–";
    const year = yyyymmdd.slice(0, 4);
    const month = yyyymmdd.slice(4, 6);
    const day = yyyymmdd.slice(6, 8);
    return new Date(`${year}-${month}-${day}T00:00:00`).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  },
  percent(value) {
    return value === null || value === undefined ? "–" : value.toFixed(1) + "%";
  },
};

function verdict(percent, target) {
  if (percent === null || percent === undefined) return "var(--fg-3)";
  if (percent >= target) return "var(--good)";
  if (percent >= target - 25) return "var(--warn)";
  return "var(--bad)";
}

function tint(colour) {
  return TINTS[colour] || "rgba(255,255,255,0.06)";
}

function routePill(route, percent, target) {
  const colour = verdict(percent, target);
  const fill = tint(colour);
  return `<span class="route-pill" style="color:${colour};background:${fill};border-color:${fill}">${route}</span>`;
}

function hasReadings(row) {
  return row.on_time_pct !== null && row.on_time_pct !== undefined;
}

function sortedChartRows() {
  let rows = state.rows.filter(hasReadings);
  if (state.hideLowSample) {
    rows = rows.filter((row) => row.readings_in_gate >= LOW_SAMPLE_THRESHOLD);
  }
  if (state.chartSort === "worst") {
    rows.sort((a, b) => a.on_time_pct - b.on_time_pct);
  } else if (state.chartSort === "best") {
    rows.sort((a, b) => b.on_time_pct - a.on_time_pct);
  } else {
    rows.sort((a, b) => String(a.route).localeCompare(String(b.route), undefined, { numeric: true }));
  }
  return rows;
}

function renderChart() {
  const container = document.getElementById("chart");
  const rows = sortedChartRows();

  if (!rows.length) {
    container.innerHTML = '<p class="faint audit-small" style="margin:6px 0">No routes with readings to chart yet.</p>';
    return;
  }

  const target = state.target;
  const grow = motionOK();
  container.innerHTML = rows
    .map((row) => {
      const colour = verdict(row.on_time_pct, target);
      const lowSampleClass = row.readings_in_gate < LOW_SAMPLE_THRESHOLD ? " lown" : "";
      const final = Math.min(100, row.on_time_pct);
      const width = grow ? 0 : final;
      return `<div class="bar-row${lowSampleClass}">
      <div class="rlabel">${routePill(row.route, row.on_time_pct, target)}</div>
      <div class="bar-track"><div class="bar-fill" data-w="${final}" style="width:${width}%;background:${colour}"></div></div>
      <div class="bar-meta">${row.on_time_pct.toFixed(1)}% <span class="n">n=${row.readings_in_gate}</span></div>
    </div>`;
    })
    .join("");

  if (grow) {
    requestAnimationFrame(() => {
      container.querySelectorAll(".bar-fill").forEach((fill) => {
        fill.style.width = fill.dataset.w + "%";
      });
    });
  }

  drawTargetLine(container, target);
}

function drawTargetLine(container, target) {
  const firstTrack = container.querySelector(".bar-track");
  if (!firstTrack) return;
  const containerBox = container.getBoundingClientRect();
  const trackBox = firstTrack.getBoundingClientRect();
  const offsetX = trackBox.left - containerBox.left + trackBox.width * (target / 100);
  const line = document.createElement("div");
  line.className = "tgtline";
  line.style.left = offsetX + "px";
  line.innerHTML = `<span>${target}% target</span>`;
  container.appendChild(line);
}

function wireChartControls() {
  document.querySelectorAll(".ctl").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".ctl").forEach((other) => other.classList.remove("active"));
      button.classList.add("active");
      state.chartSort = button.dataset.sort;
      renderChart();
    });
  });
  document.getElementById("hideLowN").addEventListener("change", (event) => {
    state.hideLowSample = event.target.checked;
    renderChart();
  });
  window.addEventListener("resize", renderChart);
}

function sortedTableRows() {
  const { tableSortKey, tableSortType, tableSortAscending } = state;
  return [...state.rows].sort((a, b) => {
    let left = a[tableSortKey];
    let right = b[tableSortKey];
    if (tableSortType === "str") {
      left = (left || "").toString();
      right = (right || "").toString();
      return tableSortAscending
        ? left.localeCompare(right, undefined, { numeric: true })
        : right.localeCompare(left, undefined, { numeric: true });
    }
    left = left ?? -Infinity;
    right = right ?? -Infinity;
    return tableSortAscending ? left - right : right - left;
  });
}

function renderTable() {
  const body = document.querySelector("#routes tbody");
  body.innerHTML = sortedTableRows()
    .map((row) => {
      const colour = verdict(row.on_time_pct, state.target);
      const low = row.readings_in_gate < LOW_SAMPLE_THRESHOLD;
      const flag = low
        ? `<span class="lown">n=${row.readings_in_gate}${row.readings_in_gate === 0 ? ", no readings" : ", indicative"}</span>`
        : "";
      return `<tr>
      <td class="rcell">${routePill(row.route, row.on_time_pct, state.target)}${flag}</td>
      <td><span class="badge" style="color:${colour};background:${tint(colour)}">${format.percent(row.on_time_pct)}</span></td>
      <td>${format.delaySeconds(row.median_delay_s)}</td>
      <td>${format.delaySeconds(row.mean_delay_s)}</td>
      <td>${row.readings_in_gate}</td>
      <td class="faint">${row.early}</td>
      <td class="faint">${row.on_time}</td>
      <td class="faint">${row.late}</td>
    </tr>`;
    })
    .join("");
}

function wireTableSort() {
  document.querySelectorAll("#routes th").forEach((header) => {
    header.addEventListener("click", () => {
      const key = header.dataset.k;
      const type = header.dataset.type || "num";
      if (state.tableSortKey === key) {
        state.tableSortAscending = !state.tableSortAscending;
      } else {
        state.tableSortKey = key;
        state.tableSortType = type;
        state.tableSortAscending = type === "str";
      }
      document.querySelectorAll("#routes th").forEach((other) => other.classList.remove("arrow", "asc"));
      header.classList.add("arrow");
      if (state.tableSortAscending) header.classList.add("asc");
      renderTable();
    });
  });
}

function wireSections() {
  document.querySelectorAll(".sec").forEach((section) => {
    const head = section.querySelector(".sec-head");
    const body = section.querySelector(".sec-body");
    head.addEventListener("click", () => {
      section.classList.toggle("collapsed");
      const open = !section.classList.contains("collapsed");
      head.setAttribute("aria-expanded", open ? "true" : "false");
      animateSection(body, open);
    });
  });
}

function animateSection(body, open) {
  if (!motionOK()) {
    body.style.height = open ? "auto" : "0px";
    return;
  }
  const from = body.getBoundingClientRect().height;
  body.style.height = open ? "auto" : "0px";
  const to = body.getBoundingClientRect().height;
  if (from === to) return;
  body.animate(
    [{ height: from + "px" }, { height: to + "px" }],
    { duration: 340, easing: "cubic-bezier(.4,0,.2,1)" }
  );
}

function countUp(element, target, decimals) {
  if (!motionOK()) {
    element.textContent = target.toFixed(decimals);
    return;
  }
  const duration = 650;
  let start;
  function step(now) {
    if (start === undefined) start = now;
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = (target * eased).toFixed(decimals);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function showError(message) {
  const box = document.getElementById("err");
  box.textContent = message;
  box.style.display = "block";
}

function renderHeadline(data, day) {
  const overall = day.overall;
  const colour = verdict(overall.on_time_pct, state.target);

  document.getElementById("opname").textContent = data.operator_name || data.operator || "the operator";
  document.getElementById("period-line").textContent =
    "Service day: " +
    format.serviceDate(day.service_date) +
    (data.days.length > 1 ? ` · ${data.days.length} days collected` : " · 1 day collected");

  countUp(document.getElementById("ot-pct"), overall.on_time_pct, 1);

  const fill = document.getElementById("ot-fill");
  const finalWidth = Math.min(100, overall.on_time_pct) + "%";
  fill.style.background = colour;
  if (motionOK()) {
    fill.style.width = "0%";
    requestAnimationFrame(() => requestAnimationFrame(() => (fill.style.width = finalWidth)));
  } else {
    fill.style.width = finalWidth;
  }

  document.getElementById("ot-tgt").style.left = state.target + "%";
  document.getElementById("tgt-label").textContent = "target " + state.target + "%";
  document.getElementById("ot-band").textContent = "On-time = " + (data.on_time_band || "");
  document.getElementById("median-delay").textContent = format.delaySeconds(overall.median_delay_s);
  document.getElementById("mean-delay").textContent = format.delaySeconds(overall.mean_delay_s);
  document.getElementById("readings").textContent = overall.readings_in_gate.toLocaleString();
  document.getElementById("trips").textContent = overall.observed_trips.toLocaleString();

  document.getElementById("genat").textContent = data.generated_at
    ? new Date(data.generated_at).toLocaleString("en-GB")
    : "–";
  document.getElementById("genday").textContent = format.serviceDate(day.service_date);
}

async function load() {
  let data;
  try {
    const response = await fetch("audit_data.json", { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    data = await response.json();
  } catch (error) {
    showError(
      "Couldn't load audit_data.json (" +
        error.message +
        "). If you opened this file directly, run a local server instead: cd audit_site && python -m http.server 8000, then visit http://localhost:8000"
    );
    return;
  }

  state.target = data.target_pct ?? DEFAULT_TARGET_PCT;

  const day = data.days && data.days[data.days.length - 1];
  if (!day) {
    showError("No rollup days in the data yet.");
    return;
  }

  state.rows = day.routes || [];
  renderHeadline(data, day);
  renderTable();
  renderChart();
}

wireSections();
wireTableSort();
wireChartControls();
load();
