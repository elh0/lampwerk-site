/* Where plots live. For now: plots.json beside this page as the starting data, edits kept in this
   browser, and Export / Import to move the JSON by hand. The CloudKit store replaces this with the
   same calls (list, put, remove), one Plot record per plot. */
(function () {
"use strict";
var KEY = "lampwerk-web-plots-v1";
var plots = [];
var Store = {
  source: "",
  load: function () {
    try { var s = localStorage.getItem(KEY); if (s) { plots = JSON.parse(s); Store.source = "Edits in this browser"; return Promise.resolve(plots); } } catch (e) {}
    return fetch("plots.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) { plots = d; Store.source = "plots.json"; return plots; });
  },
  list: function () { return plots.slice().sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); }); },
  get: function (id) { return plots.find(function (p) { return p.id === id; }); },
  put: function (plot) { plot.updated = Lampwerk.nowStamp(); if (!Store.get(plot.id)) plots.unshift(plot); Store.persist(); },
  remove: function (id) { plots = plots.filter(function (p) { return p.id !== id; }); Store.persist(); },
  persist: function () { try { localStorage.setItem(KEY, JSON.stringify(plots)); Store.source = "Edits in this browser"; } catch (e) {} },
  reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} return Store.load(); },
  exportJSON: function () { return JSON.stringify(plots, null, 2); },
  importJSON: function (text) { var d = JSON.parse(text); if (!Array.isArray(d)) throw new Error("Not a plots.json list"); plots = d; Store.persist(); }
};
window.Store = Store;
})();
