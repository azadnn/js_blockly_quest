/* =====================================================================
 *  PYTHON QUEST: SPACE ACADEMY — application logic
 *  Sections: utils · storage · sound · engine · editor · blocks ·
 *            arena renderer · execution/stepping · UI · boot
 * ===================================================================== */
"use strict";

// ───────────────────────── 0. UTILITIES ─────────────────────────
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const HEAD = ["N", "E", "S", "W"];

/** Tiny Python syntax highlighter for lessons & cheat sheet (returns safe HTML). */
function highlightPy(src) {
  const re = /(#.*$)|(f?"(?:[^"\\\n]|\\.)*"|f?'(?:[^'\\\n]|\\.)*')|\b(\d+(?:\.\d+)?)\b|\b(if|elif|else|for|while|in|def|return|class|try|except|finally|break|continue|pass|and|or|not|True|False|None|import|from|as|lambda|with|is|global|raise|del)\b|\b(print|range|len|int|str|float|bool|list|dict|type|sum|max|min|abs|isinstance|enumerate|sorted|round)\b(?=\()|\b([A-Za-z_]\w*)(?=\()/gm;
  let out = "", last = 0, m;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    const cls = m[1] ? "tk-com" : m[2] ? "tk-str" : m[3] ? "tk-num" : m[4] ? "tk-kw" : m[5] ? "tk-bi" : "tk-fn";
    out += `<span class="${cls}">${esc(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  return out + esc(src.slice(last));
}

/** Minimal markdown: ~~~ code fences, "- " bullets, **bold**, `inline code`. */
function md(src) {
  const inline = (s) => {
    const codes = [];
    s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
    s = esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code class="ic">${esc(codes[+i])}</code>`);
  };
  const lines = src.split("\n"), out = [];
  for (let i = 0; i < lines.length; ) {
    const l = lines[i];
    if (l.trim() === "~~~") {
      const code = [];
      i++;
      while (i < lines.length && lines[i].trim() !== "~~~") code.push(lines[i++]);
      i++;
      out.push(`<pre class="code-block">${highlightPy(code.join("\n"))}</pre>`);
    } else if (/^- /.test(l)) {
      const items = [];
      while (i < lines.length && /^- /.test(lines[i])) items.push(`<li>${inline(lines[i++].slice(2))}</li>`);
      out.push(`<ul>${items.join("")}</ul>`);
    } else if (!l.trim()) i++;
    else {
      const para = [];
      while (i < lines.length && lines[i].trim() && lines[i].trim() !== "~~~" && !/^- /.test(lines[i])) para.push(lines[i++]);
      out.push(`<p>${inline(para.join(" "))}</p>`);
    }
  }
  return out.join("");
}

function toast(msg, kind = "info") {
  const colors = { info: "bg-slate-800 border-slate-600", success: "bg-emerald-900/90 border-emerald-600", warn: "bg-amber-900/90 border-amber-600", error: "bg-rose-900/90 border-rose-600" };
  const el = document.createElement("div");
  el.className = `toast text-xs text-white px-4 py-2.5 rounded-xl border shadow-xl ${colors[kind] || colors.info}`;
  el.textContent = msg;
  $("toasts").appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(() => el.remove(), 300); }, 2600);
}

// ───────────────────────── 1. STORAGE ─────────────────────────
const STORE_KEY = "pythonQuest.v1";
const DEFAULT_DATA = () => ({ current: 0, solved: {}, code: {}, hints: {}, seen: {}, muted: false, speed: 3 });
const Store = {
  data: DEFAULT_DATA(),
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (d && typeof d === "object") this.data = Object.assign(DEFAULT_DATA(), d);
    } catch { this.data = DEFAULT_DATA(); }
    this.data.current = clamp(this.data.current | 0, 0, LEVELS.length - 1);
    this.data.speed = clamp(this.data.speed | 0 || 3, 1, 5);
  },
  save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(this.data)); } catch { /* storage full / private mode */ } },
  wipe() { try { localStorage.removeItem(STORE_KEY); } catch {} this.data = DEFAULT_DATA(); },
  solvedCount() { return LEVELS.filter((l) => this.data.solved[l.id]).length; },
};
let saveTimer = null;
const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => Store.save(), 400); };

// ───────────────────────── 2. SOUND ─────────────────────────
const Sound = {
  ctx: null,
  get() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  },
  tone(freq, dur, type = "sine", vol = 0.06, delay = 0, slideTo = null) {
    const ctx = this.get(); if (!ctx) return;
    const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  play(kind) {
    if (Store.data.muted) return;
    switch (kind) {
      case "click": return this.tone(800, 0.06, "sine", 0.04);
      case "move": return this.tone(320, 0.16, "triangle", 0.07, 0, 160);
      case "turn": return this.tone(420, 0.12, "sine", 0.06, 0, 620);
      case "collect": this.tone(988, 0.1, "square", 0.04); return this.tone(1319, 0.16, "square", 0.04, 0.08);
      case "win": [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, "square", 0.045, i * 0.1)); return;
      case "crash": return this.tone(140, 0.45, "sawtooth", 0.13, 0, 25);
      case "error": return this.tone(180, 0.28, "square", 0.05, 0, 120);
      case "step": return this.tone(660, 0.04, "sine", 0.03);
    }
  },
};

// ───────────────────────── 3. PYTHON ENGINE (Pyodide in a Worker) ─────────────────────────
const Engine = {
  worker: null, ready: false, pending: new Map(), seq: 0, waiters: [],
  start() {
    this.ready = false;
    setEngineStatus("loading");
    this.worker = new Worker("worker.js");
    this.worker.onmessage = (e) => {
      const m = e.data;
      if (m.type === "ready") {
        this.ready = true; setEngineStatus("ready");
        this.waiters.splice(0).forEach((f) => f());
        return;
      }
      if (m.type === "fatal") { setEngineStatus("error", m.error); return; }
      const p = this.pending.get(m.id);
      if (!p) return;
      this.pending.delete(m.id); clearTimeout(p.timer);
      m.ok ? p.resolve(m.result) : p.reject(new Error(m.error));
    };
    this.worker.onerror = (e) => setEngineStatus("error", e.message || "Worker error");
    fetch("runtime.py")
      .then((r) => { if (!r.ok) throw new Error("runtime.py: HTTP " + r.status); return r.text(); })
      .then((runtime) => this.worker.postMessage({ type: "init", runtime }))
      .catch((err) => setEngineStatus("error", "Couldn't load runtime.py (" + err.message + ")"));
  },
  whenReady() { return this.ready ? Promise.resolve() : new Promise((r) => this.waiters.push(r)); },
  async call(fn, arg, timeoutMs = 0) {
    await this.whenReady();
    return new Promise((resolve, reject) => {
      const id = ++this.seq, p = { resolve, reject, timer: null };
      if (timeoutMs) p.timer = setTimeout(() => { this.pending.delete(id); this.restart(); reject(new Error("TIMEOUT")); }, timeoutMs);
      this.pending.set(id, p);
      this.worker.postMessage({ type: "call", id, fn, arg });
    });
  },
  restart() {
    try { this.worker.terminate(); } catch {}
    this.pending.forEach((p) => { clearTimeout(p.timer); p.reject(new Error("RESTART")); });
    this.pending.clear();
    this.start();
  },
};

function setEngineStatus(s, detail) {
  const el = $("engine-status");
  if (s === "ready") {
    el.className = "text-[10px] font-mono px-2.5 py-1 rounded-full border border-emerald-700/60 bg-emerald-900/20 text-emerald-300 flex items-center gap-1.5";
    el.innerHTML = '<i class="fa-brands fa-python"></i> Python ready';
    scheduleParse(0);
  } else if (s === "loading") {
    el.className = "text-[10px] font-mono px-2.5 py-1 rounded-full border border-amber-700/60 bg-amber-900/20 text-amber-300 flex items-center gap-1.5";
    el.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Loading Python…';
  } else {
    el.className = "text-[10px] font-mono px-2.5 py-1 rounded-full border border-rose-700/60 bg-rose-900/20 text-rose-300 flex items-center gap-1.5 cursor-pointer";
    el.innerHTML = '<i class="fa-solid fa-plug-circle-xmark"></i> Engine offline (retry)';
    el.title = detail || "";
    el.onclick = () => { el.onclick = null; Engine.restart(); };
    term(`Python engine failed to load: ${detail || "unknown error"}. Check your internet connection, then click the red status badge to retry.`, "error");
  }
}

// ───────────────────────── 4. EDITOR (Ace) ─────────────────────────
let editor, Range, execMarker = null, errorMarker = null, suppressChange = false;

function initEditor() {
  ace.config.set("basePath", "https://cdnjs.cloudflare.com/ajax/libs/ace/1.15.2/");
  Range = ace.require("ace/range").Range;
  editor = ace.edit("editor");
  editor.setTheme("ace/theme/monokai");
  editor.session.setMode("ace/mode/python");
  editor.session.setTabSize(4);
  editor.session.setUseSoftTabs(true);
  editor.setShowPrintMargin(false);
  editor.setOptions({ fontSize: "14px", fontFamily: "Fira Code, monospace", enableBasicAutocompletion: true, enableLiveAutocompletion: true, showFoldWidgets: false, highlightActiveLine: true, scrollPastEnd: 0.3 });

  // Autocomplete: game API + Python essentials
  const langTools = ace.require("ace/ext/language_tools");
  if (langTools) {
    const words = [...Object.keys(API_DOCS).map((k) => [k, "rocket"]),
      ...["range", "len", "int", "str", "float", "bool", "list", "dict", "sum", "max", "min", "abs", "type", "isinstance", "enumerate", "sorted", "round"].map((k) => [k, "built-in"]),
      ...["True", "False", "None", "and", "or", "not", "elif", "else", "while", "for", "in", "def", "return", "class", "try", "except", "break", "continue", "pass"].map((k) => [k, "keyword"])];
    langTools.setCompleters([langTools.keyWordCompleter, langTools.textCompleter, {
      getCompletions: (ed, sess, pos, prefix, cb) => cb(null, words.map(([w, meta]) => ({ caption: w, value: w, meta, score: meta === "rocket" ? 1000 : 500 }))),
    }]);
  }

  editor.commands.addCommand({ name: "run", bindKey: { win: "Ctrl-Enter", mac: "Command-Enter" }, exec: () => onRunClick(), readOnly: true });
  editor.commands.addCommand({ name: "step", bindKey: { win: "F10", mac: "F10" }, exec: () => onStepClick(), readOnly: true });
  editor.commands.addCommand({ name: "back", bindKey: { win: "Shift-F10", mac: "Shift-F10" }, exec: () => onBackClick(), readOnly: true });

  // Breakpoints: click a line number
  editor.on("guttermousedown", (e) => {
    const t = e.domEvent.target;
    if (!t.closest(".ace_gutter-cell")) return;
    const row = e.getDocumentPosition().row;
    const bps = editor.session.getBreakpoints();
    bps[row] ? editor.session.clearBreakpoint(row) : editor.session.setBreakpoint(row);
    e.stop();
  });

  editor.session.on("change", (delta) => {
    shiftBreakpoints(delta);
    if (suppressChange) return;
    clearErrorMarker();
    if (Exec.state === "done") resetExecution();
    Store.data.code[LEVELS[cur].id] = editor.getValue();
    saveSoon();
    scheduleParse();
  });
}

function shiftBreakpoints(delta) {
  const lines = delta.end.row - delta.start.row;
  if (!lines) return;
  const bps = editor.session.getBreakpoints(), keep = [];
  bps.forEach((c, row) => {
    if (!c) return;
    if (delta.action === "insert") keep.push(row > delta.start.row ? row + lines : row);
    else if (row > delta.end.row) keep.push(row - lines);
    else if (row <= delta.start.row) keep.push(row);
  });
  editor.session.clearBreakpoints();
  keep.forEach((r) => editor.session.setBreakpoint(r));
}
const breakpointLines = () => new Set(editor.session.getBreakpoints().map((c, r) => (c ? r + 1 : 0)).filter(Boolean));

function setCode(code) {
  suppressChange = true;
  editor.setValue(code, -1);
  editor.session.getUndoManager().reset();
  editor.session.clearBreakpoints();
  suppressChange = false;
  clearErrorMarker();
  scheduleParse(0);
}

function markExecLine(line) {
  if (execMarker !== null) editor.session.removeMarker(execMarker);
  execMarker = null;
  if (!line) return;
  execMarker = editor.session.addMarker(new Range(line - 1, 0, line - 1, 1), "ace-exec-line", "fullLine");
  editor.scrollToLine(line - 1, true, true, () => {});
}
function markErrorLine(line, text) {
  clearErrorMarker();
  if (!line) return;
  errorMarker = editor.session.addMarker(new Range(line - 1, 0, line - 1, 1), "ace-error-line", "fullLine");
  editor.session.setAnnotations([{ row: line - 1, column: 0, text, type: "error" }]);
  editor.scrollToLine(line - 1, true, true, () => {});
}
function clearErrorMarker() {
  if (errorMarker !== null) editor.session.removeMarker(errorMarker);
  errorMarker = null;
  editor && editor.session.setAnnotations([]);
}

// ───────────────────────── 5. BLOCKS (live, read-only) ─────────────────────────
let ws = null, lineMap = {}, lastAstKey = "", activeBlockId = null, errorBlockId = null, parseTimer = null, parseSeq = 0;

function initBlockly() {
  PyBlocks.register(Blockly);
  const theme = Blockly.Theme.defineTheme("pyquest", {
    name: "pyquest", base: Blockly.Themes.Classic,
    componentStyles: { workspaceBackgroundColour: "#070b16", scrollbarColour: "#334155", scrollbarOpacity: 0.7, flyoutBackgroundColour: "#0f172a" },
    fontStyle: { family: '"Fira Code", monospace', weight: "500", size: 11 },
  });
  ws = Blockly.inject("blocklyDiv", {
    readOnly: true, renderer: "zelos", theme, sounds: false, trashcan: false,
    move: { scrollbars: true, drag: true, wheel: true },
    zoom: { controls: true, wheel: false, startScale: 0.62, maxScale: 1.4, minScale: 0.3, scaleSpeed: 1.15 },
  });
  new ResizeObserver(() => Blockly.svgResize(ws)).observe($("blocklyDiv"));
}

function scheduleParse(delay = 250) {
  clearTimeout(parseTimer);
  parseTimer = setTimeout(parseNow, delay);
}

async function parseNow() {
  if (!editor || !ws) return;
  if (!Engine.ready) { $("blocks-status").textContent = "Waiting for Python…"; return; }
  const seq = ++parseSeq, code = editor.getValue();
  let res;
  try { res = JSON.parse(await Engine.call("parse_code", code)); } catch { return; }
  if (seq !== parseSeq) return; // stale
  const st = $("syntax-status");
  if (res.ok) {
    st.className = "text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-800 text-emerald-400 bg-emerald-950/30";
    st.innerHTML = '<i class="fa-solid fa-check mr-1"></i>Valid Python';
    $("blocks-panel").classList.remove("blocks-stale");
    $("blocks-overlay").classList.add("hidden");
    $("blocks-status").textContent = "Live Sync";
    if (!errorMarker) editor.session.setAnnotations([]);
    renderBlocks(res.ast);
  } else {
    const e = res.error;
    st.className = "text-[10px] font-mono px-2 py-0.5 rounded border border-rose-800 text-rose-300 bg-rose-950/30";
    st.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1"></i>${esc(e.kind)} · line ${e.line}`;
    editor.session.setAnnotations([{ row: e.line - 1, column: Math.max(0, e.col - 1), text: `${e.kind}: ${e.msg}\n ${e.hint}`, type: "error" }]);
    $("blocks-panel").classList.add("blocks-stale");
    $("blocks-overlay").classList.remove("hidden");
    $("blocks-overlay-text").innerHTML = ` Line ${e.line}: ${esc(e.msg)}<br><span class="text-rose-300/80"> ${esc(e.hint)}</span><br><span class="text-slate-400">Showing the last valid blocks.</span>`;
    $("blocks-status").textContent = "Paused (syntax error)";
  }
}

function renderBlocks(ast) {
  const key = JSON.stringify(ast);
  if (key === lastAstKey) return;
  lastAstKey = key;
  const { json, lineMap: lm, count } = PyBlocks.build(ast);
  lineMap = lm;
  const sx = ws.scrollX, sy = ws.scrollY, hadBlocks = ws.getTopBlocks(false).length > 0;
  Blockly.Events.disable();
  try { Blockly.serialization.workspaces.load(json, ws, { recordUndo: false }); }
  catch (err) { console.warn("Blockly render failed", err); }
  finally { Blockly.Events.enable(); }
  if (hadBlocks && typeof ws.scroll === "function") ws.scroll(sx, sy);
  $("blocks-empty").classList.toggle("hidden", count > 0);
  activeBlockId = errorBlockId = null;
}

function highlightBlockForLine(line, cls = "py-active") {
  const prevId = cls === "py-active" ? activeBlockId : errorBlockId;
  const prev = prevId && ws.getBlockById(prevId);
  if (prev && prev.getSvgRoot()) prev.getSvgRoot().classList.remove(cls);
  const id = line ? lineMap[line] : null;
  if (cls === "py-active") activeBlockId = id; else errorBlockId = id;
  const b = id && ws.getBlockById(id);
  if (!b || !b.getSvgRoot()) return;
  b.getSvgRoot().classList.add(cls);
  if (typeof ws.scrollBoundsIntoView === "function") { try { ws.scrollBoundsIntoView(b.getBoundingRectangle(), 30); } catch {} }
}

// ───────────────────────── 6. ARENA RENDERER (canvas) ─────────────────────────
const THEMES = [
  { bg: ["#121637", "#04050d"], lane: "99,102,241", rock: "#1e293b", rockEdge: "#0f172a" },
  { bg: ["#06324f", "#011526"], lane: "56,189,248", rock: "#0c3d5c", rockEdge: "#062033" },
  { bg: ["#3b0a0a", "#120202"], lane: "249,115,22", rock: "#5b1a12", rockEdge: "#2a0a06" },
  { bg: ["#1e3a8a", "#081836"], lane: "186,230,253", rock: "#29407a", rockEdge: "#152450" },
  { bg: ["#033a2c", "#011109"], lane: "16,185,129", rock: "#064e3b", rockEdge: "#022c22" },
  { bg: ["#5c2a0a", "#1f0c02"], lane: "252,211,77", rock: "#7c3a10", rockEdge: "#3b1a05" },
  { bg: ["#3b1580", "#14062e"], lane: "192,132,252", rock: "#4c1d95", rockEdge: "#2e1065" },
  { bg: ["#151d33", "#020617"], lane: "203,213,225", rock: "#334155", rockEdge: "#1e293b" },
];

const Arena = {
  canvas: null, ctx: null, dpr: 1, W: 0, H: 0, cell: 40, ox: 0, oy: 0, margin: 18,
  layout: null, grid: [], cols: 0, rows: 0, theme: THEMES[0], goal: null, start: null,
  rocket: { x: 0, y: 0, a: 0, trail: 0, visible: true }, crystals: new Set(), beacons: {},
  visited: [], particles: [], shake: 0, stars: [], rockSeeds: [],

  init() {
    this.canvas = $("arena"); this.ctx = this.canvas.getContext("2d");
    this.stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.3, p: Math.random() * 6 }));
    new ResizeObserver(() => this.resize()).observe($("canvas-wrap"));
    this.resize();
  },
  resize() {
    const wrap = $("canvas-wrap"), size = Math.max(200, Math.min(wrap.clientWidth - 24, wrap.clientHeight - 24));
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = this.canvas.style.height = size + "px";
    this.canvas.width = this.canvas.height = Math.round(size * this.dpr);
    this.W = this.H = size;
    this.layoutGeometry();
  },
  layoutGeometry() {
    if (!this.cols) return;
    const m = this.margin;
    this.cell = Math.floor(Math.min((this.W - m - 6) / this.cols, (this.H - m - 6) / this.rows));
    this.ox = m + Math.floor((this.W - m - this.cell * this.cols) / 2);
    this.oy = m + Math.floor((this.H - m - this.cell * this.rows) / 2);
  },
  setLayout(layout, themeIdx) {
    this.layout = layout; this.theme = THEMES[themeIdx % THEMES.length];
    this.grid = layout.grid; this.rows = this.grid.length; this.cols = this.grid[0].length;
    this.crystals = new Set(); this.goal = null;
    this.grid.forEach((row, y) => [...row].forEach((c, x) => {
      if (c === "S") this.start = [x, y];
      if (c === "G") this.goal = [x, y];
      if (c === "C") this.crystals.add(x + "," + y);
    }));
    if (layout.goal) this.goal = layout.goal;
    this.beacons = layout.beacons || {};
    this.rockSeeds = this.grid.map((row, y) => [...row].map((_, x) => {
      const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      return h - Math.floor(h);
    }));
    this.resetRocket();
    this.layoutGeometry();
  },
  resetRocket() {
    const d = HEAD.indexOf(this.layout.dir || "E");
    Object.assign(this.rocket, { x: this.start[0], y: this.start[1], a: dirAngle(d), dir: d, trail: 0, visible: true });
    this.crystals = new Set();
    this.grid.forEach((row, y) => [...row].forEach((c, x) => { if (c === "C") this.crystals.add(x + "," + y); }));
    this.visited = [[this.start[0], this.start[1]]];
    this.particles = []; this.shake = 0;
    updateCoords();
  },
  cx(x) { return this.ox + (x + 0.5) * this.cell; },
  cy(y) { return this.oy + (y + 0.5) * this.cell; },
  burst(x, y, colors, n = 26, speed = 2.2) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (0.3 + Math.random()) * speed;
      this.particles.push({ x: this.cx(x), y: this.cy(y), vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, c: colors[i % colors.length], r: 1.5 + Math.random() * 2.5 });
    }
  },

  draw(t) {
    const c = this.ctx, W = this.W, H = this.H, cs = this.cell, th = this.theme;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.shake > 0) { c.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake); this.shake *= 0.9; if (this.shake < 0.3) this.shake = 0; }
    const g = c.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.75);
    g.addColorStop(0, th.bg[0]); g.addColorStop(1, th.bg[1]);
    c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    for (const s of this.stars) { c.globalAlpha = 0.25 + Math.abs(Math.sin(t / 900 + s.p)) * 0.6; c.fillStyle = "#fff"; c.beginPath(); c.arc(s.x * W, s.y * H, s.r, 0, 7); c.fill(); }
    c.globalAlpha = 1;
    if (!this.cols) return;

    // axis labels (coordinates matter for get_position)
    c.font = `600 ${Math.max(8, Math.min(11, cs * 0.24))}px "Fira Code", monospace`;
    c.fillStyle = "rgba(148,163,184,.55)"; c.textAlign = "center"; c.textBaseline = "middle";
    for (let x = 0; x < this.cols; x++) c.fillText(x, this.cx(x), this.oy - 9);
    for (let y = 0; y < this.rows; y++) c.fillText(y, this.ox - 9, this.cy(y));

    // tiles
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      const ch = this.grid[y][x], px = this.ox + x * cs, py = this.oy + y * cs;
      if (ch !== "#") {
        c.fillStyle = `rgba(${th.lane},.10)`; c.fillRect(px + 1, py + 1, cs - 2, cs - 2);
        c.strokeStyle = `rgba(${th.lane},.28)`; c.lineWidth = 1; c.strokeRect(px + 1.5, py + 1.5, cs - 3, cs - 3);
        c.fillStyle = `rgba(${th.lane},.45)`; c.fillRect(px + cs / 2 - 1, py + cs / 2 - 1, 2, 2);
      } else {
        const r = this.rockSeeds[y][x];
        c.save(); c.translate(px + cs / 2, py + cs / 2); c.rotate(r * 6 + t / (9000 + r * 9000));
        c.fillStyle = th.rock; c.strokeStyle = th.rockEdge; c.lineWidth = 2;
        c.beginPath();
        const sides = 6 + Math.floor(r * 3), rad = cs * (0.3 + r * 0.1);
        for (let i = 0; i < sides; i++) { const a = (i / sides) * Math.PI * 2, rr = rad * (0.85 + 0.15 * Math.sin(i * 2.3 + r * 9)); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        c.closePath(); c.fill(); c.stroke();
        c.fillStyle = th.rockEdge; c.beginPath(); c.arc(-cs * 0.09, -cs * 0.07, cs * 0.07, 0, 7); c.fill();
        c.beginPath(); c.arc(cs * 0.1, cs * 0.08, cs * 0.04, 0, 7); c.fill();
        c.restore();
      }
    }

    // start pad
    if (this.start) { c.strokeStyle = "rgba(148,163,184,.35)"; c.setLineDash([3, 3]); c.beginPath(); c.arc(this.cx(this.start[0]), this.cy(this.start[1]), cs * 0.36, 0, 7); c.stroke(); c.setLineDash([]); }

    // flight trail
    if (this.visited.length > 1) {
      c.strokeStyle = "rgba(34,211,238,.35)"; c.lineWidth = Math.max(2, cs * 0.07); c.lineJoin = "round"; c.setLineDash([cs * 0.12, cs * 0.12]);
      c.beginPath(); this.visited.forEach(([x, y], i) => (i ? c.lineTo(this.cx(x), this.cy(y)) : c.moveTo(this.cx(x), this.cy(y))));
      c.lineTo(this.cx(this.rocket.x), this.cy(this.rocket.y)); c.stroke(); c.setLineDash([]);
    }

    // portal
    if (this.goal) {
      const gx = this.cx(this.goal[0]), gy = this.cy(this.goal[1]);
      c.save(); c.translate(gx, gy);
      const pg = c.createRadialGradient(0, 0, 0, 0, 0, cs * 0.45);
      pg.addColorStop(0, "#ffffff"); pg.addColorStop(0.35, "#a78bfa"); pg.addColorStop(1, "rgba(139,92,246,0)");
      c.fillStyle = pg; c.beginPath(); c.arc(0, 0, cs * 0.45, 0, 7); c.fill();
      c.rotate(t / 400); c.strokeStyle = "rgba(216,180,254,.9)"; c.lineWidth = 2;
      for (let i = 0; i < 3; i++) { c.rotate(Math.PI * 2 / 3); c.beginPath(); c.arc(0, 0, cs * 0.32, 0, 1.4); c.stroke(); }
      c.restore();
    }

    // beacons
    for (const key in this.beacons) {
      const [bx, by] = key.split(",").map(Number), x = this.cx(bx), y = this.cy(by), pulse = (t / 1200) % 1;
      c.strokeStyle = `rgba(250,204,21,${0.8 - pulse * 0.8})`; c.lineWidth = 2; c.beginPath(); c.arc(x, y, cs * (0.15 + pulse * 0.3), 0, 7); c.stroke();
      c.fillStyle = "#facc15"; c.beginPath(); c.arc(x, y, cs * 0.08, 0, 7); c.fill();
      let label = String(this.beacons[key]); if (label.length > 9) label = label.slice(0, 8) + "…";
      c.font = `600 ${Math.max(8, Math.min(12, cs * 0.24))}px "Fira Code", monospace`;
      const tw = c.measureText(label).width + 8, ly = y - cs * 0.5 + 2;
      c.fillStyle = "rgba(15,23,42,.92)"; c.strokeStyle = "rgba(250,204,21,.7)"; c.lineWidth = 1;
      c.beginPath(); c.roundRect ? c.roundRect(x - tw / 2, ly - 7, tw, 14, 4) : c.rect(x - tw / 2, ly - 7, tw, 14); c.fill(); c.stroke();
      c.fillStyle = "#fde68a"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(label, x, ly + 0.5);
    }

    // crystals
    for (const key of this.crystals) {
      const [kx, ky] = key.split(",").map(Number), x = this.cx(kx), y = this.cy(ky) + Math.sin(t / 300 + kx + ky) * cs * 0.04, s = cs * 0.2;
      c.save(); c.shadowBlur = 12; c.shadowColor = "#22d3ee";
      const cg = c.createLinearGradient(x, y - s, x, y + s); cg.addColorStop(0, "#a5f3fc"); cg.addColorStop(1, "#d946ef");
      c.fillStyle = cg; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.7, y); c.lineTo(x, y + s); c.lineTo(x - s * 0.7, y); c.closePath(); c.fill();
      c.restore();
    }

    // rocket
    const R = this.rocket;
    if (R.visible) {
      c.save(); c.translate(this.cx(R.x), this.cy(R.y)); c.rotate(R.a);
      if (R.trail > 0.02) {
        c.fillStyle = `rgba(251,146,60,${R.trail})`; c.beginPath();
        c.moveTo(-cs * 0.18, -cs * 0.08); c.lineTo(-cs * (0.45 + Math.random() * 0.15), 0); c.lineTo(-cs * 0.18, cs * 0.08); c.fill();
      }
      c.shadowBlur = 10; c.shadowColor = "#38bdf8";
      c.fillStyle = "#f8fafc"; c.beginPath();
      c.moveTo(cs * 0.32, 0); c.lineTo(-cs * 0.2, cs * 0.21); c.lineTo(-cs * 0.1, 0); c.lineTo(-cs * 0.2, -cs * 0.21); c.closePath(); c.fill();
      c.shadowBlur = 0; c.fillStyle = "#06b6d4"; c.beginPath(); c.arc(cs * 0.06, 0, cs * 0.065, 0, 7); c.fill();
      c.restore();
    }

    // particles
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; p.life -= 0.022;
      c.globalAlpha = Math.max(0, p.life); c.fillStyle = p.c; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill();
    }
    c.globalAlpha = 1;
  },
};

const dirAngle = (d) => [-Math.PI / 2, 0, Math.PI / 2, Math.PI][d];
function updateCoords() {
  const R = Arena.rocket;
  $("coords").textContent = `Pos (${Math.round(R.x)}, ${Math.round(R.y)}) · ${HEAD[R.dir ?? 1]}`;
}
function frame(t) { Arena.draw(t); requestAnimationFrame(frame); }

// ───────────────────────── 7. EXECUTION ENGINE (run · step · back · breakpoints) ─────────────────────────
/*  The learner's program runs once (in Python) and produces a TIMELINE of events:
 *    line   → "about to run line N" (+ variable snapshot)
 *    move/turn/collect/print/crash/error → effects
 *  The UI replays that timeline: animated (Run), one line at a time (Step),
 *  or rebuilt instantly up to an earlier line (Back).                         */
const Exec = { state: "idle", token: 0, result: null, events: [], ptr: 0, busy: false, prevVars: {}, linesSeen: 0, totalLines: 0 };
let cur = 0, layoutIdx = 0, layoutResults = [];

const SPEED = { move: [560, 360, 220, 120, 45], line: [480, 280, 140, 55, 8] };
const spd = () => Store.data.speed - 1;

function tween(ms, fn, tok) {
  return new Promise((res) => {
    if (ms <= 0) { fn(1); return res(); }
    const t0 = performance.now();
    const tick = (now) => {
      if (tok !== Exec.token) return res();
      const p = Math.min(1, (now - t0) / ms), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      fn(e);
      p < 1 ? requestAnimationFrame(tick) : res();
    };
    requestAnimationFrame(tick);
  });
}

function levelSpec(lv) {
  const { requires, forbid, maxCalls, checks, expectOutput, needGoal, collectAll } = lv;
  return { requires, forbid, maxCalls, checks, expectOutput, needGoal, collectAll };
}

async function compileAndRun() {
  const lv = LEVELS[cur];
  if (!Engine.ready) { term("The Python engine is still loading. Your program will run as soon as it's ready…", "warn"); }
  setExecStatus("Compiling…");
  let res;
  try {
    const payload = JSON.stringify({ code: editor.getValue(), level: levelSpec(lv), layouts: lv.layouts });
    res = JSON.parse(await Engine.call("run_level", payload, 15000));
  } catch (err) {
    if (err.message === "TIMEOUT") {
      term(" Your program took longer than 15 seconds and was stopped. Is there a loop that never ends, or a huge calculation? The Python engine is restarting…", "error");
      Sound.play("error");
    } else if (err.message !== "RESTART") term("Engine error: " + err.message, "error");
    setExecStatus("Ready");
    return null;
  }
  if (res.syntax) {
    const e = res.syntax;
    term(` ${e.kind} on line ${e.line}: ${e.msg}`, "error");
    if (e.hint) term(` ${e.hint}`, "hint");
    markErrorLine(e.line, `${e.kind}: ${e.msg}`);
    Sound.play("error");
    setExecStatus("Syntax error");
    return null;
  }
  return res;
}

function setControls() {
  const s = Exec.state;
  const run = $("btn-run");
  run.querySelector("span").textContent = s === "running" ? "Pause" : s === "paused" ? "Continue" : "Run";
  run.querySelector("i").className = s === "running" ? "fa-solid fa-pause" : "fa-solid fa-play";
  $("btn-step").disabled = s === "running" || Exec.busy;
  const atStart = Exec.linesSeen <= 1;
  $("btn-back").disabled = !(s === "paused" || s === "done") || atStart || Exec.busy || !Exec.events.length;
  $("btn-stop").disabled = s === "idle";
  editor.setReadOnly(s === "running" || s === "paused");
  document.querySelectorAll(".layout-tab").forEach((b) => (b.disabled = s === "running" || s === "paused"));
}
function setExecStatus(text) { $("exec-status").textContent = text; }

async function beginExecution(stepMode) {
  Sound.get();
  clearErrorMarker();
  const levelAtStart = cur, layoutAtStart = layoutIdx;
  Exec.busy = true; setControls();
  let res;
  try { res = await compileAndRun(); } finally { Exec.busy = false; setControls(); }
  if (!res || levelAtStart !== cur || layoutAtStart !== layoutIdx || Exec.state !== "idle") return;
  Exec.result = res;
  layoutResults = res.layouts.map((l) => l.success && !res.static.length);
  loadTimeline();
  $("terminal").innerHTML = "";
  term(` Running on layout ${layoutIdx + 1}${LEVELS[cur].layouts.length > 1 ? " of " + LEVELS[cur].layouts.length : ""}…`, "system");
  if (stepMode) { Exec.state = "paused"; setControls(); showTab("memory"); await stepForward(); }
  else { Exec.state = "running"; setControls(); play(); }
}

function loadTimeline() {
  Exec.events = Exec.result.layouts[layoutIdx].events;
  Exec.ptr = 0; Exec.prevVars = {}; Exec.linesSeen = 0;
  Exec.totalLines = Exec.events.filter((e) => e.t === "line").length;
  Exec.token++;
  Arena.resetRocket();
  renderMemory(null);
}

async function play() {
  const tok = Exec.token, bps = breakpointLines();
  while (Exec.state === "running" && tok === Exec.token) {
    if (Exec.ptr >= Exec.events.length) return finish();
    const ev = Exec.events[Exec.ptr++];
    await applyEvent(ev, true, tok);
    if (tok !== Exec.token) return;
    if (ev.t === "line") {
      if (bps.has(ev.line)) {
        Exec.state = "paused"; setControls(); showTab("memory");
        term(` Paused at breakpoint on line ${ev.line}. Press Step or Continue.`, "warn");
        return;
      }
      await sleep(SPEED.line[spd()]);
    }
  }
}

async function stepForward() {
  if (Exec.busy) return;
  Exec.busy = true; setControls();
  const tok = Exec.token;
  Sound.play("step");
  while (Exec.ptr < Exec.events.length && tok === Exec.token) {
    const ev = Exec.events[Exec.ptr++];
    await applyEvent(ev, true, tok);
    if (ev.t === "line") break;
  }
  Exec.busy = false;
  if (tok !== Exec.token) return;
  if (Exec.ptr >= Exec.events.length) finish(); else setControls();
}

function stepBack() {
  const idx = [];
  for (let i = 0; i < Exec.ptr; i++) if (Exec.events[i].t === "line") idx.push(i);
  if (idx.length < 2) return;
  const target = idx[idx.length - 2];
  Exec.token++;
  Arena.resetRocket();
  Exec.prevVars = {}; Exec.linesSeen = 0;
  $("terminal").innerHTML = "";
  hideOutcomeMarkers();
  for (let i = 0; i <= target; i++) applyEvent(Exec.events[i], false, Exec.token);
  Exec.ptr = target + 1;
  Exec.state = "paused";
  term(` Rewound to line ${Exec.events[target].line}.`, "system");
  setControls();
}

function hideOutcomeMarkers() { clearErrorMarker(); highlightBlockForLine(null, "py-error"); }

/** Apply one timeline event. animate=false is used for instant rebuilds (Back). */
async function applyEvent(ev, animate, tok) {
  const R = Arena.rocket;
  switch (ev.t) {
    case "line":
      Exec.linesSeen++;
      markExecLine(ev.line);
      highlightBlockForLine(ev.line);
      renderMemory(ev);
      setExecStatus(`Line ${ev.line} · step ${Exec.linesSeen}/${Exec.totalLines}${ev.scope !== "<module>" ? " · in " + ev.scope + "()" : ""}`);
      break;
    case "move": {
      const [fx, fy] = ev.from, [tx, ty] = ev.to;
      if (animate) {
        Sound.play("move");
        await tween(SPEED.move[spd()], (p) => { R.x = fx + (tx - fx) * p; R.y = fy + (ty - fy) * p; R.trail = 1 - p * 0.6; }, tok);
      }
      R.x = tx; R.y = ty; R.trail = 0;
      Arena.visited.push([tx, ty]);
      updateCoords();
      break;
    }
    case "turn": {
      const a0 = dirAngle(ev.from), a1 = a0 + ev.delta * (Math.PI / 2);
      if (animate) { Sound.play("turn"); await tween(SPEED.move[spd()] * 0.7, (p) => { R.a = a0 + (a1 - a0) * p; }, tok); }
      R.a = dirAngle(ev.to); R.dir = ev.to;
      updateCoords();
      break;
    }
    case "collect":
      Arena.crystals.delete(ev.at.join(","));
      if (animate) { Sound.play("collect"); Arena.burst(ev.at[0], ev.at[1], ["#a5f3fc", "#e879f9", "#fff"], 18, 1.8); }
      term(` Crystal collected at (${ev.at[0]}, ${ev.at[1]})`, "success");
      break;
    case "print":
      ev.text.replace(/\n$/, "").split("\n").forEach((ln) => term(ln, "output"));
      break;
    case "crash": {
      const [fx, fy] = ev.from, [tx, ty] = ev.to;
      if (animate) await tween(SPEED.move[spd()] * 0.5, (p) => { R.x = fx + (tx - fx) * p * 0.45; R.y = fy + (ty - fy) * p * 0.45; }, tok);
      R.visible = false;
      if (animate) { Sound.play("crash"); Arena.burst(fx + (tx - fx) * 0.45, fy + (ty - fy) * 0.45, ["#f97316", "#facc15", "#ef4444", "#fff"], 40, 3); Arena.shake = 10; }
      const off = tx < 0 || ty < 0 || ty >= Arena.rows || tx >= Arena.cols;
      term(` CRASH! The rocket hit ${off ? "the edge of the map" : "an asteroid"} at (${tx}, ${ty}). Check your moves and turns just before this.`, "error");
      const lastLine = lastLineEvent();
      if (lastLine) highlightBlockForLine(lastLine, "py-error");
      break;
    }
    case "error":
      if (animate) Sound.play("error");
      term(` ${ev.kind}${ev.line ? " on line " + ev.line : ""}: ${ev.msg}`, "error");
      if (ev.hint) term(` ${ev.hint}`, "hint");
      if (ev.line) { markErrorLine(ev.line, `${ev.kind}: ${ev.msg}`); highlightBlockForLine(ev.line, "py-error"); }
      break;
  }
}
function lastLineEvent() {
  for (let i = Exec.ptr - 1; i >= 0; i--) if (Exec.events[i].t === "line") return Exec.events[i].line;
  return null;
}

function finish() {
  Exec.state = "done";
  markExecLine(null); highlightBlockForLine(null);
  setControls();
  const lv = LEVELS[cur], res = Exec.result, lr = res.layouts[layoutIdx];
  renderLayoutTabs();
  setExecStatus(lr.success && !res.static.length ? "Finished ✓" : "Finished");
  if (lr.error || lr.crashed) { setExecStatus(lr.crashed ? "Crashed" : "Error"); return; }

  const problems = [...res.static, ...lr.failures];
  if (problems.length) {
    Sound.play("error");
    term("Mission not complete yet:", "warn");
    problems.forEach((p) => term("• " + p, "warn"));
    return;
  }
  const failingIdx = res.layouts.findIndex((l) => !l.success);
  if (failingIdx >= 0) {
    const fl = res.layouts[failingIdx];
    const why = fl.error ? `${fl.error.kind}: ${fl.error.msg}` : fl.crashed ? "the rocket crashes" : fl.failures[0];
    term(` Layout ${layoutIdx + 1} works, but layout ${failingIdx + 1} fails (${why}). Your code has to work on every layout. Switched to layout ${failingIdx + 1}: press Run to watch.`, "warn");
    Sound.play("error");
    selectLayout(failingIdx);
    return;
  }
  // cleared
  const firstClear = !Store.data.solved[lv.id];
  Store.data.solved[lv.id] = true;
  Store.save();
  Sound.play("win");
  term(` MISSION ${lv.number} CLEARED${lv.layouts.length > 1 ? ` (all ${lv.layouts.length} layouts passed)` : ""}!`, "success");
  updateProgressUI();
  showSuccess(lr, firstClear);
}

function resetExecution() {
  Exec.token++;
  Exec.state = "idle"; Exec.busy = false; Exec.events = []; Exec.ptr = 0; Exec.linesSeen = 0;
  markExecLine(null); highlightBlockForLine(null); highlightBlockForLine(null, "py-error");
  if (Arena.layout) Arena.resetRocket();
  setExecStatus("Ready");
  setControls();
}

// Button handlers
function onRunClick() {
  Sound.play("click");
  if (Exec.busy) return;
  if (Exec.state === "running") { Exec.state = "paused"; setControls(); showTab("memory"); term(" Paused. Step through, or press Continue.", "system"); return; }
  if (Exec.state === "paused") { Exec.state = "running"; setControls(); play(); return; }
  resetExecution(); beginExecution(false);
}
function onStepClick() {
  if (Exec.state === "running" || Exec.busy) return;
  if (Exec.state === "paused") return stepForward();
  resetExecution(); beginExecution(true);
}
function onBackClick() { if (!$("btn-back").disabled) { Sound.play("step"); stepBack(); } }
function onStopClick() { Sound.play("click"); if (Exec.state !== "idle") term("■ Stopped. The rocket is back at the start.", "system"); resetExecution(); hideOutcomeMarkers(); }

// ───────────────────────── 8. UI: terminal, memory, level loading, modals ─────────────────────────
function term(msg, kind = "info") {
  const box = $("terminal"), el = document.createElement("div");
  const cls = { error: "text-rose-400 font-semibold", success: "text-emerald-400 font-semibold", warn: "text-amber-300", hint: "text-sky-300", output: "text-slate-100", system: "text-indigo-300/80" };
  el.className = "term-line " + (cls[kind] || "text-slate-400");
  el.textContent = (kind === "output" ? "› " : "") + msg;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  if (kind === "error") showTab("terminal");
}

function showTab(which) {
  const on = "text-[10px] font-bold uppercase tracking-wider pb-0.5 border-b-2 border-cyan-400 text-cyan-400";
  const off = "text-[10px] font-bold uppercase tracking-wider pb-0.5 border-b-2 border-transparent text-slate-500 hover:text-slate-300";
  $("tab-terminal").className = which === "terminal" ? on : off;
  $("tab-memory").className = which === "memory" ? on : off;
  $("terminal").classList.toggle("hidden", which !== "terminal");
  $("memory").classList.toggle("hidden", which !== "memory");
}

const TYPE_COLORS = { int: "#fb923c", float: "#f59e0b", str: "#fbbf24", bool: "#34d399", list: "#a78bfa", dict: "#c084fc", tuple: "#818cf8", NoneType: "#94a3b8", function: "#f472b6", class: "#f472b6", set: "#a78bfa" };
function renderMemory(ev) {
  const box = $("memory");
  if (!ev) {
    box.innerHTML = `<p class="text-slate-500">Press <b class="text-amber-300">Step</b> to run one line at a time. Your variables will appear here, and changed values flash yellow.</p>`;
    $("mem-count").textContent = "";
    return;
  }
  const vars = ev.vars || {}, names = Object.keys(vars), prev = Exec.prevVars[ev.scope] || {};
  const rows = names.map((k) => {
    const [r, t] = vars[k], changed = !prev[k] || prev[k][0] !== r, color = TYPE_COLORS[t] || "#94a3b8";
    return `<tr class="mem-row ${changed ? "changed" : ""} border-b border-slate-800/70">
      <td class="py-1 pr-2 text-sky-300 align-top">${esc(k)}</td>
      <td class="py-1 pr-2 text-emerald-300 break-all">${esc(r)}</td>
      <td class="py-1 text-right align-top"><span class="type-chip" style="color:${color};border-color:${color}55">${esc(t)}</span></td></tr>`;
  }).join("");
  Exec.prevVars[ev.scope] = vars;
  const scope = ev.scope === "<module>" ? "global (main program)" : `inside ${ev.scope}()`;
  box.innerHTML = `<div class="flex justify-between text-[10px] text-slate-500 mb-1.5"><span>Scope: <b class="text-indigo-300">${esc(scope)}</b></span><span>about to run line <b class="text-amber-300">${ev.line}</b></span></div>` +
    (names.length ? `<table class="w-full"><tbody>${rows}</tbody></table>` : `<p class="text-slate-600">No variables yet.</p>`);
  $("mem-count").textContent = names.length ? `(${names.length})` : "";
}

function renderApiChips(lv) {
  const box = $("api-chips");
  box.innerHTML = "";
  lv.api.forEach((name) => {
    const d = API_DOCS[name]; if (!d) return;
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = d.sig;
    chip.title = d.desc + "\n(click to insert)";
    chip.onclick = () => {
      if (editor.getReadOnly()) return toast("Stop the program before editing.", "warn");
      Sound.play("click");
      const pos = editor.getCursorPosition(), line = editor.session.getLine(pos.row);
      const indent = (line.match(/^\s*/) || [""])[0];
      if (line.trim()) { editor.navigateLineEnd(); editor.insert("\n" + indent + d.insert); }
      else editor.insert(d.insert);
      editor.focus();
    };
    box.appendChild(chip);
  });
}

function renderLayoutTabs() {
  const lv = LEVELS[cur], box = $("layout-tabs");
  box.innerHTML = "";
  if (lv.layouts.length < 2) return;
  lv.layouts.forEach((_, i) => {
    const b = document.createElement("button");
    const r = layoutResults[i];
    b.className = `layout-tab btn text-[10px] font-mono px-2 py-0.5 rounded-md border border-slate-700 text-slate-400 hover:text-white ${i === layoutIdx ? "active" : ""}`;
    b.innerHTML = `L${i + 1}${r === true ? ' <i class="fa-solid fa-check text-emerald-400"></i>' : r === false ? ' <i class="fa-solid fa-xmark text-rose-400"></i>' : ""}`;
    b.title = `Layout ${i + 1}. Your code must work on every layout.`;
    b.onclick = () => { Sound.play("click"); selectLayout(i); };
    box.appendChild(b);
  });
  setControls();
}

function selectLayout(i) {
  layoutIdx = i;
  resetExecution();
  Arena.setLayout(LEVELS[cur].layouts[i], CHAPTERS[LEVELS[cur].chapter].theme);
  renderLayoutTabs();
}

function loadLevel(index, { showLesson = true } = {}) {
  index = clamp(index, 0, LEVELS.length - 1);
  cur = index; layoutIdx = 0; layoutResults = [];
  Store.data.current = index; Store.save();
  const lv = LEVELS[index], ch = CHAPTERS[lv.chapter];

  $("hdr-chapter").textContent = `Ch ${lv.chapter + 1} · ${ch.title}`;
  $("hdr-mission").textContent = `Mission ${lv.number}/${LEVELS.length}`;
  $("mission-badge").textContent = `Mission ${lv.number}`;
  $("mission-debug").classList.toggle("hidden", !lv.debug);
  $("mission-concept").textContent = lv.concept;
  $("mission-title").textContent = lv.title + (Store.data.solved[lv.id] ? "  ✓" : "");
  $("mission-task").textContent = lv.task + (lv.layouts.length > 1 ? `  (${lv.layouts.length} layouts: your code must pass all of them)` : "");
  renderApiChips(lv);

  resetExecution();
  Arena.setLayout(lv.layouts[0], ch.theme);
  renderLayoutTabs();
  lastAstKey = "";
  setCode(Store.data.code[lv.id] ?? lv.starter);

  $("terminal").innerHTML = "";
  term(`Mission ${lv.number}: ${lv.title}. Press Run (Ctrl+Enter) to fly, or Step (F10) to go line by line.`, "system");
  renderMemory(null);
  showTab("terminal");
  updateProgressUI();
  renderMap();
  if (showLesson && !Store.data.seen[lv.id]) { Store.data.seen[lv.id] = true; Store.save(); openLesson(); }
}

function updateProgressUI() {
  const n = Store.solvedCount();
  $("hdr-progress").style.width = `${(n / LEVELS.length) * 100}%`;
  $("drawer-progress").textContent = `${n} / ${LEVELS.length} missions cleared`;
}

function renderMap() {
  const body = $("drawer-body");
  body.innerHTML = "";
  CHAPTERS.forEach((ch, ci) => {
    const lvls = LEVELS.filter((l) => l.chapter === ci), done = lvls.filter((l) => Store.data.solved[l.id]).length;
    const sec = document.createElement("div");
    sec.className = "border border-slate-800 rounded-xl overflow-hidden";
    sec.innerHTML = `<div class="bg-slate-900 px-3 py-2 text-xs font-bold text-indigo-300 flex justify-between"><span>${ci + 1}. ${esc(ch.title)}</span><span class="text-[10px] ${done === lvls.length ? "text-emerald-400" : "text-slate-500"}">${done}/${lvls.length}</span></div>`;
    const grid = document.createElement("div");
    grid.className = "p-2 grid grid-cols-5 gap-2 bg-slate-950";
    lvls.forEach((l) => {
      const i = l.number - 1, isCur = i === cur, solved = Store.data.solved[l.id];
      const b = document.createElement("button");
      b.className = `btn h-9 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1 ${isCur ? "bg-indigo-600 text-white ring-2 ring-indigo-400/60" : solved ? "bg-emerald-700/80 text-white" : l.debug ? "bg-rose-950/50 text-rose-300 border border-rose-900/50 hover:bg-rose-900/40" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`;
      b.innerHTML = (l.debug && !isCur && !solved ? '<i class="fa-solid fa-bug text-[9px]"></i>' : solved && !isCur ? '<i class="fa-solid fa-check text-[9px]"></i>' : "") + l.number;
      b.title = `${l.number}. ${l.title} (${l.concept})`;
      b.onclick = () => { Sound.play("click"); toggleDrawer(false); loadLevel(i); };
      grid.appendChild(b);
    });
    sec.appendChild(grid);
    body.appendChild(sec);
  });
}

function toggleDrawer(open) {
  const d = $("drawer"), isOpen = !d.classList.contains("-translate-x-full");
  open = open ?? !isOpen;
  d.classList.toggle("-translate-x-full", !open);
  $("drawer-backdrop").classList.toggle("hidden", !open);
  if (open) renderMap();
}

// Modals
function openModal(id) { const m = $(id); m.classList.remove("hidden-modal"); m.dataset.open = "1"; }
function closeModal(id) { const m = $(id); m.classList.add("hidden-modal"); delete m.dataset.open; }
document.querySelectorAll(".modal").forEach((m) => {
  m.addEventListener("click", (e) => { if (e.target === m || e.target.closest("[data-close]")) closeModal(m.id); });
});

function openLesson() {
  const lv = LEVELS[cur];
  $("lesson-concept").textContent = `Mission ${lv.number} · ${lv.concept}${lv.debug ? " · Debug mission" : ""}`;
  $("lesson-title").textContent = lv.title;
  $("lesson-body").innerHTML = md(lv.lesson);
  $("lesson-task").textContent = lv.task;
  const multi = lv.layouts.length > 1;
  $("lesson-layouts").classList.toggle("hidden", !multi);
  $("lesson-layouts").textContent = multi ? ` This mission has ${lv.layouts.length} different layouts. One program must solve them all, so make your code react to what it senses instead of hard-coding moves.` : "";
  openModal("modal-lesson");
}

function openHints() {
  const lv = LEVELS[cur], shown = Store.data.hints[lv.id] || 0, body = $("hint-body");
  body.innerHTML = lv.hints.slice(0, shown).map((h, i) => `<div class="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 text-sm text-amber-100"><b class="text-amber-400 text-xs uppercase tracking-wider">Hint ${i + 1}</b><div class="mt-1">${md(h)}</div></div>`).join("") ||
    `<p class="text-sm text-slate-400">Stuck? Try <b class="text-amber-300">Step</b> first and watch exactly what each line does. Need more help? Reveal a hint.</p>`;
  if (Store.data.hints[lv.id + ":sol"]) body.innerHTML += `<div class="border border-slate-700 rounded-xl p-3"><b class="text-xs uppercase tracking-wider text-cyan-300">Solution</b><pre class="code-block">${highlightPy(lv.solution)}</pre><button id="btn-load-sol" class="btn text-xs bg-cyan-700 hover:bg-cyan-600 text-white px-3 py-1.5 rounded-lg">Load into editor</button></div>`;
  $("btn-next-hint").disabled = shown >= lv.hints.length;
  $("btn-next-hint").textContent = shown >= lv.hints.length ? "No more hints" : `Reveal hint ${shown + 1} of ${lv.hints.length}`;
  $("btn-solution").disabled = shown < lv.hints.length || !!Store.data.hints[lv.id + ":sol"];
  $("btn-solution").title = shown < lv.hints.length ? "Reveal all hints first" : "";
  const load = $("btn-load-sol");
  if (load) load.onclick = async () => {
    if (await confirmDialog("Load the solution?", "This replaces your current code. Try typing it yourself instead: you'll learn more!", "Load it")) {
      closeModal("modal-hint"); resetExecution(); setCode(lv.solution); Store.data.code[lv.id] = lv.solution; Store.save();
    }
  };
  openModal("modal-hint");
}

let confirmResolve = null;
function confirmDialog(title, body, okText = "Confirm") {
  $("confirm-title").textContent = title; $("confirm-body").textContent = body; $("confirm-ok").textContent = okText;
  openModal("modal-confirm");
  return new Promise((res) => { confirmResolve = res; });
}
$("confirm-ok").onclick = () => { closeModal("modal-confirm"); confirmResolve && confirmResolve(true); confirmResolve = null; };
$("confirm-cancel").onclick = () => { closeModal("modal-confirm"); confirmResolve && confirmResolve(false); confirmResolve = null; };
$("modal-confirm").addEventListener("click", (e) => { if (e.target.id === "modal-confirm") { confirmResolve && confirmResolve(false); confirmResolve = null; } });

function showSuccess(lr, firstClear) {
  const lv = LEVELS[cur], last = cur === LEVELS.length - 1, all = Store.solvedCount() === LEVELS.length;
  const lines = lr.events.filter((e) => e.t === "line").length, moves = lr.events.filter((e) => e.t === "move").length;
  const codeLines = editor.getValue().split("\n").filter((l) => l.trim() && !l.trim().startsWith("#")).length;
  $("success-title").textContent = all && last ? "Academy Complete!" : "Mission Cleared!";
  $("success-msg").textContent = all && last ? "You've learned the core of Python: variables, types, conditionals, loops, lists, dictionaries, functions, errors and classes. Outstanding work, Commander!"
    : `${lv.concept}: ${firstClear ? "mastered" : "cleared again"}. ${lv.layouts.length > 1 ? "Your code solved every layout." : ""}`;
  const stat = (v, l) => `<div class="bg-slate-950 border border-slate-800 rounded-xl py-2"><div class="text-lg font-black text-cyan-300">${v}</div><div class="text-[10px] text-slate-500 uppercase tracking-wider">${l}</div></div>`;
  $("success-stats").innerHTML = stat(codeLines, "code lines") + stat(lines, "lines run") + stat(moves, "cells flown");
  $("success-next").classList.toggle("hidden", last);
  openModal("modal-success");
}

// Cheat sheet
const CHEAT = [
  ["Comments & calling functions", "# a comment: Python ignores it\nmove_forward()      # call a function\nmove_forward(3)     # with an argument\nprint(\"Hello\", 42)  # several arguments"],
  ["Variables & types", "steps = 3            # int\nmass = 4.5           # float\nname = \"Nova\"        # str\nready = True         # bool\nsteps += 1           # same as steps = steps + 1\ntype(mass)           # <class 'float'>"],
  ["Math", "7 + 2   # 9      7 - 2   # 5\n7 * 2   # 14     7 / 2   # 3.5\n7 // 2  # 3      7 % 2   # 1  (remainder)\n2 ** 3  # 8      abs(-4) # 4"],
  ["Strings & conversion", "f\"Hi {name}, {steps} steps\"   # f-string\n\"a\" + \"b\"                    # \"ab\"\nlen(\"hello\")                 # 5\nint(\"4\")  str(4)  float(\"2.5\")\n\"  Hi \".strip().lower()      # \"hi\"\n\"a,b\".split(\",\")             # [\"a\", \"b\"]"],
  ["Conditionals", "if x > 5:\n    print(\"big\")\nelif x == 5:\n    print(\"five\")\nelse:\n    print(\"small\")\n\n# == != < > <= >=     and or not"],
  ["Loops", "for i in range(4):        # 0 1 2 3\n    move_forward()\n\nfor n in range(1, 6, 2):  # 1 3 5\n    print(n)\n\nwhile not at_goal():\n    move_forward()\n    if collect():\n        break             # leave the loop"],
  ["Lists", "route = [4, 3, 2]\nroute[0]          # 4  (first)\nroute[-1]         # 2  (last)\nlen(route)        # 3\nroute.append(1)   # [4, 3, 2, 1]\nfor d in route:\n    move_forward(d)\nsquares = [n * n for n in range(5)]"],
  ["Tuples & dictionaries", "x, y = get_position()     # tuple unpacking\nfuel = {\"ice\": 4, \"ore\": 7}\nfuel[\"ice\"]               # 4\nfuel[\"gems\"] = 3          # add / update\nfor k, v in fuel.items():\n    print(k, v)"],
  ["Functions", "def fly(steps):\n    move_forward(steps)\n\ndef double(n):\n    return n * 2\n\nfly(double(2))   # flies 4"],
  ["Errors & classes", "try:\n    n = int(\"abc\")\nexcept ValueError:\n    n = 1\n\nclass Ship:\n    def __init__(self, name):\n        self.name = name\n    def hello(self):\n        print(f\"I am {self.name}\")"],
];
const BLOCK_MAP = [
  ["move forward", "move_forward()"], ["repeat 10", "for i in range(10):"], ["repeat until ⟨goal⟩", "while not at_goal():"],
  ["if ⟨⟩ then / else", "if condition: … else:"], ["set var to 0", "var = 0"], ["change var by 1", "var += 1"],
  ["say Hello", 'print("Hello")'], ["make a block", "def my_block():"], ["⟨a⟩ and ⟨b⟩", "a and b"], ["join a b", 'a + b  or  f"{a}{b}"'],
];
function renderCheatSheet() {
  $("cheat-body").innerHTML =
    `<div class="mb-6 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <h3 class="text-xs font-bold uppercase tracking-wider text-cyan-300 mb-2">From blocks to Python</h3>
      <div class="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">${BLOCK_MAP.map(([b, p]) => `<div class="flex justify-between gap-3 border-b border-slate-800/60 py-1"><span class="text-slate-400">${esc(b)}</span><code class="text-emerald-300">${esc(p)}</code></div>`).join("")}</div>
      <p class="text-[11px] text-slate-500 mt-3">Indentation (4 spaces) in Python works like the "mouth" of a C-shaped block: the indented lines are inside it.</p>
    </div>
    <div class="grid md:grid-cols-2 gap-4">${CHEAT.map(([t, c]) => `<div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4"><h3 class="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-1">${esc(t)}</h3><pre class="code-block">${highlightPy(c)}</pre></div>`).join("")}</div>
    <div class="mt-6 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <h3 class="text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">Rocket commands</h3>
      <div class="grid sm:grid-cols-2 gap-2 text-xs">${Object.values(API_DOCS).map((d) => `<div><code class="text-sky-300">${esc(d.sig)}</code><div class="text-slate-400">${esc(d.desc)}</div></div>`).join("")}</div>
    </div>`;
}

// ───────────────────────── 9. WIRING & BOOT ─────────────────────────
function wireUI() {
  $("btn-run").onclick = onRunClick;
  $("btn-step").onclick = () => { Sound.get(); onStepClick(); };
  $("btn-back").onclick = onBackClick;
  $("btn-stop").onclick = onStopClick;
  $("btn-map").onclick = $("btn-open-map").onclick = () => { Sound.play("click"); toggleDrawer(); };
  $("btn-close-map").onclick = $("drawer-backdrop").onclick = () => toggleDrawer(false);
  $("btn-lesson").onclick = () => { Sound.play("click"); openLesson(); };
  $("btn-hint").onclick = () => { Sound.play("click"); openHints(); };
  $("btn-next-hint").onclick = () => { const id = LEVELS[cur].id; Store.data.hints[id] = (Store.data.hints[id] || 0) + 1; Store.save(); openHints(); };
  $("btn-solution").onclick = async () => {
    if (await confirmDialog("Reveal the solution?", "Make sure you've really tried. Reading a solution teaches less than solving it yourself.", "Reveal")) {
      Store.data.hints[LEVELS[cur].id + ":sol"] = true; Store.save(); openHints();
    }
  };
  $("btn-cheat").onclick = () => { Sound.play("click"); openModal("modal-cheat"); };
  $("btn-print-cheat").onclick = () => {
    const w = window.open("", "_blank");
    if (!w) return toast("Allow pop-ups to print the cheat sheet.", "warn");
    w.document.write(`<html><head><title>Python Cheat Sheet</title><style>body{font-family:sans-serif;padding:20px;color:#111}pre{background:#f3f4f6;padding:10px;border-radius:8px;font-size:12px;white-space:pre-wrap}h3{margin:14px 0 4px;font-size:13px}span{color:inherit!important}</style></head><body><h1>Python Cheat Sheet</h1>${CHEAT.map(([t, c]) => `<h3>${esc(t)}</h3><pre>${esc(c)}</pre>`).join("")}</body></html>`);
    w.document.close(); w.focus(); w.print();
  };
  $("btn-mute").onclick = (e) => {
    Store.data.muted = !Store.data.muted; Store.save(); updateMuteIcon();
  };
  $("btn-clear-term").onclick = () => { $("terminal").innerHTML = ""; };
  $("tab-terminal").onclick = () => showTab("terminal");
  $("tab-memory").onclick = () => showTab("memory");
  $("speed").value = Store.data.speed;
  $("speed").oninput = (e) => { Store.data.speed = +e.target.value; saveSoon(); };

  $("btn-reset-level").onclick = async () => {
    if (await confirmDialog("Reset this mission?", "Your code for this mission will be replaced with the original starting code.", "Reset mission")) {
      const lv = LEVELS[cur];
      delete Store.data.code[lv.id]; Store.save();
      resetExecution(); setCode(lv.starter); hideOutcomeMarkers();
      $("terminal").innerHTML = ""; term("Mission reset to its starting code.", "system");
      toast("Mission reset", "info");
    }
  };
  $("btn-reset-all").onclick = async () => {
    if (await confirmDialog("Restart the whole academy?", "This erases ALL progress, saved code and hints, and takes you back to Mission 1. This can't be undone.", "Erase everything")) {
      Store.wipe(); Store.save();
      $("speed").value = Store.data.speed; updateMuteIcon();
      loadLevel(0);
      toast("Academy restarted. Welcome back, cadet!", "warn");
    }
  };
  $("success-review").onclick = () => { closeModal("modal-success"); };
  $("success-next").onclick = () => { closeModal("modal-success"); if (cur < LEVELS.length - 1) loadLevel(cur + 1); };

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const open = [...document.querySelectorAll(".modal[data-open]")].pop();
      if (open) { if (open.id === "modal-confirm") $("confirm-cancel").click(); else closeModal(open.id); return; }
      toggleDrawer(false);
    }
    if (editor && editor.isFocused()) return; // Ace handles its own shortcuts
    if (document.querySelector(".modal[data-open]")) return;
    if (e.key === "F10") { e.preventDefault(); e.shiftKey ? onBackClick() : onStepClick(); }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); onRunClick(); }
  });
}
function updateMuteIcon() {
  $("btn-mute").querySelector("i").className = Store.data.muted ? "fa-solid fa-volume-xmark text-rose-400" : "fa-solid fa-volume-high";
}

function boot() {
  const missing = ["ace", "Blockly"].filter((g) => !window[g]);
  if (missing.length) {
    document.body.innerHTML = `<div class="m-10 p-6 rounded-2xl bg-rose-950 border border-rose-800 text-rose-100 max-w-xl"><h2 class="font-bold text-lg mb-2">Couldn't load ${missing.join(" & ")}</h2><p class="text-sm">Python Quest loads its editor and block libraries from the internet. Check your connection (or any content blocker) and refresh the page.</p></div>`;
    return;
  }
  Store.load();
  initEditor();
  initBlockly();
  Arena.init();
  wireUI();
  updateMuteIcon();
  renderCheatSheet();
  Engine.start();
  loadLevel(Store.data.current);
  requestAnimationFrame(frame);
  new ResizeObserver(() => editor.resize()).observe($("editor"));
}
window.addEventListener("load", boot);