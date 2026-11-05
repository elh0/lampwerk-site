/* The camera's view of the talent: the clay stand-in lit in 3D by the plot, the same scene as the app's
   camera monitor (CameraPreview.swift). Every lamp that's on becomes a light where it stands, at its height,
   aimed where it's aimed, with its beam, colour after gel and softness. Exposure is locked to a stop and ISO,
   so a brighter lamp reads brighter. Head scan: Lee Perry-Smith by Infinite-Realities, CC BY 3.0. */
(function () {
"use strict";
var W = window.Lampwerk, T = window.THREE;
var EYES = 1.6, FRAME = 0.46, FOV = 21;
var STOPS = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16], ISOS = [400, 800, 1600, 3200];
var SHIFT = { "¼ CTO": 64, "½ CTO": 109, "Full CTO": 159, "¼ CTB": -30, "½ CTB": -68, "Full CTB": -131 };

function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
var state = { open: store("lampwerk-cam-open") !== false, stop: store("lampwerk-cam-stop") || 2.8, iso: store("lampwerk-cam-iso") || 800, zoom: 1 };

// Incident meter equation at 1/48 s (180° at 24 fps): lux that exposes a grey card at mid-grey.
function exposureLux() { return 250 * state.stop * state.stop / ((1 / 48) * state.iso); }
function effKelvin(it) { var k = it.cct > 0 ? it.cct : 5600, m = SHIFT[it.gel]; return m ? 1e6 / (1e6 / k + m) : k; }
function kelvin(k) {
  var t = Math.max(1000, Math.min(40000, k)) / 100, r, g, b;
  r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  b = t >= 66 ? 255 : (t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307);
  return [r, g, b].map(function (v) { return Math.max(0, Math.min(255, v)) / 255; });
}
function key(plot) {
  var i = plot.items.findIndex(function (it) { return it.role === "key" && W.isOn(plot, it); });
  return i < 0 ? null : { n: i + 1, it: plot.items[i], lux: W.luxFrom(plot.items[i], plot.talent, plot) };
}
function keyKelvin(plot) { var k = key(plot); return k ? effKelvin(k.it) : 5600; }
function softness(it, l, plot) {
  var w = { panel: .6, tube: .5, practical: .75 }[l.kind]; if (w == null) w = .1;
  if (["Softbox", "Chimera, medium", "Dome M"].indexOf(it.modifier) >= 0) w = Math.max(w, .75);
  if (["Lantern", "8x8 full grid"].indexOf(it.modifier) >= 0) w = Math.max(w, .9);
  if (["Snapgrid 40°", "Honeycrate", "Snoot", "Fresnel lens"].indexOf(it.modifier) >= 0) w = Math.min(w, .25);
  if (W.diffFrame(it, plot)) w = Math.max(w, .85);
  return w;
}
// Head height (IsoCanvas.height): AR's figure, otherwise a usual stand height for the kind of head.
function height(it) {
  if (it.height != null) return it.height;
  var l = W.lamp(it); if (!l) return 1.8;
  return { bounce: 0, diff: 0, flag: 0, practical: 2.4, tube: 1.2, panel: 1.8 }[l.kind] != null ? { bounce: 0, diff: 0, flag: 0, practical: 2.4, tube: 1.2, panel: 1.8 }[l.kind] : 2.3;
}

// A plain OBJ (v, vn, f v//vn) into a mesh, no loader needed.
function parseOBJ(text) {
  var v = [], n = [], pos = [], nor = [];
  text.split("\n").forEach(function (line) {
    var p = line.split(" ");
    if (p[0] === "v") v.push([+p[1], +p[2], +p[3]]);
    else if (p[0] === "vn") n.push([+p[1], +p[2], +p[3]]);
    else if (p[0] === "f") for (var i = 1; i <= 3; i++) { var q = p[i].split("//"); pos.push.apply(pos, v[q[0] - 1]); nor.push.apply(nor, n[q[1] - 1]); }
  });
  var g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new T.Float32BufferAttribute(nor, 3));
  return g;
}

var host, renderer, scene, camera, head, rig, plotNow = null, queued = false;

function build() {
  host.innerHTML = "";
  if (!state.open) {
    var b = document.createElement("button"); b.type = "button"; b.className = "cam-pill"; b.textContent = "▸ CAM";
    b.setAttribute("aria-label", "Show the camera view");
    b.onclick = function () { state.open = true; store("lampwerk-cam-open", true); build(); update(plotNow); };
    host.appendChild(b); renderer = null; return;
  }
  if (!T) { host.innerHTML = '<p class="q" style="margin:0;font-size:12px">The camera view needs 3D (WebGL), which this browser didn\'t load.</p>'; return; }
  var mon = document.createElement("div"); mon.className = "mon";
  var cv = document.createElement("canvas"); mon.appendChild(cv);
  mon.insertAdjacentHTML("beforeend", '<svg viewBox="0 0 160 90" preserveAspectRatio="none" aria-hidden="true"><path d="M8 6h10M8 6v7M152 6h-10M152 6v7M8 84h10M8 84v-7M152 84h-10M152 84v-7M78 45h4M80 43v4" stroke="rgba(237,237,234,.5)" stroke-width=".7" fill="none"/></svg>');
  var strip = document.createElement("div"); strip.className = "mon-strip"; strip.id = "cam-strip";
  host.appendChild(mon); host.appendChild(strip);
  renderer = new T.WebGLRenderer({ canvas: cv, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.VSMShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.outputEncoding = T.sRGBEncoding;
  scene = new T.Scene(); scene.background = new T.Color(0x000000);
  camera = new T.PerspectiveCamera(FOV, 16 / 9, 0.05, 60);
  scene.add(new T.AmbientLight(0xffffff, 0.02));
  rig = new T.Group(); scene.add(rig);
  head = new T.Group(); scene.add(head);
  fetch("models/standin.obj").then(function (r) { return r.text(); }).then(function (t) {
    var m = new T.Mesh(parseOBJ(t), new T.MeshStandardMaterial({ color: new T.Color(0.74, 0.74, 0.74), roughness: 0.8, metalness: 0 }));
    m.castShadow = true; m.receiveShadow = true; m.position.y = EYES; head.add(m); queue();
  });
  // Scroll or pinch on the monitor to push in on the face.
  cv.addEventListener("wheel", function (e) { e.preventDefault(); state.zoom = Math.min(3, Math.max(0.6, state.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))); queue(); }, { passive: false });
  new ResizeObserver(function () { size(); queue(); }).observe(cv);
}

function size() { if (!renderer) return; var c = renderer.domElement, w = c.clientWidth, h = c.clientHeight; if (w && h) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); } }

function world(p, t, h) { return new T.Vector3(p.x - t.x, h, p.y - t.y); }

function draw() {
  queued = false;
  var plot = plotNow; if (!renderer || !plot) return;
  strip(plot);
  var t = plot.talent, toCam = { x: plot.camera.x - t.x, y: plot.camera.y - t.y }, d = Math.max(0.3, Math.hypot(toCam.x, toCam.y));
  var dir = { x: toCam.x / d, y: toCam.y / d };
  head.rotation.y = Math.atan2(dir.x, dir.y);
  var back = FRAME / Math.max(0.6, state.zoom) / 2 / Math.tan(FOV * Math.PI / 360);
  camera.position.set(dir.x * back, EYES - 0.05, dir.y * back);
  camera.lookAt(0, EYES - 0.04, 0);

  while (rig.children.length) { var c = rig.children.pop(); if (c.dispose) c.dispose(); }
  var ex = exposureLux(), wb = kelvin(keyKelvin(plot));
  plot.items.forEach(function (it) {
    var l = W.lamp(it); if (!l) return;
    var lux = 0, soft = 0.9, spread = 300;
    if (l.isLight) {
      if (!W.isOn(plot, it)) return;
      lux = W.luxFrom(it, t, plot); soft = softness(it, l, plot); spread = W.spread(it, plot);
    } else if (l.kind === "bounce") {
      var k = 0; plot.items.forEach(function (o) { if (W.isOn(plot, o) && o.role === "key") k += W.luxFrom(o, t, plot); });
      lux = k * 0.45 * Math.min(1, l.width / 1.2) / Math.max(1, Math.pow(W.dist(it, t), 2) / 2);
    }
    if (!(lux > 0)) return;
    var rgb = l.isLight ? kelvin(effKelvin(it)).map(function (v, i) { return v / wb[i]; }) : [1, 1, 1];
    if (it.gel === "¼ Plus green") { rgb[0] *= .92; rgb[2] *= .92; }
    var top = Math.max(rgb[0], rgb[1], rgb[2], 1), color = new T.Color(rgb[0] / top, rgb[1] / top, rgb[2] / top);
    // Lux at the talent already allows for distance, beam and losses, so the light itself doesn't fall off.
    var intensity = 0.55 * lux / ex * top, light;
    var at = world(it, t, l.isLight ? height(it) : EYES);
    if (spread >= 300 || !l.isLight) light = new T.PointLight(color, intensity, 0, 0);
    else {
      var a = it.angle * Math.PI / 180, reach = W.dist(it, t), off = W.angleBetween(W.bearing(it, t), it.angle);
      var outer = Math.min(170, Math.max(spread, off * 2 + 12));
      light = new T.SpotLight(color, intensity, 0, outer / 2 * Math.PI / 180, soft > 0.5 ? 0.55 : 0.15, 0);
      light.target.position.copy(world({ x: it.x + Math.cos(a) * reach, y: it.y + Math.sin(a) * reach }, t, EYES));
      rig.add(light.target);
    }
    light.position.copy(at);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.radius = 1.5 + soft * 14;
    light.shadow.bias = -0.0005;
    rig.add(light);
  });
  renderer.render(scene, camera);
}

function strip(plot) {
  var s = document.getElementById("cam-strip"); if (!s) return;
  var k = key(plot), ex = exposureLux(), over = k ? Math.log2(Math.max(k.lux, 0.01) / ex) : null;
  s.innerHTML = (k ? '<span>KEY ' + String(k.n).padStart(2, "0") + ' · ' + (W.lamp(k.it) ? W.lamp(k.it).shortName : "") + ' · ' + Math.round(k.lux).toLocaleString("en-GB") + ' lx</span><b class="' + (Math.abs(over) > 2 ? "hot" : "") + '">' + (over >= 0 ? "+" : "") + over.toFixed(1) + '</b>' : '<span>NO KEY ON</span>') +
    '<span class="grow"></span><button type="button" id="cam-stop" title="Stop">T' + (state.stop % 1 ? state.stop.toFixed(1) : state.stop) + '</button>' +
    '<button type="button" id="cam-iso" title="ISO">ISO ' + state.iso + '</button><span>' + Math.round(keyKelvin(plot)).toLocaleString("en-GB") + ' K</span>' +
    '<button type="button" id="cam-x" aria-label="Close the camera view">×</button>';
  document.getElementById("cam-stop").onclick = function () { state.stop = STOPS[(STOPS.indexOf(state.stop) + 1) % STOPS.length]; store("lampwerk-cam-stop", state.stop); queue(); };
  document.getElementById("cam-iso").onclick = function () { state.iso = ISOS[(ISOS.indexOf(state.iso) + 1) % ISOS.length]; store("lampwerk-cam-iso", state.iso); queue(); };
  document.getElementById("cam-x").onclick = function () { state.open = false; store("lampwerk-cam-open", false); build(); };
}

function queue() { if (!queued) { queued = true; requestAnimationFrame(draw); } }
function update(plot) { plotNow = plot; queue(); }

window.LampwerkCamera = {
  mount: function (el) { host = el; build(); },
  update: update
};
})();
