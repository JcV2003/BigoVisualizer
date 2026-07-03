/*
 * Big-O Visualizer — app logic
 * Depends on globals from data/algorithms.js: ALGORITHMS, COMPLEXITY_CURVES.
 * Depends on Chart (loaded from CDN before this file).
 */

(function () {
  "use strict";

  // ---- element refs ----
  const select   = document.getElementById("algorithm-select");
  const compare  = document.getElementById("compare-select");
  const compareField = document.getElementById("compare-field");
  const modeInputs = Array.from(document.querySelectorAll('input[name="mode"]'));
  const detail   = document.getElementById("detail");
  const empty    = document.getElementById("empty");
  const badges   = document.getElementById("badges");
  const codeEl   = document.getElementById("code");
  const explainEl = document.getElementById("explanation");
  const logToggle = document.getElementById("log-toggle");
  const nRange   = document.getElementById("n-range");
  const nValueEl = document.getElementById("n-value");
  const canvas   = document.getElementById("chart");

  // ---- plotting config ----
  // The plotted input-size range is dynamic, driven by the "Max n" slider.
  // Larger n spreads the curves apart; the y-axis re-fits on every change.
  let maxN = 20;
  function nValues() {
    return Array.from({ length: maxN }, (_, i) => i + 1);
  }

  // One color per complexity class, so a curve's color still signals its
  // growth class. Two algorithms of the same class share a color but are
  // told apart by name in the legend (and solid vs dashed line).
  const CURVE_COLORS = {
    "O(1)":       "#6ee7a8",
    "O(log n)":   "#5ac8fa",
    "O(n)":       "#7aa2ff",
    "O(n log n)": "#b48dff",
    "O(n^2)":     "#ff9f6e",
    "O(2^n)":     "#ff6b8a",
    "O(n!)":      "#ffd166",
  };

  let chart = null;

  // ---- build a <select>, grouped by category ----
  function populateSelect(target) {
    const groups = {};
    ALGORITHMS.forEach((algo) => {
      (groups[algo.category] = groups[algo.category] || []).push(algo);
    });
    Object.keys(groups).forEach((cat) => {
      const og = document.createElement("optgroup");
      og.label = cat;
      groups[cat].forEach((algo) => {
        const opt = document.createElement("option");
        opt.value = algo.id;
        opt.textContent = algo.name;
        og.appendChild(opt);
      });
      target.appendChild(og);
    });
  }

  // ---- render the detail panel for one algorithm ----
  function renderDetail(algo) {
    empty.hidden = true;
    detail.hidden = false;

    const c = algo.complexity;
    badges.innerHTML = "";
    const rows = [
      { key: "best", label: "Best" },
      { key: "average", label: "Avg" },
      { key: "worst", label: "Worst" },
      { key: "space", label: "Space" },
    ];
    rows.forEach((r) => {
      const b = document.createElement("span");
      b.className = "badge" + (r.key === "worst" ? " badge--worst" : "");
      b.innerHTML =
        '<span class="badge__key">' + r.label + "</span><b>" + c[r.key] + "</b>";
      badges.appendChild(b);
    });

    explainEl.textContent = algo.explanation;
    codeEl.textContent = algo.code;
  }

  // ---- (re)draw the chart ----
  // Operation counts for one curve across N_VALUES, with astronomically
  // large values clamped so the axis (and Chart.js) stay sane.
  function curveValues(key) {
    const fn = COMPLEXITY_CURVES[key];
    return nValues().map((n) => {
      const v = fn(n);
      return Number.isFinite(v) ? Math.min(v, 1e9) : 1e9;
    });
  }

  function getMode() {
    const checked = modeInputs.find((r) => r.checked);
    return checked ? checked.value : "solo";
  }

  // Which algorithms to plot, per comparison mode:
  //   solo  – just the focus algorithm
  //   pick  – the focus plus each extra chosen in "Compare with"
  //   all   – every algorithm in the library
  // Deduped, focus always first so it draws on top.
  function plottedAlgorithms(mode) {
    if (mode === "all") return ALGORITHMS.slice();
    const ids = [];
    if (select.value) ids.push(select.value);
    if (mode === "pick") {
      Array.from(compare.selectedOptions).forEach((opt) => {
        if (!ids.includes(opt.value)) ids.push(opt.value);
      });
    }
    return ids
      .map((id) => ALGORITHMS.find((a) => a.id === id))
      .filter(Boolean);
  }

  // Curves that size the linear y-axis. In "all" mode the explosive classes
  // weren't hand-picked, so leave O(2^n)/O(n!) out of the fit: the polynomial
  // family stays readable and the two runaway curves clip off the top (flip
  // on Log scale to see them). Solo/pick fit exactly what's plotted.
  const ASTRONOMICAL = new Set(["O(2^n)", "O(n!)"]);
  function framingAlgorithms(mode, plotted) {
    if (mode !== "all") return plotted;
    const tame = plotted.filter((a) => !ASTRONOMICAL.has(a.curveKey));
    return tame.length ? tame : plotted;
  }

  function drawChart() {
    const useLog = logToggle.checked;
    const mode = getMode();
    const algos = plottedAlgorithms(mode);
    const focusId = select.value;

    const datasets = algos.map((algo) => {
      const isFocus = algo.id === focusId;
      return {
        // name + class, so identical-class curves are still distinguishable
        label: algo.name + " · " + algo.curveKey,
        data: curveValues(algo.curveKey),
        borderColor: CURVE_COLORS[algo.curveKey],
        backgroundColor: CURVE_COLORS[algo.curveKey],
        borderWidth: isFocus ? 3 : 2,
        borderDash: isFocus ? [] : [6, 4],
        pointRadius: 0,
        tension: 0.15,
        order: isFocus ? 0 : 1,
      };
    });

    // Frame the linear axis to the tallest curve that should drive the fit
    // for this mode (see framingAlgorithms), so the chosen algorithms stay
    // readable regardless of class. Log scale needs no cap.
    let yMax;
    if (!useLog && algos.length) {
      const frame = framingAlgorithms(mode, algos);
      const tallest = Math.max(
        ...frame.map((a) => Math.max(...curveValues(a.curveKey)))
      );
      // 10% headroom, trimmed to 3 significant figures so the top axis
      // label stays clean (avoids e.g. 440.00000000000006).
      yMax = Number((tallest * 1.1).toPrecision(3));
    }

    const cfg = {
      type: "line",
      data: { labels: nValues(), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "nearest", intersect: false },
        scales: {
          x: {
            title: { display: true, text: "input size (n)", color: "#8b98a9" },
            grid: { color: "#1b2430" },
            ticks: { color: "#8b98a9" },
          },
          y: {
            type: useLog ? "logarithmic" : "linear",
            min: useLog ? undefined : 0,
            max: yMax, // undefined in log mode -> Chart.js auto-scales
            title: { display: true, text: "operations", color: "#8b98a9" },
            grid: { color: "#1b2430" },
            ticks: { color: "#8b98a9" },
          },
        },
        plugins: {
          legend: {
            labels: { color: "#e6edf3", font: { family: "JetBrains Mono" } },
          },
          tooltip: {
            callbacks: {
              title: (items) => "n = " + items[0].label,
            },
          },
        },
      },
    };

    if (chart) chart.destroy();
    chart = new Chart(canvas.getContext("2d"), cfg);
  }

  // ---- events ----
  select.addEventListener("change", function () {
    const algo = ALGORITHMS.find((a) => a.id === this.value);
    if (!algo) {
      detail.hidden = true;
      empty.hidden = false;
    } else {
      renderDetail(algo);
    }
    drawChart();
  });

  compare.addEventListener("change", drawChart);
  logToggle.addEventListener("change", drawChart);

  nRange.addEventListener("input", function () {
    maxN = Number(this.value);
    nValueEl.textContent = maxN;
    drawChart();
  });

  // The "Compare with" picker only applies in "pick" mode; hide it otherwise.
  function syncModeUI() {
    compareField.hidden = getMode() !== "pick";
  }
  modeInputs.forEach((r) =>
    r.addEventListener("change", () => {
      syncModeUI();
      drawChart();
    })
  );

  // ---- init ----
  populateSelect(select);
  populateSelect(compare);
  maxN = Number(nRange.value);
  nValueEl.textContent = maxN;
  syncModeUI();
  drawChart(); // empty until the user picks something to plot
})();
