/* Lampwerk plot editor for the web. Laptop prep for the plots made on the phone:
   the plan, lamp numbers, power at 230 or 120 V, kit list and hire order, and the gaffer sheet to print.
   AR tagging stays on the phone. Plots come from Store (store.js), which CloudKit will replace. */
(function () {
"use strict";
var W = window.Lampwerk, SVGNS = "http://www.w3.org/2000/svg";
var $ = function (s) { return document.querySelector(s); };
var FONT = "IBM Plex Mono, ui-monospace, Menlo, monospace";
var GEL = "#FFC21A";
var PAL = {
  screen: { bg: "#0E0E0D", ink: "rgba(237,237,234,.9)", muted: "rgba(237,237,234,.52)", wall: "rgba(237,237,234,.45)", grid: "rgba(237,237,234,.07)", gel: GEL, beam: .2 },
  // The sheet gets printed and photocopied, so it carries no gel: lit lamps are filled ink.
  sheet: { bg: "#FFFFFF", ink: "rgba(11,11,10,.85)", muted: "rgba(11,11,10,.6)", wall: "rgba(11,11,10,.45)", grid: "rgba(11,11,10,.06)", gel: "rgba(11,11,10,.85)", beam: .07 }
};
var SHOT_TITLES = { wide: "Wide", close: "Close", reverse: "Reverse" };

var cur = null, sel = null, view = "plan", libGroup = "All", libQuery = "";
var supply = readSupply();

function readSupply() {
  try { var s = JSON.parse(localStorage.getItem("lampwerk-web-supply")); if (s && W.REGIONS[s.region]) return s; } catch (e) {}
  return { region: "uk", circuitAmps: 16 };
}
function saveSupply() { try { localStorage.setItem("lampwerk-web-supply", JSON.stringify(supply)); } catch (e) {} }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function fmt(n) { return Math.round(n).toLocaleString("en-GB"); }
function amps(a) { return a.toFixed(1); }
function itemById(id) { return cur && cur.items.find(function (x) { return x.id === id; }); }
function number(it) { return cur.items.indexOf(it) + 1; }
function save() { if (cur) Store.put(cur); renderSource(); }

/* ---------- drawing ---------- */
function el(n, a, p) { var e = document.createElementNS(SVGNS, n); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
function S(a) { return Object.assign({ "vector-effect": "non-scaling-stroke" }, a); }

function drawHead(g, l, selected, P, sw, on) {
  var w = l.width, h = l.depth, k = l.kind, stroke = P.ink;
  var base = S({ fill: P.bg, stroke: stroke, "stroke-width": sw });
  if (k === "panel") { el("rect", Object.assign({ x: -h / 2, y: -w / 2, width: h, height: w }, base), g); el("line", S({ x1: h / 2, y1: -w / 2, x2: h / 2, y2: w / 2, stroke: stroke, "stroke-width": sw }), g); }
  else if (k === "point") { el("rect", Object.assign({ x: -w / 2, y: -h / 2, width: w * .62, height: h }, base), g); el("path", Object.assign({ d: "M" + (w * .12) + " " + (-h * .42) + "L" + (w / 2) + " " + (-h * .62) + "L" + (w / 2) + " " + (h * .62) + "L" + (w * .12) + " " + (h * .42) + "Z" }, base), g); }
  else if (k === "fresnel") { el("rect", Object.assign({ x: -w / 2, y: -h / 2, width: w * .8, height: h }, base), g); el("line", S({ x1: w * .3, y1: -h * .5, x2: w * .52, y2: -h * .74, stroke: stroke, "stroke-width": sw }), g); el("line", S({ x1: w * .3, y1: h * .5, x2: w * .52, y2: h * .74, stroke: stroke, "stroke-width": sw }), g); }
  else if (k === "tube") el("rect", Object.assign({ x: -.05, y: -w / 2, width: .1, height: w }, base), g);
  else if (k === "practical") el("circle", Object.assign({ r: Math.max(w / 2, .12) }, base), g);
  else if (k === "bounce") el("line", S({ x1: 0, y1: -w / 2, x2: 0, y2: w / 2, stroke: stroke, "stroke-width": sw + 1.6 }), g);
  else if (k === "diff") el("line", S({ x1: 0, y1: -w / 2, x2: 0, y2: w / 2, stroke: stroke, "stroke-width": sw, "stroke-dasharray": "4 3" }), g);
  else if (k === "flag") el("line", S({ x1: 0, y1: -w / 2, x2: 0, y2: w / 2, stroke: stroke, "stroke-width": sw + 4 }), g);
  var cx = k === "point" ? -w * .2 : (k === "fresnel" ? -w * .1 : 0);
  if (l.isLight) {
    var dr = k === "tube" ? .07 : Math.min(.09, Math.max(.06, h * .22));
    el("circle", on ? { cx: cx, cy: 0, r: dr, fill: P.gel } : S({ cx: cx, cy: 0, r: dr, fill: P.bg, stroke: P.ink, "stroke-width": sw * .8 }), g);
  }
  if (selected) el("circle", S({ cx: cx, cy: 0, r: Math.max(.32, w * .62), fill: "none", stroke: GEL, "stroke-width": 1.2 }), g);
}

function beamShape(plot, it, l) {
  if (W.spread(it, plot) >= 300) return { circle: true, r: W.glowRadius(l, it.output) };
  var len = W.beamLength(l, it.output), half = Math.min(W.spread(it, plot), 170) / 2 * Math.PI / 180;
  return { d: "M0 0L" + (len * Math.cos(half)) + " " + (-len * Math.sin(half)) + "A" + len + " " + len + " 0 0 1 " + (len * Math.cos(half)) + " " + (len * Math.sin(half)) + "Z" };
}

function render(svg, plot, opts) {
  opts = opts || {};
  var P = opts.sheet ? PAL.sheet : PAL.screen, live = !!opts.live, thin = opts.thumb ? .8 : 1.2;
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  var RW = plot.roomWidth, RD = plot.roomDepth, pad = opts.thumb ? .8 : 1;
  // Fit lamps placed outside the room too (a key through a window sits beyond the wall).
  var minX = 0, minY = 0, maxX = RW, maxY = RD;
  plot.items.concat([plot.camera, plot.talent]).forEach(function (p) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); });
  svg.setAttribute("viewBox", (minX - pad) + " " + (minY - pad) + " " + (maxX - minX + pad * 2) + " " + (maxY - minY + pad * 2));
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  el("rect", { x: minX - 50, y: minY - 50, width: maxX - minX + 100, height: maxY - minY + 100, fill: P.bg }, svg);
  if (!opts.thumb) {
    var gr = el("g", {}, svg);
    for (var gx = 1; gx < RW; gx++) el("line", S({ x1: gx, y1: 0, x2: gx, y2: RD, stroke: P.grid, "stroke-width": 1 }), gr);
    for (var gy = 1; gy < RD; gy++) el("line", S({ x1: 0, y1: gy, x2: RW, y2: gy, stroke: P.grid, "stroke-width": 1 }), gr);
    for (var tx = 0; tx <= RW; tx++) { var t = el("text", { x: tx, y: -.22, "text-anchor": "middle", "font-size": .16, fill: P.muted, "font-family": FONT }, gr); t.textContent = tx; }
    for (var ty = 1; ty <= RD; ty++) { var u = el("text", { x: -.2, y: ty + .05, "text-anchor": "end", "font-size": .16, fill: P.muted, "font-family": FONT }, gr); u.textContent = ty; }
  }
  el("rect", S({ x: 0, y: 0, width: RW, height: RD, fill: "none", stroke: P.wall, "stroke-width": 1 }), svg);

  var beams = el("g", { "fill-opacity": P.beam }, svg);
  plot.items.forEach(function (it) {
    var l = W.lamp(it); if (!l || !W.isOn(plot, it)) return;
    var b = beamShape(plot, it, l), g = el("g", { transform: "translate(" + it.x + " " + it.y + ") rotate(" + it.angle + ")" }, beams);
    if (b.circle) el("circle", { r: b.r, fill: P.gel }, g); else el("path", { d: b.d, fill: P.gel }, g);
  });

  // Talent, and the camera looking at them.
  var tg = el("g", { transform: "translate(" + plot.talent.x + " " + plot.talent.y + ")", "data-kind": "talent", style: live ? "cursor:grab" : "" }, svg);
  el("circle", { r: .45, fill: "transparent" }, tg);
  el("circle", S({ r: .2, fill: P.bg, stroke: P.ink, "stroke-width": thin }), tg);
  if (!opts.thumb) { var tl = el("text", { y: .55, "text-anchor": "middle", "font-size": .16, fill: P.muted, "font-family": FONT }, tg); tl.textContent = "TALENT"; }
  var ca = W.bearing(plot.camera, plot.talent);
  var cg = el("g", { transform: "translate(" + plot.camera.x + " " + plot.camera.y + ")", "data-kind": "camera", style: live ? "cursor:grab" : "" }, svg);
  el("circle", { r: .45, fill: "transparent" }, cg);
  var cr = el("g", { transform: "rotate(" + ca + ")" }, cg);
  el("path", S({ d: "M.2 -.1L1.2 -.5M.2 .1L1.2 .5", stroke: P.muted, "stroke-width": .8, "stroke-dasharray": "3 3", fill: "none" }), cr);
  el("rect", S({ x: -.3, y: -.18, width: .5, height: .36, fill: P.bg, stroke: P.ink, "stroke-width": thin }), cr);
  el("path", S({ d: "M.2 -.1L.34 -.18V.18L.2 .1Z", fill: P.bg, stroke: P.ink, "stroke-width": thin }), cr);
  if (!opts.thumb) { var cl = el("text", { y: .55, "text-anchor": "middle", "font-size": .16, fill: P.muted, "font-family": FONT }, cg); cl.textContent = "CAM"; }

  plot.items.forEach(function (it, i) {
    var l = W.lamp(it); if (!l) return;
    var s = live && sel === it.id;
    var wrap = el("g", { opacity: live && sel && !s ? .45 : 1 }, svg);
    var g = el("g", { transform: "translate(" + it.x + " " + it.y + ") rotate(" + it.angle + ")", "data-id": it.id, style: live ? "cursor:grab" : "" }, wrap);
    el("circle", { r: Math.max(.45, l.width * .65), fill: "transparent" }, g);
    drawHead(g, l, s, P, thin, W.isOn(plot, it));
    if (opts.thumb) return;
    var lx = it.x - .34, ly = it.y - .36;
    var n = el("text", { x: lx, y: ly, "text-anchor": "end", "font-size": .19, fill: P.ink, "font-family": FONT, "pointer-events": "none" }, wrap); n.textContent = "(" + (i + 1) + ")";
    var rl = el("text", { x: lx + .08, y: ly, "font-size": .19, fill: P.muted, "font-family": FONT, "pointer-events": "none" }, wrap); rl.textContent = W.title(it);
    var sp = el("text", { x: lx + .08, y: ly + .21, "font-size": .14, fill: P.muted, "font-family": FONT, "pointer-events": "none" }, wrap);
    sp.textContent = l.isLight ? l.shortName + " · " + Math.round(it.cct) + " K" : l.shortName;
  });

  if (live && sel) {
    var it = itemById(sel), l = it && W.lamp(it);
    if (l) {
      var r = 1.1, hx = it.x + r * Math.cos(it.angle * Math.PI / 180), hy = it.y + r * Math.sin(it.angle * Math.PI / 180);
      el("line", S({ x1: it.x, y1: it.y, x2: hx, y2: hy, stroke: P.muted, "stroke-width": 1, "stroke-dasharray": "3 3", "pointer-events": "none" }), svg);
      if (l.isLight) {
        el("line", S({ x1: it.x, y1: it.y, x2: plot.talent.x, y2: plot.talent.y, stroke: P.muted, "stroke-width": 1, "stroke-dasharray": "1 4", "pointer-events": "none" }), svg);
        var mt = el("text", { x: (it.x + plot.talent.x) / 2 + .1, y: (it.y + plot.talent.y) / 2 - .1, "font-size": .17, fill: P.muted, "font-family": FONT, "pointer-events": "none" }, svg);
        mt.textContent = W.dist(it, plot.talent).toFixed(1) + " M · " + (W.isOn(plot, it) ? fmt(W.luxFrom(it, plot.talent, plot)) + " LX" : "OFF");
      }
      var h = el("g", { "data-kind": "handle", style: "cursor:crosshair" }, svg);
      el("circle", { cx: hx, cy: hy, r: .32, fill: "transparent" }, h);
      el("circle", S({ cx: hx, cy: hy, r: .1, fill: P.bg, stroke: P.ink, "stroke-width": 1 }), h);
    }
  }
}

/* ---------- plan interaction ---------- */
var plan = $("#plan"), drag = null;
function svgPoint(e) { var p = plan.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(plan.getScreenCTM().inverse()); }
function round2(v) { return Math.round(v * 100) / 100; }
plan.addEventListener("pointerdown", function (e) {
  if (!cur) return;
  var t = e.target.closest("[data-id],[data-kind]");
  var p = svgPoint(e);
  if (!t) { if (sel) { sel = null; refresh(); } return; }
  if (t.dataset.kind === "handle") drag = { kind: "aim" };
  else if (t.dataset.kind === "talent" || t.dataset.kind === "camera") drag = { kind: t.dataset.kind, dx: p.x - cur[t.dataset.kind].x, dy: p.y - cur[t.dataset.kind].y };
  else { var it = itemById(t.dataset.id); sel = it.id; drag = { kind: "lamp", dx: p.x - it.x, dy: p.y - it.y }; }
  drag.vb = plan.getAttribute("viewBox");
  plan.setPointerCapture(e.pointerId);
  refresh();
  e.preventDefault();
});
plan.addEventListener("pointermove", function (e) {
  if (!drag) return;
  var p = svgPoint(e);
  drag.moved = true;
  if (drag.kind === "aim") { var it = itemById(sel); it.angle = round2(W.bearing(it, p)); }
  else if (drag.kind === "lamp") { var m = itemById(sel); m.x = round2(p.x - drag.dx); m.y = round2(p.y - drag.dy); }
  else { cur[drag.kind] = { x: round2(p.x - drag.dx), y: round2(p.y - drag.dy) }; }
  refresh(true);
});
function endDrag() { if (!drag) return; var moved = drag.moved; drag = null; if (moved) save(); refresh(); }
plan.addEventListener("pointerup", endDrag);
plan.addEventListener("pointercancel", endDrag);

document.addEventListener("keydown", function (e) {
  if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) || !cur) return;
  if (e.key === "Escape" && sel) { sel = null; refresh(); }
  else if ((e.key === "Delete" || e.key === "Backspace") && sel) { removeSel(); e.preventDefault(); }
  else if ((e.key === "d" || e.key === "D") && sel && !e.metaKey && !e.ctrlKey) duplicateSel();
});

function removeSel() { var it = itemById(sel); if (!it) return; cur.items.splice(cur.items.indexOf(it), 1); sel = null; save(); refresh(); }
function duplicateSel() {
  var it = itemById(sel); if (!it) return;
  var c = JSON.parse(JSON.stringify(it)); c.id = W.uuid(); c.x = round2(it.x + .6); c.y = round2(it.y + .45); delete c.height;
  cur.items.splice(cur.items.indexOf(it) + 1, 0, c); sel = c.id; save(); refresh();
}
function addLamp(l) {
  var at = { x: round2(cur.roomWidth / 2), y: round2(Math.max(.8, cur.talent.y - 2.2)) }, aim = W.bearing(at, cur.talent);
  var it = { id: W.uuid(), lampID: l.id, x: at.x, y: at.y, angle: round2(l.isGrip ? aim + 90 : aim),
    role: l.isGrip ? (l.kind === "diff" ? "diff" : l.kind === "flag" ? "neg" : "fill") : (l.group === "Practicals" ? "practical" : "key"),
    cct: l.cct ? Math.min(l.cct[1], Math.max(l.cct[0], 5600)) : 5600, output: 100, modifier: l.modifiers[0], gel: "None", offIn: [] };
  cur.items.push(it); sel = it.id; save(); refresh();
}

/* ---------- panes ---------- */
function renderSource() { $("#source").textContent = Store.source + " · local preview"; }

function renderPlots() {
  var box = $("#plots"), list = Store.list();
  $("#count").textContent = "(" + list.length + ")";
  box.innerHTML = "";
  list.forEach(function (p) {
    var b = document.createElement("button"); b.type = "button"; b.className = "plot"; b.setAttribute("aria-current", String(cur && p.id === cur.id));
    var s = document.createElementNS(SVGNS, "svg"); s.setAttribute("aria-hidden", "true"); b.appendChild(s);
    var d = document.createElement("div");
    d.innerHTML = "<b>" + esc(p.name) + "</b><span>No. " + p.number + " · " + p.items.length + " lamps · " + W.stampDate(p.updated || 0).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + "</span>";
    b.appendChild(d);
    b.onclick = function () { open(p.id); };
    box.appendChild(b);
    render(s, p, { thumb: true });
  });
}

function renderShots() {
  var box = $("#shots"); box.innerHTML = "";
  W.SHOTS.forEach(function (s) {
    var b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = SHOT_TITLES[s];
    b.setAttribute("aria-pressed", String(cur.shot === s));
    b.onclick = function () { cur.shot = s; save(); refresh(); };
    box.appendChild(b);
  });
}

function renderHud() {
  var k = W.keyLux(cur), ld = W.load(cur, supply), C = W.circuits(cur, supply);
  $("#h-key").textContent = fmt(k);
  $("#h-ratio").textContent = W.ratioText(cur);
  $("#h-amps").textContent = amps(ld.amps);
  $("#h-circ").textContent = C.length + " × " + supply.circuitAmps + " A";
  $("#h-circ-box").classList.toggle("warn", C.some(function (c) { return c.isWarning; }));
}

function renderInspector() {
  var box = $("#insp"), it = itemById(sel);
  if (!it) return renderLibrary(box);
  var l = W.lamp(it), on = W.isOn(cur, it);
  var h = '<div class="row" style="justify-content:space-between"><span class="caps">(' + number(it) + ') ' + esc(W.title(it)) + '</span><button class="act" id="i-close" type="button">Close</button></div>' +
    '<h3>' + esc(l.fullName) + '</h3>' +
    '<label class="field"><span>Name</span><input type="text" id="i-name" placeholder="' + esc(cap(it.role)) + '" value="' + esc(it.name || "") + '"></label>' +
    '<div class="field"><span>Role</span><div class="chips" id="i-roles"></div></div>';
  if (l.isLight) {
    h += '<div class="field"><span>On in</span><div class="chips" id="i-in"></div></div>';
    if (l.cct && l.cct[0] !== l.cct[1]) h += '<label class="field"><span>Colour</span><span class="slider"><input type="range" id="i-cct" min="' + l.cct[0] + '" max="' + Math.min(l.cct[1], 10000) + '" step="100" value="' + it.cct + '"><output id="i-cct-o">' + Math.round(it.cct) + ' K</output></span></label>';
    else h += '<div class="field"><span>Colour</span><output style="text-align:left">' + Math.round(it.cct) + ' K, fixed</output></div>';
    if (l.isDimmable) h += '<label class="field"><span>Output</span><span class="slider"><input type="range" id="i-out" min="5" max="100" step="5" value="' + it.output + '"><output id="i-out-o">' + Math.round(it.output) + '%</output></span></label>';
    else h += '<div class="field"><span>Output</span><output style="text-align:left">Full (' + (l.isHMI ? "HMI" : "tungsten") + ')</output></div>';
  }
  h += '<label class="field"><span>' + (l.kind === "diff" ? "Material" : "Modifier") + '</span><select id="i-mod">' + l.modifiers.map(function (m) { return '<option' + (m === it.modifier ? " selected" : "") + '>' + esc(m) + '</option>'; }).join("") + '</select></label>';
  if (l.isLight) h += '<label class="field"><span>Gel</span><select id="i-gel">' + W.GELS.map(function (g) { return '<option' + (g === it.gel ? " selected" : "") + '>' + esc(g) + '</option>'; }).join("") + '</select></label>';
  h += '<dl class="facts">';
  if (l.isLight) {
    var frame = W.diffFrame(it, cur);
    h += '<dt>To talent</dt><dd>' + W.dist(it, cur.talent).toFixed(1) + ' m</dd>' +
      '<dt>At talent</dt><dd>' + (on ? "~" + fmt(W.luxFrom(it, cur.talent, cur)) + " lx" : "Off in " + SHOT_TITLES[cur.shot]) + '</dd>' +
      '<dt>Beam</dt><dd>' + Math.round(W.spread(it, cur)) + '°' + (frame ? " through (" + number(frame) + ")" : "") + '</dd>' +
      '<dt>Draw</dt><dd>' + amps(W.itemAmps(it, supply)) + ' A at ' + W.REGIONS[supply.region].volts + ' V</dd>' +
      '<dt>Figures</dt><dd>' + (l.spec ? { maker: "Maker spec sheet", retailer: "Hire or retail listing", estimate: "Approximate" }[l.spec.source] : "Approximate") + '</dd>';
  } else if (l.kind === "diff") {
    var m = W.material(it);
    h += '<dt>Passes</dt><dd>' + Math.round(m.pass * 100) + '%</dd><dt>Spreads to</dt><dd>' + m.spread + '°</dd>';
  } else h += '<dt>Size</dt><dd>' + l.width + ' m</dd>';
  if (it.height != null) h += '<dt>Height</dt><dd>' + it.height.toFixed(1) + ' m (AR)</dd>';
  h += '<dt>Position</dt><dd>' + it.x.toFixed(1) + ', ' + it.y.toFixed(1) + ' m</dd></dl>' +
    '<div class="row"><button class="act" id="i-dup" type="button">Duplicate</button><button class="act" id="i-del" type="button">Remove</button></div>';
  box.innerHTML = h;

  var roles = $("#i-roles");
  W.ROLES.forEach(function (r) { var b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = cap(r); b.setAttribute("aria-pressed", String(it.role === r)); b.onclick = function () { it.role = r; save(); refresh(); }; roles.appendChild(b); });
  if (l.isLight) {
    var ins = $("#i-in");
    W.SHOTS.forEach(function (s) {
      var b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = SHOT_TITLES[s];
      var offIn = it.offIn || (it.offIn = []);
      b.setAttribute("aria-pressed", String(offIn.indexOf(s) < 0));
      b.onclick = function () { var i = offIn.indexOf(s); if (i < 0) offIn.push(s); else offIn.splice(i, 1); save(); refresh(); };
      ins.appendChild(b);
    });
  }
  $("#i-close").onclick = function () { sel = null; refresh(); };
  $("#i-name").onchange = function () { var v = this.value.trim(); if (v) it.name = v; else delete it.name; save(); refresh(); };
  if ($("#i-cct")) $("#i-cct").oninput = function () { it.cct = +this.value; $("#i-cct-o").textContent = this.value + " K"; refresh(true); };
  if ($("#i-cct")) $("#i-cct").onchange = function () { save(); refresh(); };
  if ($("#i-out")) $("#i-out").oninput = function () { it.output = +this.value; $("#i-out-o").textContent = this.value + "%"; refresh(true); };
  if ($("#i-out")) $("#i-out").onchange = function () { save(); refresh(); };
  $("#i-mod").onchange = function () { it.modifier = this.value; save(); refresh(); };
  if ($("#i-gel")) $("#i-gel").onchange = function () { it.gel = this.value; save(); refresh(); };
  $("#i-dup").onclick = duplicateSel;
  $("#i-del").onclick = removeSel;
}

function renderLibrary(box) {
  var groups = ["All"].concat(W.GROUPS), q = libQuery.toLowerCase();
  var list = W.LIB.filter(function (l) { return (libGroup === "All" || l.group === libGroup) && (!q || (l.fullName + " " + l.group).toLowerCase().indexOf(q) >= 0); });
  box.innerHTML = '<span class="caps">Add a lamp</span><input type="search" id="lib-q" placeholder="Search heads and grip" value="' + esc(libQuery) + '">' +
    '<div class="lib-groups" id="lib-g"></div><div class="lib-list" id="lib-l"></div>' +
    '<span class="caps" style="margin-top:8px">Room</span>' +
    '<label class="field"><span>Width</span><span class="slider"><input type="number" id="r-w" min="2" max="60" step="0.1" value="' + cur.roomWidth + '"><output>m</output></span></label>' +
    '<label class="field"><span>Depth</span><span class="slider"><input type="number" id="r-d" min="2" max="60" step="0.1" value="' + cur.roomDepth + '"><output>m</output></span></label>' +
    (cur.floorPlan ? '<p class="q" style="margin:0;font-size:12px">This plot has a floor plan on the phone. It shows there; the web plan draws the room only.</p>' : "") +
    '<button class="act" id="p-del" type="button" style="align-self:flex-start;margin-top:8px">Delete plot</button>';
  var g = $("#lib-g");
  groups.forEach(function (n) { var b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = n; b.setAttribute("aria-pressed", String(libGroup === n)); b.onclick = function () { libGroup = n; renderInspector(); }; g.appendChild(b); });
  var lb = $("#lib-l");
  list.forEach(function (l) {
    var b = document.createElement("button"); b.type = "button"; b.className = "lib-row";
    b.innerHTML = "<b>" + esc(l.fullName) + "</b><span>" + (l.isLight ? (l.spec ? l.spec.drawW : l.watts) + " W" : l.width + " m") + "</span>";
    b.onclick = function () { addLamp(l); };
    lb.appendChild(b);
  });
  var qi = $("#lib-q");
  qi.oninput = function () { libQuery = this.value; var pos = this.selectionStart; renderInspector(); var n = $("#lib-q"); n.focus(); n.setSelectionRange(pos, pos); };
  $("#r-w").onchange = function () { var v = +this.value; if (v >= 2) { cur.roomWidth = v; save(); refresh(); } };
  $("#r-d").onchange = function () { var v = +this.value; if (v >= 2) { cur.roomDepth = v; save(); refresh(); } };
  $("#p-del").onclick = function () {
    if (!confirm("Delete \"" + cur.name + "\"? This can't be undone here.")) return;
    Store.remove(cur.id); var next = Store.list()[0]; cur = null; if (next) open(next.id); else { renderPlots(); newPlotFlow(); }
  };
}

function kitTable(rows) {
  return '<table><tbody>' + rows.map(function (r) { return '<tr><td class="r" style="width:3em;text-align:left;padding-left:0">' + r.qty + ' ×</td><td>' + esc(r.name) + '</td></tr>'; }).join("") + '</tbody></table>';
}
function renderKit() {
  var k = W.kit(cur), pane = $("#kit-pane");
  var heads = k.heads.map(function (h) { return { qty: h.qty, name: h.name }; });
  pane.innerHTML = '<h2 class="caps">Heads (' + heads.reduce(function (s, h) { return s + h.qty; }, 0) + ')</h2>' + (heads.length ? kitTable(heads) : '<p class="q">No heads yet.</p>') +
    (k.modifiers.length ? '<h2 class="caps">Modifiers</h2>' + kitTable(k.modifiers) : "") +
    (k.gels.length ? '<h2 class="caps">Gels</h2>' + kitTable(k.gels) : "") +
    (k.grip.length ? '<h2 class="caps">Grip</h2>' + kitTable(k.grip) : "") +
    '<h2 class="caps">Stands</h2><p>' + k.stands + ' (one per head and frame)</p>' +
    '<h2 class="caps">Hire order</h2><p class="q" style="margin-top:0">Every setup in this plot, ready to paste into an email to the hire house.</p>' +
    '<textarea id="hire" spellcheck="false">' + esc(W.hireOrder(cur, supply)) + '</textarea>' +
    '<div class="row" style="margin-top:8px"><button class="act primary" id="hire-copy" type="button">Copy</button><button class="act" id="hire-dl" type="button">Download .txt</button><span class="q" id="hire-note"></span></div>';
  $("#hire-copy").onclick = function () {
    var t = $("#hire").value;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { $("#hire-note").textContent = "Copied"; }, function () { $("#hire").select(); document.execCommand("copy"); $("#hire-note").textContent = "Copied"; });
  };
  $("#hire-dl").onclick = function () { download(slug(cur.name) + "-hire-order.txt", $("#hire").value, "text/plain"); };
}

function circuitRows(C, sheet) {
  return C.map(function (c) {
    var nos = c.items.map(function (id) { return "(" + number(itemById(id)) + ")"; }).join(" ");
    return '<tr><td style="width:18%">Circuit ' + c.id + '</td><td class="q">' + nos + '</td><td style="width:30%"><div class="bar' + (c.isWarning && !sheet ? " warn" : "") + '"><i style="width:' + Math.min(100, c.share * 100).toFixed(0) + '%"></i></div></td><td class="r" style="width:18%">' + amps(c.amps) + ' / ' + c.capacity + ' A</td></tr>';
  }).join("");
}
function renderPower() {
  var C = W.circuits(cur, supply), ld = W.load(cur, supply), full = C.reduce(function (s, c) { return s + c.amps; }, 0), v = W.REGIONS[supply.region].volts;
  var heads = cur.items.filter(function (it) { var l = W.lamp(it); return l && l.isLight; });
  $("#power-pane").innerHTML =
    '<h2 class="caps">' + W.REGIONS[supply.region].title + ', ' + supply.circuitAmps + ' A circuits</h2>' +
    '<p>Full load ' + amps(full) + ' A on ' + C.length + ' circuit' + (C.length === 1 ? "" : "s") + '. ' + SHOT_TITLES[cur.shot] + ' draws ' + amps(ld.amps) + ' A (' + fmt(ld.watts) + ' W) with ' + W.lightsOn(cur).length + ' of ' + heads.length + ' heads on.</p>' +
    (C.some(function (c) { return c.isWarning; }) ? '<p style="color:var(--warn)">A circuit is over ' + Math.round(W.WARN_SHARE * 100) + '% of its rating at full draw.</p>' : "") +
    '<table><tbody>' + circuitRows(C) + '</tbody></table>' +
    '<h2 class="caps">Each head</h2><table><thead><tr><th></th><th>Head</th><th class="r">Full</th><th class="r">Now</th></tr></thead><tbody>' +
    heads.map(function (it) { var l = W.lamp(it), on = W.isOn(cur, it); return '<tr' + (on ? "" : ' class="off"') + '><td>(' + number(it) + ')</td><td>' + esc(l.fullName) + '</td><td class="r">' + amps(W.lampAmps(l, supply)) + ' A</td><td class="r">' + (on ? amps(W.itemAmps(it, supply)) + " A" : "Off") + '</td></tr>'; }).join("") +
    '</tbody></table><p class="q">Circuits are packed at full draw, first fit, in plot order. Draw is the maker\'s wall figure ÷ ' + v + ' V where known, otherwise watts ÷ volts, HMIs ×1.1 for the ballast. LED heads scale with output, never below 15%. Check tie-ins and generators with your spark.</p>';
}

function renderSheet() {
  var C = W.circuits(cur, supply), full = C.reduce(function (s, c) { return s + c.amps; }, 0);
  var heads = cur.items.filter(function (it) { var l = W.lamp(it); return l && l.isLight; });
  var grip = cur.items.filter(function (it) { var l = W.lamp(it); return l && !l.isLight; });
  var d = new Date(), date = String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + String(d.getFullYear()).slice(2);
  $("#sheet-pane").innerHTML =
    '<div class="row"><button class="act primary" id="print" type="button">Print or save PDF</button><span class="q">A4, ink only, so it photocopies.</span></div>' +
    '<div class="a4">' +
    '<div class="a4-top"><span>Gaffer sheet</span><span class="q">No. ' + cur.number + '</span></div><hr>' +
    '<div class="a4-meta"><div><span class="q">Scene</span><br>' + esc(cur.name) + '</div><div><span class="q">Setup</span><br>' + SHOT_TITLES[cur.shot] + '</div><div><span class="q">Key · ratio</span><br>~' + fmt(W.keyLux(cur)) + ' lx · ' + W.ratioText(cur) + '</div><div><span class="q">Date</span><br>' + date + '</div></div><hr>' +
    '<div class="a4-plan"><svg id="sheet-svg" aria-hidden="true"></svg></div>' +
    '<table><thead><tr><th>#</th><th>Head</th><th>Name</th><th>Modifier</th><th>Gel</th><th class="r">To talent</th><th class="r">At talent</th><th class="r">A</th></tr></thead><tbody>' +
    heads.map(function (it) { var l = W.lamp(it), on = W.isOn(cur, it); return '<tr' + (on ? "" : ' class="off"') + '><td>' + number(it) + '</td><td>' + esc(l.fullName) + '</td><td>' + esc(W.title(it)) + '</td><td>' + esc(it.modifier) + '</td><td>' + esc(it.gel) + '</td><td class="r">' + W.dist(it, cur.talent).toFixed(1) + ' m</td><td class="r">' + (on ? "~" + fmt(W.luxFrom(it, cur.talent, cur)) + " lx" : "Off") + '</td><td class="r">' + amps(W.itemAmps(it, supply)) + '</td></tr>'; }).join("") +
    '</tbody></table>' +
    (grip.length ? '<div><span class="q">Grip</span> &nbsp;' + grip.map(function (it) { var l = W.lamp(it); return "(" + number(it) + ") " + esc(l.kind === "diff" ? l.name + ", " + W.material(it).name : l.name); }).join(" · ") + '</div>' : "") +
    '<div><span class="q">Power</span> &nbsp;Full load ' + amps(full) + ' A · ' + C.length + ' × ' + supply.circuitAmps + ' A circuit' + (C.length === 1 ? "" : "s") + ', ' + W.REGIONS[supply.region].volts + ' V</div>' +
    '<table><tbody>' + circuitRows(C, true) + '</tbody></table>' +
    '<div class="a4-foot"><span class="q">Figures approximate. Check tie-ins and generators with your spark.<br>Made with Lampwerk</span><svg viewBox="0 0 648 960" aria-label="Lampwerk"><use href="#mark"/></svg></div>' +
    '</div>';
  render($("#sheet-svg"), cur, { sheet: true });
  $("#print").onclick = function () { window.print(); };
}

function refresh(light) {
  if (!cur) return;
  render(plan, cur, { live: true });
  renderHud();
  if (light) return;
  $("#plot-name").value = cur.name;
  $("#room").textContent = cur.roomWidth + " × " + cur.roomDepth + " m";
  renderShots();
  renderInspector();
  renderPlots();
  showView(view);
}

function showView(v) {
  view = v;
  document.querySelectorAll("[data-view]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.view === v)); });
  ["plan", "kit", "power", "sheet"].forEach(function (n) { $("#" + n + "-pane").hidden = n !== v; });
  if (v === "kit") renderKit(); else if (v === "power") renderPower(); else if (v === "sheet") renderSheet();
}
document.querySelectorAll("[data-view]").forEach(function (b) { b.onclick = function () { showView(b.dataset.view); }; });

function open(id) { cur = Store.get(id); sel = null; try { localStorage.setItem("lampwerk-web-open", id); } catch (e) {} refresh(); }

function newPlotFlow() {
  var name = prompt("Scene name", "Int. bedroom, day"); if (name == null) return;
  var keys = Object.keys(W.STARTERS);
  var pick = prompt("Start with: " + keys.map(function (k, i) { return (i + 1) + " " + W.STARTERS[k].title; }).join(", "), "1");
  if (pick == null) return;
  var starter = keys[Math.max(0, Math.min(keys.length - 1, (parseInt(pick, 10) || 1) - 1))];
  var p = W.newPlot(Store.list(), name.trim(), starter);
  Store.put(p); open(p.id);
}

function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "plot"; }
function download(name, text, type) {
  var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

/* ---------- wiring ---------- */
function renderSupply() {
  $("#region").value = supply.region;
  $("#breaker").innerHTML = W.REGIONS[supply.region].circuits.map(function (a) { return '<option value="' + a + '"' + (a === supply.circuitAmps ? " selected" : "") + '>' + a + ' A</option>'; }).join("");
}
$("#region").onchange = function () { supply = { region: this.value, circuitAmps: W.REGIONS[this.value].standard }; saveSupply(); renderSupply(); refresh(); };
$("#breaker").onchange = function () { supply.circuitAmps = +this.value; saveSupply(); refresh(); };
$("#plot-name").onchange = function () { var v = this.value.trim(); if (v) { cur.name = v; save(); refresh(); } };
$("#new").onclick = newPlotFlow;
$("#export").onclick = function () { download("plots.json", Store.exportJSON(), "application/json"); };
$("#import-file").onchange = function () {
  var f = this.files[0]; if (!f) return;
  f.text().then(function (t) { Store.importJSON(t); var first = Store.list()[0]; renderSource(); if (first) open(first.id); }).catch(function (e) { alert("Couldn't read that file: " + e.message); });
  this.value = "";
};
$("#reset").onclick = function () {
  if (!confirm("Forget the edits in this browser and reload plots.json?")) return;
  Store.reset().then(function () { renderSource(); var first = Store.list()[0]; if (first) open(first.id); });
};
window.addEventListener("resize", function () { if (cur) render(plan, cur, { live: true }); });

renderSupply();
Store.load().then(function () {
  renderSource();
  var last = null; try { last = localStorage.getItem("lampwerk-web-open"); } catch (e) {}
  var p = (last && Store.get(last)) || Store.list()[0];
  if (p) open(p.id); else { renderPlots(); newPlotFlow(); }
}).catch(function (e) { $("#source").textContent = "Couldn't load plots.json: " + e.message; });
})();
