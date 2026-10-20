/* Email signup for the app sites. Posts to the "App signups" Google Sheet (one tab per app).
   Markup: <form data-signup data-app="lampwerk" data-list="beta"> with an email input, a hidden
   input name="website" (bot trap), a submit button and a .su-done status line. */
(function () {
  var URL = 'https://script.google.com/macros/s/AKfycbyAiPN1LOlTFbZZqsByr86l-Uc_9zBqYRrgudf9A6UbW7m2mP7H46oYghL8HYOEminiwg/exec'; // App signups web app URL from Apps Script (Deploy > Web app). Empty = email us instead.
  var NAMES = { lampwerk: 'Lampwerk', outandscout: 'Out & Scout', aglo: 'Aglo' };
  var OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  document.querySelectorAll('form[data-signup]').forEach(function (f) {
    var em = f.querySelector('input[type=email]'), hp = f.querySelector('input[name=website]');
    var out = f.querySelector('.su-done'), btn = f.querySelector('[type=submit]');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (hp && hp.value) return;
      var v = em.value.trim(), app = f.dataset.app, list = f.dataset.list || 'beta';
      if (!OK.test(v)) { out.textContent = 'Check that email address.'; em.focus(); return; }
      if (!URL) {
        location.href = 'mailto:hello@eltio.studio?subject=' + encodeURIComponent(NAMES[app] + ' ' + list) + '&body=' + encodeURIComponent(v);
        return;
      }
      btn.disabled = true; out.textContent = 'Sending…';
      fetch(URL, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ app: app, list: list, email: v, page: location.pathname + location.hash }) })
        .then(function () { f.classList.add('sent'); em.value = ''; out.textContent = f.dataset.done || "You're on the list."; })
        .catch(function () { out.innerHTML = 'That didn’t send. Email <a href="mailto:hello@eltio.studio">hello@eltio.studio</a> instead.'; })
        .then(function () { btn.disabled = false; });
    });
  });

  // A link with data-signup-list (e.g. "Join the founding list") points a form at that list.
  document.querySelectorAll('a[data-signup-list]').forEach(function (a) {
    a.addEventListener('click', function () {
      var f = document.querySelector((a.getAttribute('href') || '') + ' form[data-signup]') || document.querySelector('form[data-signup]');
      if (!f) return;
      f.dataset.list = a.dataset.signupList;
      if (a.dataset.signupDone) f.dataset.done = a.dataset.signupDone;
      var n = f.querySelector('.su-note'); if (n && a.dataset.signupNote) n.textContent = a.dataset.signupNote;
      var b = f.querySelector('[type=submit]'); if (b && a.dataset.signupButton) b.textContent = a.dataset.signupButton;
    });
  });
})();
