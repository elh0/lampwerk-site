/* Lampwerk model and maths, ported from the iOS app (Lampwerk/Model: Lamp.swift, Specs.swift,
   LightMath.swift, Starters.swift). Plots use the exact JSON the phone saves (plots.json), so the
   same records can sync through CloudKit later. Keep this file in step with the Swift. */
(function (root) {
"use strict";

// id, name, brand, group, kind, watts, beam, cct [lo, hi] or null, efficacy, width, depth
var RAW = [
  ["s30","SkyPanel S30-C","Arri","Panels","panel",210,105,[2800,10000],60,.68,.36],
  ["s60","SkyPanel S60-C","Arri","Panels","panel",420,105,[2800,10000],60,.68,.36],
  ["x21","SkyPanel X21","Arri","Panels","panel",800,121,[2000,20000],65,.9,.45],
  ["gem","Gemini 1x1","Litepanels","Panels","panel",200,95,[2700,10000],60,.4,.4],
  ["lm4","Litemat Spectrum 4","Litegear","Panels","panel",220,120,[2700,6500],55,1.2,.3],
  ["a600","600c Pro","Aputure","Point source","point",720,55,[2300,10000],70,.42,.28],
  ["a1200","1200d Pro","Aputure","Point source","point",1400,66,[5600,5600],75,.5,.32],
  ["forza","Forza 500","Nanlite","Point source","point",580,55,[5600,5600],70,.4,.26],
  ["vtx","Vortex8","Creamsource","Point source","panel",650,110,[2200,15000],70,.6,.32],
  ["orb","Orbiter","Arri","Point source","point",500,60,[2000,20000],65,.4,.3],
  ["titan","Titan Tube","Astera","Tubes","tube",72,135,[1750,20000],60,1.03,.06],
  ["helios","Helios Tube","Astera","Tubes","tube",36,135,[1750,20000],60,.52,.06],
  ["pavo","PavoTube II 30X","Nanlite","Tubes","tube",36,160,[2700,12000],55,1.2,.05],
  ["b7c","Accent B7c","Aputure","Tubes","practical",7,300,[2000,10000],60,.08,.08],
  ["h12","1.2K HMI par","generic","HMI","fresnel",1200,30,[5600,5600],90,.42,.34],
  ["h4","4K HMI par","generic","HMI","fresnel",4000,30,[5600,5600],90,.6,.48],
  ["m18","M18","Arri","HMI","fresnel",1800,40,[5600,5600],90,.5,.42],
  ["h18","18K HMI fresnel","generic","HMI","fresnel",18000,50,[5600,5600],95,1,.8],
  ["t300","300W fresnel","generic","Tungsten","fresnel",300,55,[3200,3200],20,.22,.2],
  ["t650","650W fresnel","generic","Tungsten","fresnel",650,54,[3200,3200],20,.28,.24],
  ["t1k","1K fresnel","generic","Tungsten","fresnel",1000,54,[3200,3200],20,.34,.28],
  ["t2k","2K fresnel","generic","Tungsten","fresnel",2000,57,[3200,3200],20,.42,.34],
  ["red","Redhead 800W","generic","Tungsten","point",800,87,[3200,3200],20,.26,.22],
  ["lamp","Table lamp","practical","Practicals","practical",60,300,[2700,2700],15,.3,.3],
  ["china","China ball","practical","Practicals","practical",150,300,[2700,5600],40,.5,.5],
  ["s360","SkyPanel S360-C","Arri","Panels","panel",1500,105,[2800,10000],60,1.2,.7],
  ["vtx24","Vortex24","Creamsource","Panels","panel",1300,110,[2200,15000],70,1.2,.32],
  ["m40","M40","Arri","HMI","fresnel",4000,30,[5600,5600],90,.7,.6],
  ["m90","M90","Arri","HMI","fresnel",9000,49,[5600,5600],90,1,.9],
  ["h6","6K HMI par","generic","HMI","fresnel",6000,30,[5600,5600],90,.8,.65],
  ["amax","ARRIMAX 18/12","Arri","HMI","fresnel",18000,50,[5600,5600],95,1.1,1],
  ["t5k","5K Skypan","generic","Tungsten","panel",5000,100,[3200,3200],20,.9,.5],
  ["t10k","10K fresnel","generic","Tungsten","fresnel",10000,50,[3200,3200],22,.7,.6],
  ["t20k","20K fresnel","generic","Tungsten","fresnel",20000,50,[3200,3200],22,.9,.8],
  ["maxi","Maxi Brute, 9-light","generic","Big set","point",9000,30,[3200,3200],25,.9,.3],
  ["dino","Dino, 24-light","generic","Big set","point",24000,30,[3200,3200],25,1.2,.4],
  ["space6","Spacelight 6K","generic","Big set","practical",6000,300,[3200,3200],20,.9,.9],
  ["ball4","Balloon light, 4K HMI","generic","Big set","practical",4000,300,[5600,5600],80,1.5,1.5],
  ["ball8","Crane balloon, 8K HMI","generic","Big set","practical",8000,300,[5600,5600],80,2,2],
  ["f4","4x4 frame, ultra bounce","grip","Grip","bounce",0,0,null,0,1.2,.06],
  ["f4d","4x4 diff frame","grip","Grip","diff",0,0,null,0,1.2,.06],
  ["f6","6x6 diff frame","grip","Grip","diff",0,0,null,0,1.8,.06],
  ["f8d","8x8 diff frame","grip","Grip","diff",0,0,null,0,2.4,.06],
  ["f12","12x12 diff frame","grip","Grip","diff",0,0,null,0,3.6,.08],
  ["f20d","20x20 diff frame","grip","Grip","diff",0,0,null,0,6.1,.1],
  ["flag","Flag 24x36","grip","Grip","flag",0,0,null,0,.9,.06],
  ["floppy","Floppy 4x4","grip","Grip","flag",0,0,null,0,1.2,.06],
  ["poly","Poly bounce 4x8","grip","Grip","bounce",0,0,null,0,1.2,.08]
];

// Maker figures (Specs.swift): lux at 3 m, beam measured, wall draw in watts, source.
var SPECS = {
  s30:[782,105,200,"maker"], s60:[1535,105,400,"maker"], x21:[1839,121,800,"retailer"], gem:[614,95,200,"maker"],
  lm4:[834,120,200,"maker"], a600:[5020,55,720,"maker"], a1200:[6380,66,1440,"maker"], forza:[8376,55,560,"maker"],
  vtx:[2340,110,660,"maker"], orb:[2333,60,500,"maker"], titan:[87,135,48,"maker"], helios:[44,135,24,"maker"],
  pavo:[84,160,70,"maker"], b7c:[12,300,12,"maker"], m18:[23556,40,2000,"maker"], h12:[27222,30,1300,"estimate"],
  h4:[75667,30,5300,"maker"], h18:[80670,50,19400,"retailer"], t300:[500,55,300,"maker"], t650:[1194,54,650,"maker"],
  t1k:[2033,54,1000,"retailer"], m40:[72222,30,4000,"maker"], m90:[84333,49,9000,"maker"], amax:[142500,50,18000,"maker"], t2k:[4560,57,2000,"retailer"], red:[933,87,800,"retailer"], china:[18,300,150,"estimate"]
};

var MATERIALS = [
  ["Hampshire frost",.85,90],["Opal",.75,110],["251 quarter white",.65,125],["China silk",.6,135],
  ["250 half white",.5,145],["Light grid cloth",.45,155],["216 full white",.35,165],["Half grid cloth",.35,165],
  ["Magic cloth",.3,170],["Full grid cloth",.25,170],["Bleached muslin",.2,175],["Unbleached muslin",.15,175]
].map(function (m) { return { name: m[0], pass: m[1], spread: m[2] }; });
var MAT = {}; MATERIALS.forEach(function (m) { MAT[m.name] = m; });
var STANDARD = "216 full white";
var DIFF_ALL = [STANDARD].concat(MATERIALS.map(function (m) { return m.name; }).filter(function (n) { return n !== STANDARD; }));
var DIFF_GRID = ["Full grid cloth"].concat(MATERIALS.map(function (m) { return m.name; }).filter(function (n) { return n !== "Full grid cloth"; }));

var GELS = ["None","¼ CTO","½ CTO","Full CTO","¼ CTB","½ CTB","Full CTB","¼ Plus green"];
var GEL_LOSS = {"¼ CTO":.81,"½ CTO":.73,"Full CTO":.58,"¼ CTB":.74,"½ CTB":.52,"Full CTB":.36,"¼ Plus green":.9};
var MOD_LOSS = {"Snapgrid 40°":.8,"Softbox":.45,"Dome M":.45,"Lantern":.35,"Fresnel lens":1.3,"Snoot":.9,"Chimera, medium":.4,"8x8 full grid":.3,"Honeycrate":.85,"Shade":.6};
var MOD_BEAM = {"Snapgrid 40°":40,"Softbox":130,"Dome M":140,"Lantern":300,"Fresnel lens":30,"Snoot":15,"Chimera, medium":120,"8x8 full grid":150,"Honeycrate":70,"Shade":300};
var KIND_MODS = { panel:["None","Snapgrid 40°","Softbox"], point:["None","Dome M","Lantern","Fresnel lens"],
  fresnel:["Barn doors","Snoot","Chimera, medium","8x8 full grid"], tube:["None","Honeycrate"], practical:["None","Shade"] };

var ROLES = ["key","fill","back","kicker","practical","diff","neg"];
var SHOTS = ["wide","close","reverse"];
var GROUPS = ["Panels","Point source","Tubes","HMI","Tungsten","Practicals","Big set","Grip"];

var LIB = RAW.map(function (r) {
  var l = { id:r[0], name:r[1], brand:r[2], group:r[3], kind:r[4], watts:r[5], beam:r[6], cct:r[7], efficacy:r[8], width:r[9], depth:r[10] };
  var s = SPECS[l.id];
  l.spec = s ? { lux3m:s[0], beam:s[1], drawW:s[2], source:s[3] } : null;
  l.isLight = l.watts > 0;
  l.isGrip = l.kind === "bounce" || l.kind === "diff" || l.kind === "flag";
  l.isHMI = l.group === "HMI";
  l.isDimmable = l.isLight && l.group !== "HMI" && l.group !== "Tungsten";
  l.fullName = ["generic","grip","practical"].indexOf(l.brand) >= 0 ? l.name : l.brand + " " + l.name;
  var t = l.name.replace(" Pro","").replace("SkyPanel ","");
  l.shortName = t.split(",")[0];
  l.modifiers = l.kind === "diff" ? (l.id === "f12" || l.id === "f20d" ? DIFF_GRID : DIFF_ALL) : (KIND_MODS[l.kind] || ["None"]);
  return l;
});
var BYID = {}; LIB.forEach(function (l) { BYID[l.id] = l; });
function lamp(item) { return BYID[item.lampID] || null; }

// Supply (LightMath.Supply): the region sets the volts; circuits pack to the breaker picked.
var REGIONS = {
  uk: { volts: 230, title: "UK and Europe, 230 V", circuits: [13,16,32,63], standard: 16 },
  us: { volts: 120, title: "US, 120 V", circuits: [15,20,60,100], standard: 20 }
};
var WARN_SHARE = 0.8;

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function bearing(a, b) { return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI; }
function angleBetween(a, b) { return Math.abs((((a - b) % 360) + 540) % 360 - 180); }

function isOn(plot, item) { var l = lamp(item); return !!(l && l.isLight) && (item.offIn || []).indexOf(plot.shot) < 0; }
function lightsOn(plot) { return plot.items.filter(function (it) { return isOn(plot, it); }); }

function material(frame) { var l = lamp(frame); return MAT[frame.modifier] || MAT[l ? l.modifiers[0] : STANDARD] || MAT[STANDARD]; }

function diffFrame(item, plot) {
  var l = lamp(item); if (!l || !l.isLight) return null;
  var own = MOD_BEAM[item.modifier] != null ? MOD_BEAM[item.modifier] : l.beam;
  if (own >= 300) return null;
  var best = null, bd = Infinity;
  plot.items.forEach(function (f) {
    var fl = lamp(f); if (!fl || fl.kind !== "diff") return;
    var d = dist(item, f);
    if (d > .15 && d < 2.2 && angleBetween(bearing(item, f), item.angle) <= Math.max(20, own / 2) && d < bd) { best = f; bd = d; }
  });
  return best;
}

function spread(item, plot) {
  var l = lamp(item); if (!l) return 0;
  var beam = MOD_BEAM[item.modifier] != null ? MOD_BEAM[item.modifier] : l.beam;
  if (beam < 300 && plot) { var f = diffFrame(item, plot); if (f) beam = Math.max(beam, material(f).spread); }
  return beam;
}

function beamGain(measured, now) { if (measured >= 300) return 1; return Math.max(.4, measured / 60) / Math.max(.4, now / 60); }

function luxFrom(item, p, plot) {
  var l = lamp(item); if (!l || !l.isLight) return 0;
  var beam = spread(item, plot);
  var d = Math.max(.5, dist(item, p));
  var inBeam = beam >= 300 || angleBetween(bearing(item, p), item.angle) <= beam / 2 ? 1 : .12;
  var frame = plot ? diffFrame(item, plot) : null;
  var losses = (item.output / 100) * (MOD_LOSS[item.modifier] || 1) * (GEL_LOSS[item.gel] || 1) * (frame ? material(frame).pass : 1);
  if (l.spec) return Math.round(l.spec.lux3m * 9 / (d * d) * losses * inBeam * beamGain(l.spec.beam, beam));
  var lumens = l.watts * l.efficacy * losses;
  return Math.round(lumens * inBeam / (Math.max(.4, beam / 60) * d * d) * .9);
}

function luxRole(plot, p, role) {
  var total = 0;
  plot.items.forEach(function (it) {
    if (it.role !== role) return;
    var l = lamp(it); if (!l) return;
    if (l.isLight) { if (isOn(plot, it)) total += luxFrom(it, p, plot); }
    else if (l.kind === "bounce") {
      var key = 0;
      plot.items.forEach(function (o) { if (isOn(plot, o) && o.role === "key") key += luxFrom(o, p, plot); });
      total += key * .45 * Math.min(1, l.width / 1.2) / Math.max(1, Math.pow(dist(it, p), 2) / 2);
    }
  });
  return total;
}
function keyLux(plot) { return luxRole(plot, plot.talent, "key"); }
function fillLux(plot) { return luxRole(plot, plot.talent, "fill"); }

function trim(v) { var s = v.toFixed(1); return s.slice(-2) === ".0" ? s.slice(0, -2) : s; }
function ratioText(plot) {
  var k = keyLux(plot), f = fillLux(plot);
  if (!(k > 0)) return "—";
  if (!(f > 0)) return "No fill";
  var r = k / f;
  if (r < 1) return "1:" + trim(1 / r);
  return trim(r < 3 ? Math.round(r * 2) / 2 : Math.round(r)) + ":1";
}

function lampAmps(l, supply) { if (!l.isLight) return 0; var v = REGIONS[supply.region].volts; return l.spec ? l.spec.drawW / v : l.watts / v * (l.isHMI ? 1.1 : 1); }
function itemAmps(item, supply) { var l = lamp(item); if (!l) return 0; var full = lampAmps(l, supply); return l.isDimmable ? full * Math.max(.15, item.output / 100) : full; }

function circuits(plot, supply) {
  var out = [];
  plot.items.forEach(function (it) {
    var l = lamp(it); if (!l || !l.isLight) return;
    var a = lampAmps(l, supply);
    var c = out.find(function (x) { return x.amps + a <= supply.circuitAmps; });
    if (c) { c.amps += a; c.items.push(it.id); }
    else out.push({ id: String.fromCharCode(65 + out.length % 26), amps: a, items: [it.id], capacity: supply.circuitAmps });
  });
  out.forEach(function (c) { c.share = c.amps / c.capacity; c.isWarning = c.share > WARN_SHARE; });
  return out;
}

function load(plot, supply) {
  var a = 0, w = 0;
  lightsOn(plot).forEach(function (it) { var l = lamp(it); a += itemAmps(it, supply); w += l.spec ? l.spec.drawW : l.watts; });
  return { amps: a, watts: w };
}

function beamLength(l, output) { return Math.min(5.5, 1.4 + Math.sqrt(l.watts * output / 100) / 9); }
function glowRadius(l, output) { return Math.min(2.2, .6 + Math.sqrt(l.watts * output / 100) / 8); }

// Starters.swift, for new plots made on the web.
var TALENT = { x: 3, y: 4.4 };
var STARTERS = {
  threePoint: { title: "Three-point", items: function () { return [P("a600",1.2,3,"key",5600,80,[]), P("f4",4.7,4.6,"fill"), P("s30",4.4,2.1,"back",5600,60,["reverse"])]; } },
  rembrandt: { title: "Rembrandt", items: function () { return [P("t1k",1.3,2.6,"key",3200), P("poly",4.8,5,"fill"), P("titan",4.6,2.3,"kicker",3200,40,["close"])]; } },
  window: { title: "Window key", items: function () {
    var key = P("m18",-.4,3.6,"key",5600); key.modifier = "8x8 full grid";
    var back = P("s60",4.9,2.2,"back",5600,50,["wide"]); back.gel = "½ CTB";
    return [key, P("f12",.5,3.8,"diff"), P("lamp",4.6,5.6,"practical",2700,null,["close"]), P("f4",4.8,4,"fill"), back]; } },
  car: { title: "Car interior", items: function () { return [P("titan",2,3.1,"key",4300,50), P("helios",4,3.3,"fill",4300,25,["reverse"]), P("b7c",3,5.2,"practical",2400,60)]; } },
  blank: { title: "Empty room", items: function () { return []; } }
};
function uuid() { return (root.crypto && crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, function () { return (Math.random() * 16 | 0).toString(16); })).toUpperCase(); }
function P(id, x, y, role, cct, output, off) {
  var l = BYID[id], aim = bearing({ x: x, y: y }, TALENT);
  return { id: uuid(), lampID: id, x: x, y: y, angle: l.isGrip ? aim + 90 : aim, role: role,
    cct: cct || (l.cct ? l.cct[0] : 5600), output: output || 100, modifier: l.modifiers[0], gel: "None", offIn: off || [] };
}
// Swift's JSONEncoder writes Date as seconds since 1 Jan 2001.
var REF = 978307200;
function nowStamp() { return Date.now() / 1000 - REF; }
function stampDate(s) { return new Date((s + REF) * 1000); }

function newPlot(plots, name, starter, width, depth) {
  width = width || 6; depth = depth || 8.4;
  var number = plots.reduce(function (m, p) { return Math.max(m, p.number || 0); }, 0) + 1;
  var dx = (width - 6) / 2, dy = (depth - 8.4) / 2;
  var items = STARTERS[starter].items();
  items.forEach(function (it) { it.x += dx; it.y += dy; });
  return { id: uuid(), name: name || "Untitled", number: number, starter: starter, shot: "wide",
    talent: { x: 3 + dx, y: 4.4 + dy }, camera: { x: 3 + dx, y: Math.min(depth - .4, 7.6 + dy) },
    roomWidth: width, roomDepth: depth, items: items, updated: nowStamp() };
}

function title(item) { var n = (item.name || "").trim(); return n || item.role.charAt(0).toUpperCase() + item.role.slice(1); }

// Kit list and hire order: what has to be on the truck for this plot, every setup.
function kit(plot) {
  var heads = {}, mods = {}, gels = {}, grip = {};
  function add(map, k, n) { map[k] = (map[k] || 0) + (n || 1); }
  plot.items.forEach(function (it) {
    var l = lamp(it); if (!l) return;
    if (l.isLight) {
      add(heads, l.id);
      if (it.modifier && it.modifier !== "None") add(mods, it.modifier + (it.modifier === "Barn doors" ? "" : " (" + l.shortName + ")"));
      if (it.gel && it.gel !== "None") add(gels, it.gel);
    } else add(grip, l.kind === "diff" ? l.name + ", " + material(it).name : l.name);
  });
  return {
    heads: Object.keys(heads).map(function (id) { return { qty: heads[id], name: BYID[id].fullName, group: BYID[id].group }; })
      .sort(function (a, b) { return GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.name.localeCompare(b.name); }),
    modifiers: Object.keys(mods).sort().map(function (k) { return { qty: mods[k], name: k }; }),
    gels: Object.keys(gels).sort().map(function (k) { return { qty: gels[k], name: k }; }),
    grip: Object.keys(grip).sort().map(function (k) { return { qty: grip[k], name: k }; }),
    stands: plot.items.length
  };
}

function hireOrder(plot, supply) {
  var k = kit(plot), C = circuits(plot, supply), lines = [];
  lines.push("Hire order: " + plot.name);
  lines.push("");
  function block(head, rows) { if (!rows.length) return; lines.push(head.toUpperCase()); rows.forEach(function (r) { lines.push(r.qty + " × " + r.name); }); lines.push(""); }
  var byGroup = {};
  k.heads.forEach(function (h) { (byGroup[h.group] = byGroup[h.group] || []).push(h); });
  GROUPS.forEach(function (g) { if (byGroup[g]) block(g, byGroup[g]); });
  block("Modifiers", k.modifiers);
  block("Gels", k.gels);
  block("Grip", k.grip);
  lines.push("STANDS");
  lines.push(k.stands + " × stand (one per head and frame; pick types with your grip)");
  lines.push("");
  lines.push("POWER");
  lines.push(C.length + " × " + supply.circuitAmps + " A circuit" + (C.length === 1 ? "" : "s") + " at " + REGIONS[supply.region].volts + " V, full load " + C.reduce(function (s, c) { return s + c.amps; }, 0).toFixed(1) + " A");
  lines.push("");
  lines.push("Figures approximate. Check tie-ins and generators with your spark.");
  return lines.join("\n");
}

// Swaps the head, keeping where it stands, its aim and its setups (QuickLamps.swift swapHead).
function swapHead(item, l) {
  var old = lamp(item), wasGrip = old ? old.isGrip : false;
  item.lampID = l.id;
  if (l.modifiers.indexOf(item.modifier) < 0) item.modifier = l.modifiers[0];
  if (l.cct) item.cct = Math.min(l.cct[1], Math.max(l.cct[0], item.cct));
  if (l.isGrip !== wasGrip) { item.angle += l.isGrip ? 90 : -90; item.role = l.isGrip ? "diff" : "fill"; }
}

// A 4x4 of 216 in front of the head, square to its beam (Plot.addDiff).
function addDiff(plot, index) {
  var it = plot.items[index], reach = Math.min(.9, Math.max(.5, dist(it, plot.talent) * .4)), a = it.angle * Math.PI / 180;
  var f = { id: uuid(), lampID: "f4d", x: it.x + reach * Math.cos(a), y: it.y + reach * Math.sin(a), angle: it.angle + 90, role: "diff", cct: 0, output: 100, modifier: STANDARD, gel: "None", offIn: [] };
  if (it.height != null) f.height = it.height;
  plot.items.splice(index + 1, 0, f);
  return f;
}

// The heads a gaffer reaches for most (QuickLamps.ids); recents go first.
var QUICK = ["a600", "a1200", "m18", "forza", "s60", "s30", "gem", "titan", "helios", "china", "f8d", "floppy"];

// Light lost through a diff material, as a gaffer says it: "1½ stops" (Diffusion.stops).
function stopsText(m) {
  var s = Math.round(Math.log2(1 / m.pass) * 2) / 2, whole = Math.floor(s), half = s - whole >= .5;
  var t = whole === 0 ? (half ? "½" : "0") : whole + (half ? "½" : "");
  return t + (s === 1 ? " stop" : " stops");
}
var FRAMES = ["f4d", "f6", "f8d", "f12", "f20d"];

root.Lampwerk = {
  stopsText: stopsText, FRAMES: FRAMES,
  swapHead: swapHead, addDiff: addDiff, QUICK: QUICK, MOD_BEAM: MOD_BEAM,
  LIB: LIB, BYID: BYID, GELS: GELS, ROLES: ROLES, SHOTS: SHOTS, GROUPS: GROUPS, REGIONS: REGIONS, STARTERS: STARTERS,
  MATERIALS: MATERIALS, WARN_SHARE: WARN_SHARE,
  lamp: lamp, isOn: isOn, lightsOn: lightsOn, dist: dist, bearing: bearing, angleBetween: angleBetween,
  material: material, diffFrame: diffFrame, spread: spread, luxFrom: luxFrom, luxRole: luxRole, keyLux: keyLux, fillLux: fillLux,
  ratioText: ratioText, lampAmps: lampAmps, itemAmps: itemAmps, circuits: circuits, load: load,
  beamLength: beamLength, glowRadius: glowRadius, newPlot: newPlot, uuid: uuid, nowStamp: nowStamp, stampDate: stampDate,
  title: title, kit: kit, hireOrder: hireOrder, trim: trim
};
})(typeof window !== "undefined" ? window : globalThis);
