/* ============================================================
   NBS Solver — Newton / Bisection / Secant
   Requires math.js (loaded via CDN in index.html)
============================================================ */

// ─── State ────────────────────────────────────────────────
let currentMethod = 'newton';
let lastResult = null;
let graphScale = 1;
const GRAPH_RANGE_DEFAULT = 10;
let graphRange = GRAPH_RANGE_DEFAULT;
let graphOffsetX = 0;
let graphOffsetY = 0;

// ─── DOM Refs ─────────────────────────────────────────────
const methodBtns = document.querySelectorAll('.nav-btn');
const methodBadge = document.getElementById('methodBadge');
const iterCountEl = document.getElementById('iterCount');
const rootDisplayEl = document.getElementById('rootDisplay');

const funcInput = document.getElementById('funcInput');
const derivInput = document.getElementById('derivInput');
const errorMsg = document.getElementById('errorMsg');

const resRoot = document.getElementById('resRoot');
const resFx = document.getElementById('resFx');
const resIter = document.getElementById('resIter');
const resError = document.getElementById('resError');

const solveBtn = document.getElementById('solveBtn');
const clearBtn = document.getElementById('clearBtn');

const tableHead = document.getElementById('tableHead');
const tableBody = document.getElementById('tableBody');
const tableTag = document.getElementById('tableTag');

const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');
const placeholder = document.getElementById('canvasPlaceholder');

// ─── Steps Indicator ──────────────────────────────────────
function setStep(n) {
  const steps = [document.getElementById('step1'), document.getElementById('step2'), document.getElementById('step3')];
  steps.forEach((s, i) => {
    s.classList.remove('active', 'done');
    if (i + 1 < n) s.classList.add('done');
    if (i + 1 === n) s.classList.add('active');
  });
}

const funcHint = document.getElementById('funcHint');
// Watch func input to advance step & validate
funcInput.addEventListener('input', () => {
  const val = funcInput.value.trim();
  if (val.length > 0) {
    try {
      math.parse(val); // Test if valid math
      setStep(2);
      funcInput.classList.remove('error');
      funcInput.classList.add('valid');
      funcHint.textContent = 'Valid expression ✓';
      funcHint.style.color = 'var(--success)';
    } catch (e) {
      funcInput.classList.remove('valid');
      funcInput.classList.add('error');
      funcHint.textContent = 'Invalid expression syntax';
      funcHint.style.color = 'var(--danger)';
      setStep(1);
    }
  } else {
    setStep(1);
    funcInput.classList.remove('valid', 'error');
    funcHint.textContent = 'Use ^ for power, * for multiply';
    funcHint.style.color = 'var(--text-3)';
  }
});

// ─── Method Switch ────────────────────────────────────────
methodBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentMethod = btn.dataset.method;
    methodBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Update body class for color theming without losing light-mode
    document.body.classList.remove('method-newton', 'method-bisection', 'method-secant');
    document.body.classList.add(`method-${currentMethod}`);

    // Badge
    const labels = { newton: "Newton's Method", bisection: "Bisection Method", secant: "Secant Method" };
    methodBadge.textContent = labels[currentMethod];

    // Show correct inputs
    document.querySelectorAll('.method-inputs').forEach(el => el.classList.add('hidden'));
    document.getElementById(`inputs-${currentMethod}`).classList.remove('hidden');

    clearResults();
  });
});

// ─── Solve Button ─────────────────────────────────────────
solveBtn.addEventListener('click', () => {
  hideError();
  solveBtn.classList.add('loading');
  solveBtn.textContent = 'Solving…';

  // slight delay so UI updates before heavy computation
  setTimeout(() => {
    try {
      const fnStr = funcInput.value.trim();
      if (!fnStr) throw new Error('Please enter a function f(x).');

      let result;
      if (currentMethod === 'newton') result = solveNewton(fnStr);
      else if (currentMethod === 'bisection') result = solveBisection(fnStr);
      else result = solveSecant(fnStr);

      lastResult = result;
      displayResults(result);

      // Save to history
      if (fnStr && !Array.from(document.getElementById('funcHistory').options).some(opt => opt.value === fnStr)) {
        const opt = document.createElement('option');
        opt.value = fnStr;
        document.getElementById('funcHistory').prepend(opt);
      }
      drawGraph(fnStr, result.root);
      buildTable(result);
      setStep(3);

    } catch (e) {
      showError(e.message);
      // Highlight empty required fields
      if (!funcInput.value.trim()) funcInput.classList.add('error');
      setStep(funcInput.value.trim() ? 2 : 1);
    } finally {
      solveBtn.classList.remove('loading');
      solveBtn.textContent = 'Solve!';
    }
  }, 30);
});

clearBtn.addEventListener('click', clearAll);

// ─── Newton's Method ──────────────────────────────────────
function solveNewton(fnStr) {
  const x0 = parseFloat(document.getElementById('newtonX0').value);
  const tol = parseFloat(document.getElementById('newtonTol').value) || 1e-6;
  const maxIt = parseInt(document.getElementById('newtonMax').value) || 50;
  const dStr = document.getElementById('derivInput').value.trim();

  if (isNaN(x0)) throw new Error("Enter an initial guess x₀.");

  const f = x => evaluate(fnStr, x);
  let df;
  if (dStr) {
    df = x => evaluate(dStr, x);
  } else {
    // Try symbolic diff via math.js
    try {
      const dfNode = math.derivative(fnStr, 'x').compile();
      df = x => dfNode.evaluate({x});
    } catch (e) {
      // Fallback to numerical diff if symbolic fails
      df = x => (f(x + 1e-7) - f(x - 1e-7)) / 2e-7;
    }
  }

  const rows = [];
  let xn = x0;

  for (let i = 1; i <= maxIt; i++) {
    const fx = f(xn);
    const dfx = df(xn);

    if (Math.abs(dfx) < 1e-14) throw new Error(`Derivative is zero at x = ${xn.toPrecision(6)}. Try a different initial guess.`);

    const xn1 = xn - fx / dfx;
    const err = Math.abs(xn1 - xn);
    rows.push({ i, xn: xn1, fx: f(xn1), dfx, err });

    if (err < tol) {
      return { root: xn1, fx: f(xn1), iterations: i, error: err, rows, method: 'newton' };
    }
    xn = xn1;
  }
  return { root: xn, fx: f(xn), iterations: maxIt, error: Math.abs(f(xn)), rows, method: 'newton', warning: 'Max iterations reached.' };
}

// ─── Bisection Method ─────────────────────────────────────
function solveBisection(fnStr) {
  let a = parseFloat(document.getElementById('bisA').value);
  let b = parseFloat(document.getElementById('bisB').value);
  const tol = parseFloat(document.getElementById('bisTol').value) || 1e-6;
  const maxIt = parseInt(document.getElementById('bisMax').value) || 50;

  if (isNaN(a) || isNaN(b)) throw new Error("Enter both bounds a and b.");
  if (a >= b) throw new Error("Lower bound a must be less than upper bound b.");

  const f = x => evaluate(fnStr, x);
  if (f(a) * f(b) > 0) throw new Error(`f(a) and f(b) must have opposite signs.\nf(${a}) = ${f(a).toPrecision(4)}, f(${b}) = ${f(b).toPrecision(4)}`);

  const rows = [];
  let c;

  for (let i = 1; i <= maxIt; i++) {
    c = (a + b) / 2;
    const fc = f(c);
    const err = (b - a) / 2;
    rows.push({ i, a, b, c, fc, err });

    if (err < tol || Math.abs(fc) < 1e-14) {
      return { root: c, fx: fc, iterations: i, error: err, rows, method: 'bisection' };
    }
    if (f(a) * fc < 0) b = c; else a = c;
  }
  return { root: c, fx: f(c), iterations: maxIt, error: (b - a) / 2, rows, method: 'bisection', warning: 'Max iterations reached.' };
}

// ─── Secant Method ────────────────────────────────────────
function solveSecant(fnStr) {
  let x0 = parseFloat(document.getElementById('secX0').value);
  let x1 = parseFloat(document.getElementById('secX1').value);
  const tol = parseFloat(document.getElementById('secTol').value) || 1e-6;
  const maxIt = parseInt(document.getElementById('secMax').value) || 50;

  if (isNaN(x0) || isNaN(x1)) throw new Error("Enter both initial guesses x₀ and x₁.");

  const f = x => evaluate(fnStr, x);
  const rows = [];

  for (let i = 1; i <= maxIt; i++) {
    const f0 = f(x0), f1 = f(x1);
    const denom = f1 - f0;
    if (Math.abs(denom) < 1e-14) throw new Error(`Division by zero at iteration ${i}. Try different initial guesses.`);

    const x2 = x1 - f1 * (x1 - x0) / denom;
    const err = Math.abs(x2 - x1);
    rows.push({ i, x0, x1, x2, fx2: f(x2), err });

    if (err < tol) {
      return { root: x2, fx: f(x2), iterations: i, error: err, rows, method: 'secant' };
    }
    x0 = x1; x1 = x2;
  }
  return { root: x1, fx: f(x1), iterations: maxIt, error: Math.abs(f(x1)), rows, method: 'secant', warning: 'Max iterations reached.' };
}

// ─── Evaluate helper ──────────────────────────────────────
function evaluate(expr, x) {
  try {
    return math.evaluate(expr, { x });
  } catch (e) {
    throw new Error(`Cannot evaluate expression: "${expr}". Check syntax.`);
  }
}

// ─── Display Results ──────────────────────────────────────
function displayResults(r) {
  const fmt = n => (typeof n === 'number' && isFinite(n)) ? n.toPrecision(10) : '—';

  [resRoot, resFx, resIter, resError].forEach(el => el.classList.remove('animate'));
  void resRoot.offsetWidth; // reflow for animation restart

  resRoot.textContent = fmt(r.root);
  resFx.textContent = fmt(r.fx);
  resIter.textContent = r.iterations;
  resError.textContent = r.error < 1e-14 ? '< 1e-14' : r.error.toExponential(4);

  [resRoot, resFx, resIter, resError].forEach(el => el.classList.add('animate'));

  rootDisplayEl.textContent = `Root: ${r.root.toPrecision(8)}`;
  iterCountEl.textContent = `${r.iterations} iterations`;

  if (r.warning) showError('⚠ ' + r.warning, true);
}

// ─── Build Iteration Table ────────────────────────────────
function buildTable(r) {
  tableTag.textContent = `${r.iterations} rows`;
  tableHead.innerHTML = '';
  tableBody.innerHTML = '';

  let heads, rowFn;

  if (r.method === 'newton') {
    heads = ['n', 'xₙ', 'f(xₙ)', "f'(xₙ)", 'Error'];
    rowFn = d => [d.i, d.xn.toPrecision(8), d.fx.toExponential(4), d.dfx.toPrecision(6), d.err.toExponential(4)];
  } else if (r.method === 'bisection') {
    heads = ['n', 'a', 'b', 'c', 'f(c)', 'Error'];
    rowFn = d => [d.i, d.a.toPrecision(8), d.b.toPrecision(8), d.c.toPrecision(8), d.fc.toExponential(4), d.err.toExponential(4)];
  } else {
    heads = ['n', 'x₀', 'x₁', 'x₂', 'f(x₂)', 'Error'];
    rowFn = d => [d.i, d.x0.toPrecision(8), d.x1.toPrecision(8), d.x2.toPrecision(8), d.fx2.toExponential(4), d.err.toExponential(4)];
  }

  const tr = document.createElement('tr');
  heads.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    tr.appendChild(th);
  });
  tableHead.appendChild(tr);

  r.rows.forEach((d, idx) => {
    const row = document.createElement('tr');
    const cells = rowFn(d);
    cells.forEach((c, ci) => {
      const td = document.createElement('td');
      td.textContent = c;
      // Highlight last error cell if it's the final converged row
      if (idx === r.rows.length - 1 && ci === cells.length - 1) td.classList.add('highlight');
      row.appendChild(td);
    });
    tableBody.appendChild(row);
  });

  // Scroll to last row
  tableBody.lastChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('exportCsvBtn').addEventListener('click', () => {
  if (!lastResult || !lastResult.rows || lastResult.rows.length === 0) return;
  
  let csv = '';
  // Headers
  const heads = Array.from(tableHead.querySelectorAll('th')).map(th => th.textContent);
  csv += heads.join(',') + '\n';
  
  // Rows
  lastResult.rows.forEach(d => {
    let rowVals;
    if (lastResult.method === 'newton') rowVals = [d.i, d.xn, d.fx, d.dfx, d.err];
    else if (lastResult.method === 'bisection') rowVals = [d.i, d.a, d.b, d.c, d.fc, d.err];
    else rowVals = [d.i, d.x0, d.x1, d.x2, d.fx2, d.err];
    csv += rowVals.join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nbs_solver_${lastResult.method}_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ─── Graph ────────────────────────────────────────────────
function drawGraph(fnStr, root) {
  placeholder.classList.add('hidden');
  resizeCanvas();

  const W = canvas.width;
  const H = canvas.height;
  const f = x => evaluate(fnStr, x);

  // Center around root
  graphOffsetX = root;
  graphOffsetY = 0;

  renderGraph(fnStr, root, W, H);
}

function renderGraph(fnStr, root, W, H) {
  if (!fnStr) return;
  const f = x => { try { return evaluate(fnStr, x); } catch { return NaN; } };

  ctx.clearRect(0, 0, W, H);

  const range = graphRange;
  const xMin = graphOffsetX - range;
  const xMax = graphOffsetX + range;
  const toCanvasX = x => ((x - xMin) / (xMax - xMin)) * W;
  const toCanvasY = y => H / 2 - (y / (range * 0.6)) * (H / 2) + (graphOffsetY * H / (range * 1.2));

  const isLight = document.body.classList.contains('light-mode');

  // Background grid
  ctx.fillStyle = isLight ? '#ffffff' : '#1a1f2e';
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = isLight ? 'rgba(203,213,225,0.8)' : 'rgba(37,45,64,0.8)';
  ctx.lineWidth = 1;
  const step = range / 5;
  for (let x = Math.ceil(xMin / step) * step; x <= xMax; x += step) {
    ctx.beginPath();
    ctx.moveTo(toCanvasX(x), 0);
    ctx.lineTo(toCanvasX(x), H);
    ctx.stroke();
  }
  const yRange = range * 0.6;
  for (let y = -yRange * 2; y <= yRange * 2; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, toCanvasY(y));
    ctx.lineTo(W, toCanvasY(y));
    ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = isLight ? 'rgba(148,163,184,0.9)' : 'rgba(72,85,110,0.9)';
  ctx.lineWidth = 1.5;
  const x0px = toCanvasX(0);
  const y0px = toCanvasY(0);
  ctx.beginPath(); ctx.moveTo(x0px, 0); ctx.lineTo(x0px, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, y0px); ctx.lineTo(W, y0px); ctx.stroke();

  // Axis labels
  ctx.fillStyle = isLight ? '#64748b' : '#4e5a70';
  ctx.font = '10px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  for (let x = Math.ceil(xMin / step) * step; x <= xMax; x += step) {
    if (Math.abs(x) > 0.001) {
      ctx.fillText(x.toPrecision(3), toCanvasX(x), y0px + 14);
    }
  }

  // Determine y scale from sample
  let yVals = [];
  const samples = 200;
  for (let i = 0; i <= samples; i++) {
    const x = xMin + (i / samples) * (xMax - xMin);
    const y = f(x);
    if (isFinite(y)) yVals.push(Math.abs(y));
  }
  const yMax = yVals.length ? Math.max(...yVals) * 1.2 : 10;
  const toCanvasYDyn = y => H / 2 - (y / yMax) * (H * 0.45);

  // Curve
  const accentColors = { newton: '#4f8ef7', bisection: '#34d399', secant: '#f59e0b' };
  const color = accentColors[currentMethod] || '#4f8ef7';

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  let penDown = false;
  for (let i = 0; i <= samples; i++) {
    const x = xMin + (i / samples) * (xMax - xMin);
    const y = f(x);
    const cx = toCanvasX(x);
    const cy = toCanvasYDyn(y);
    if (!isFinite(y) || Math.abs(cy) > H * 3) { penDown = false; continue; }
    if (!penDown) { ctx.moveTo(cx, cy); penDown = true; }
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // X-axis line for reference
  ctx.strokeStyle = 'rgba(72,85,110,0.5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, toCanvasYDyn(0));
  ctx.lineTo(W, toCanvasYDyn(0));
  ctx.stroke();
  ctx.setLineDash([]);

  // Root marker
  if (root !== undefined && isFinite(root)) {
    const rx = toCanvasX(root);
    const ry = toCanvasYDyn(0);

    // Vertical dashed line
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx, H); ctx.stroke();
    ctx.setLineDash([]);

    // Glow dot
    const grad = ctx.createRadialGradient(rx, ry, 0, rx, ry, 14);
    grad.addColorStop(0, color + 'aa');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(rx, ry, 14, 0, Math.PI * 2); ctx.fill();

    // Dot
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(rx, ry, 5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Label
    ctx.fillStyle = color;
    ctx.font = '600 11px Sora, sans-serif';
    ctx.textAlign = 'center';
    const labelX = Math.max(30, Math.min(W - 30, rx));
    ctx.fillText(`x ≈ ${root.toPrecision(6)}`, labelX, ry - 14);
  }

  // Draw method-specific visuals if solved
  if (lastResult && lastResult.rows.length > 0) {
    const lastRow = lastResult.rows[lastResult.rows.length - 1];
    if (currentMethod === 'newton' && lastRow.dfx !== undefined) {
      // Draw tangent line of final step
      const ptX = lastRow.xn;
      const ptY = lastRow.fx;
      const slope = lastRow.dfx;
      // line: y - ptY = slope * (x - ptX) => y = slope*(x - ptX) + ptY
      const lineF = x => slope * (x - ptX) + ptY;
      
      ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, toCanvasYDyn(lineF(xMin)));
      ctx.lineTo(W, toCanvasYDyn(lineF(xMax)));
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (currentMethod === 'bisection' && lastRow.a !== undefined) {
      // Draw brackets
      const drawBracket = (val, clr) => {
        if (!isFinite(val)) return;
        const vx = toCanvasX(val);
        ctx.strokeStyle = clr;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(vx, 0); ctx.lineTo(vx, H); ctx.stroke();
      };
      drawBracket(lastRow.a, 'rgba(248, 113, 113, 0.5)'); // Red lower bound
      drawBracket(lastRow.b, 'rgba(52, 211, 153, 0.5)');  // Green upper bound
    }
  }
}

// ─── Graph Controls ───────────────────────────────────────
document.getElementById('zoomIn').addEventListener('click', () => {
  graphRange = Math.max(0.5, graphRange * 0.7);
  redrawIfReady();
});

document.getElementById('zoomOut').addEventListener('click', () => {
  graphRange = Math.min(100, graphRange * 1.4);
  redrawIfReady();
});

document.getElementById('resetView').addEventListener('click', () => {
  graphRange = GRAPH_RANGE_DEFAULT;
  graphOffsetX = lastResult?.root ?? 0;
  graphOffsetY = 0;
  redrawIfReady();
});

// Panning
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  canvas.style.cursor = 'grabbing';
});

window.addEventListener('mouseup', () => {
  isDragging = false;
  canvas.style.cursor = 'default';
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging || !lastResult) return;
  const dx = e.clientX - lastMouseX;
  const dy = e.clientY - lastMouseY;
  
  const w = canvas.width;
  const h = canvas.height;
  
  graphOffsetX -= (dx / w) * (graphRange * 2);
  const yRange = graphRange * 0.6 * 2; 
  graphOffsetY += (dy / h) * yRange * 0.5;
  
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  redrawIfReady();
});

function redrawIfReady() {
  if (lastResult) renderGraph(funcInput.value.trim(), lastResult.root, canvas.width, canvas.height);
}

// ─── Canvas Resize ────────────────────────────────────────
function resizeCanvas() {
  const wrap = canvas.parentElement;
  canvas.width = wrap.clientWidth;
  canvas.height = wrap.clientHeight;
}

window.addEventListener('resize', () => {
  resizeCanvas();
  redrawIfReady();
});

// ─── Error / Clear Helpers ───────────────────────────────
function showError(msg, isWarn = false) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
  if (isWarn) errorMsg.style.background = 'rgba(245,158,11,0.1)';
  else errorMsg.style.background = 'rgba(248,113,113,0.1)';
}

function hideError() {
  errorMsg.classList.add('hidden');
}

function clearResults() {
  resRoot.textContent = resFx.textContent = resIter.textContent = resError.textContent = '—';
  iterCountEl.textContent = '— iterations';
  rootDisplayEl.textContent = 'Root: —';
  tableHead.innerHTML = '';
  tableBody.innerHTML = `<tr class="empty-row"><td colspan="6">No data yet — solve a function to see iterations.</td></tr>`;
  tableTag.textContent = '—';
  hideError();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  placeholder.classList.remove('hidden');
  lastResult = null;
  setStep(funcInput.value.trim() ? 2 : 1);
  document.querySelectorAll('.input-group input').forEach(i => i.classList.remove('error', 'valid'));
}

function clearAll() {
  funcInput.value = '';
  document.getElementById('derivInput').value = '';
  ['newtonX0', 'newtonTol', 'newtonMax', 'bisA', 'bisB', 'bisTol', 'bisMax', 'secX0', 'secX1', 'secTol', 'secMax']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el && !['newtonTol', 'bisTol', 'secTol', 'newtonMax', 'bisMax', 'secMax'].includes(id)) el.value = '';
    });
  clearResults();
}

// ─── Enter key to solve ───────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) solveBtn.click();
});

// ─── Theme Toggle ─────────────────────────────────────────
const themeToggleBtn = document.getElementById('themeToggle');
function setTheme(isLight) {
  if (isLight) {
    document.body.classList.add('light-mode');
    themeToggleBtn.textContent = '🌙';
  } else {
    document.body.classList.remove('light-mode');
    themeToggleBtn.textContent = '☀️';
  }
  localStorage.setItem('nbsTheme', isLight ? 'light' : 'dark');
  redrawIfReady(); // Update graph colors
}

themeToggleBtn.addEventListener('click', () => {
  setTheme(!document.body.classList.contains('light-mode'));
});

// ─── Init ─────────────────────────────────────────────────
const savedTheme = localStorage.getItem('nbsTheme');
if (savedTheme === 'light') setTheme(true);

document.body.classList.add(`method-${currentMethod}`);
resizeCanvas();
setStep(1);