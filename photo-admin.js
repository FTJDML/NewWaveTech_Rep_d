/* ==========================================================================
   BEELDBEHEER — prototypehulpmiddel
   --------------------------------------------------------------------------
   Laat de gebruiker op de gepubliceerde artifact-URL eigen foto's plaatsen.
   Werking:
     1. bestand kiezen  -> in de browser verkleind naar JPEG (data-URI);
     2. direct geplaatst in het bijbehorende <img data-slot="...">;
     3. opgeslagen in het JSON-blok #photo-store in de pagina;
     4. de pagina publiceert zichzelf opnieuw via de artifact-capability,
        zodat iedereen met de link de foto ziet.

   Buiten een artifact (lokaal, of in een productieversie) resolvet
   claude.use("artifact") naar null en blijft het paneel verborgen.

   Er gaat niets naar een externe server: het beeld wordt in de pagina zelf
   opgeslagen als data-URI.
   ========================================================================== */
(function () {
  'use strict';

  /* Slot -> plek in de pagina en de bestandsnaam die de repo verwacht.
     Zelfde namen als in assets/img/photos/README.md. */
  var SLOTS = [
    { id: 'hero', file: 'hero-checkout.jpg', label: 'Hero, rechterkolom', hint: 'Klant aan de kassa' },
    { id: 'transform', file: 'transform-store-floor.jpg', label: 'Domein 1 — Transformation, intro', hint: 'Winkelvloer' },
    { id: 'data', file: 'data-ar-shopping.jpg', label: 'Domein 2 — Data, Cloud & AI, intro', hint: 'AR-app in de winkel' },
    { id: 'operations', file: 'operations-rituals-storefront.jpg', label: 'Domein 3 — Operations, intro', hint: 'Winkelpui' },
    { id: 'uc-pos', file: 'usecase-pos-scan.jpg', label: 'Domein 1 — use case platformselectie', hint: 'Scannen bij de kassa' },
    { id: 'uc-commerce', file: 'usecase-unified-commerce.jpg', label: 'Domein 1 — use case unified commerce', hint: 'Betaalapp op telefoon' },
    { id: 'uc-supply', file: 'usecase-supply-chain.jpg', label: 'Domein 2 — use case datafundament', hint: 'Distributiecentrum' },
    { id: 'uc-payment', file: 'usecase-payment-terminal.jpg', label: 'Domein 3 — use case support', hint: 'Betaalterminal' }
  ];

  var MAX_WIDTH = 1800;         // ruim genoeg voor een hero op een groot scherm
  var QUALITY = 0.82;
  var MAX_TOTAL = 9 * 1024 * 1024;  // ruime marge onder de paginalimiet

  var panel = document.getElementById('photo-admin');
  var storeEl = document.getElementById('photo-store');
  if (!panel || !storeEl) return;

  var list = panel.querySelector('[data-photo-slots]');
  var statusEl = panel.querySelector('[data-photo-status]');
  var countEl = panel.querySelector('[data-photo-count]');
  var downloadBtn = panel.querySelector('[data-photo-download]');

  var store = readStore();
  var artifactApi = null;
  var downloadsApi = null;
  var readOnly = false;

  function readStore() {
    try {
      var parsed = JSON.parse(storeEl.textContent || '{}');
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (e) { return {}; }
  }

  function say(msg, kind) {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.className = 'photo-admin__status' + (kind ? ' is-' + kind : '');
  }

  function bytesOf(dataUri) { return Math.round((dataUri.length - 22) * 0.75); }

  function totalBytes() {
    return Object.keys(store).reduce(function (sum, k) { return sum + bytesOf(store[k]); }, 0);
  }

  function human(bytes) {
    return bytes > 1048576 ? (bytes / 1048576).toFixed(1) + ' MB'
                           : Math.round(bytes / 1024) + ' kB';
  }

  /* -------------------------------------------------- beeld toepassen ------ */
  function apply(slotId) {
    var img = document.querySelector('img[data-slot="' + slotId + '"]');
    if (!img) return;
    if (store[slotId]) {
      img.src = store[slotId];
    } else {
      var original = img.getAttribute('data-original-src');
      if (original) img.src = original;
    }
  }

  function applyAll() { SLOTS.forEach(function (s) { apply(s.id); }); }

  /* Bewaar het oorspronkelijke pad, zodat verwijderen kan terugvallen. */
  SLOTS.forEach(function (s) {
    var img = document.querySelector('img[data-slot="' + s.id + '"]');
    if (img && !img.hasAttribute('data-original-src')) {
      img.setAttribute('data-original-src', img.getAttribute('src'));
    }
  });
  applyAll();

  /* ------------------------------------------------- verkleinen naar JPEG -- */
  function toJpeg(file) {
    return new Promise(function (resolve, reject) {
      if (!/^image\//.test(file.type)) {
        reject(new Error('Dit is geen afbeelding.'));
        return;
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, MAX_WIDTH / img.naturalWidth);
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        try {
          resolve(canvas.toDataURL('image/jpeg', QUALITY));
        } catch (e) { reject(new Error('Kan dit beeld niet verwerken.')); }
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Kan dit bestand niet lezen.'));
      };
      img.src = url;
    });
  }

  /* ------------------------------------ complete pagina opnieuw opbouwen --- */
  /* De artifact-capability wil een volledige vervangende pagina. We bouwen die
     uit een schone kopie van het document: alles wat de viewer-shell injecteert
     eruit, en alle tijdelijke UI-status terug naar de uitgangspositie. */
  function buildDocument() {
    var root = document.documentElement.cloneNode(true);

    // 1. Injectie van de viewer-shell eruit: scripts die niet van ons zijn, en
    //    preloads daarvan. Stylesheets blijven staan — die bevatten geen
    //    sessiestatus en de shell levert er zelf een reset in mee.
    root.querySelectorAll('script').forEach(function (n) {
      if (!n.hasAttribute('data-proto')) n.remove();
    });
    root.querySelectorAll('link[rel="modulepreload"], link[rel="preload"][as="script"]').forEach(function (n) {
      n.remove();
    });

    // 2. Tijdelijke UI-status terugzetten.
    var nav = root.querySelector('.primary-nav');
    if (nav) nav.classList.remove('is-open');
    var toggle = root.querySelector('.nav-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');

    root.querySelectorAll('.accordion__trigger').forEach(function (t) {
      t.setAttribute('aria-expanded', 'false');
    });
    root.querySelectorAll('.accordion__panel').forEach(function (p) {
      p.setAttribute('hidden', '');
    });
    root.querySelectorAll('.filter-bar .chip').forEach(function (c, i) {
      c.classList.toggle('is-active', i === 0);
      c.setAttribute('aria-pressed', String(i === 0));
    });
    root.querySelectorAll('#insights-grid [data-claim]').forEach(function (c) {
      c.removeAttribute('hidden');
    });
    var empty = root.querySelector('#insights-empty');
    if (empty) empty.setAttribute('hidden', '');
    var modal = root.querySelector('#proto-modal');
    if (modal) modal.setAttribute('hidden', '');
    root.querySelectorAll('[data-form-status]').forEach(function (s) {
      if (s.classList.contains('form-status')) s.textContent = '';
      s.classList.remove('is-visible');
    });
    root.querySelectorAll('.anchor-bar__list a').forEach(function (a) {
      a.classList.remove('is-current');
    });
    var adminPanel = root.querySelector('#photo-admin');
    if (adminPanel) {
      adminPanel.setAttribute('hidden', '');           // script zet hem weer aan
      var details = adminPanel.querySelector('details');
      if (details) details.removeAttribute('open');
      var st = adminPanel.querySelector('[data-photo-status]');
      if (st) st.textContent = '';
      var lst = adminPanel.querySelector('[data-photo-slots]');
      if (lst) lst.textContent = '';                   // wordt opnieuw opgebouwd
    }

    // 3. Beeld: geplaatste foto's in de src, de rest terug naar het oorspronkelijke pad.
    SLOTS.forEach(function (s) {
      var img = root.querySelector('img[data-slot="' + s.id + '"]');
      if (!img) return;
      var original = img.getAttribute('data-original-src');
      img.setAttribute('src', store[s.id] || original || img.getAttribute('src'));
    });
    // Terugval-swaps van andere beelden ongedaan maken.
    root.querySelectorAll('img[data-fallback]:not([data-slot])').forEach(function (img) {
      var original = img.getAttribute('data-original-src');
      if (original) img.setAttribute('src', original);
    });

    // 4. Nieuwe beeldopslag wegschrijven.
    var target = root.querySelector('#photo-store');
    if (target) target.textContent = JSON.stringify(store);

    return '<!doctype html>\n' + root.outerHTML;
  }

  function publish() {
    if (!artifactApi) return Promise.resolve(false);
    var html = buildDocument();
    say('Pagina wordt opnieuw gepubliceerd…');
    return artifactApi.publish(html).then(function () {
      say('Gepubliceerd. De pagina wordt opnieuw geladen.', 'ok');
      return true;
    }).catch(function (err) {
      var code = (err && err.code) || 'upstream_error';
      if (code === 'conflict') {
        say('Er was net een nieuwere versie; de pagina laadt die nu.', 'ok');
      } else if (code === 'not_writer' || code === 'not_granted' || code === 'consent_required') {
        readOnly = true;
        render();
        say('Deze weergave is alleen-lezen: alleen de eigenaar van dit artifact kan beeld plaatsen.', 'warn');
      } else if (code === 'not_declared' || code === 'capability_disabled' || code === 'capability_removed') {
        panel.hidden = true;
      } else if (code === 'too_large') {
        say('De pagina wordt te groot met dit beeld. Gebruik een kleiner bestand of verwijder een andere foto.', 'warn');
      } else if (code === 'rate_limited') {
        say('Te snel achter elkaar gepubliceerd. Wacht even en probeer opnieuw.', 'warn');
      } else {
        say('Publiceren mislukte (' + code + '). De foto staat wel in deze weergave; probeer het opnieuw.', 'warn');
      }
      return false;
    });
  }

  /* ------------------------------------------------------------- paneel ---- */
  function render() {
    if (!list) return;
    list.textContent = '';

    SLOTS.forEach(function (slot) {
      var li = document.createElement('li');
      li.className = 'photo-admin__row' + (store[slot.id] ? ' is-filled' : '');

      var thumb = document.createElement('span');
      thumb.className = 'photo-admin__thumb';
      if (store[slot.id]) {
        var im = document.createElement('img');
        im.src = store[slot.id];
        im.alt = '';
        thumb.appendChild(im);
      }

      var meta = document.createElement('span');
      meta.className = 'photo-admin__meta';
      var strong = document.createElement('strong');
      strong.textContent = slot.label;
      var small = document.createElement('span');
      small.textContent = slot.hint + ' · ' + slot.file +
        (store[slot.id] ? ' · ' + human(bytesOf(store[slot.id])) : '');
      meta.appendChild(strong);
      meta.appendChild(small);

      var action = document.createElement('span');
      action.className = 'photo-admin__action';

      if (readOnly) {
        var ro = document.createElement('span');
        ro.className = 'photo-admin__ro';
        ro.textContent = 'alleen-lezen';
        action.appendChild(ro);
      } else {
        var inputId = 'photo-input-' + slot.id;
        var label = document.createElement('label');
        label.className = 'btn btn--ghost btn--sm';
        label.setAttribute('for', inputId);
        label.textContent = store[slot.id] ? 'Vervangen' : 'Kies foto';

        var input = document.createElement('input');
        input.type = 'file';
        input.id = inputId;
        input.accept = 'image/*';
        input.className = 'sr-only';
        input.addEventListener('change', function () {
          var file = input.files && input.files[0];
          input.value = '';
          if (file) pick(slot, file);
        });

        action.appendChild(label);
        action.appendChild(input);

        if (store[slot.id]) {
          var del = document.createElement('button');
          del.type = 'button';
          del.className = 'photo-admin__remove';
          del.textContent = 'Verwijderen';
          del.addEventListener('click', function () { remove(slot); });
          action.appendChild(del);
        }
      }

      li.appendChild(thumb);
      li.appendChild(meta);
      li.appendChild(action);
      list.appendChild(li);
    });

    var filled = Object.keys(store).length;
    if (countEl) {
      countEl.textContent = filled ? filled + ' van ' + SLOTS.length + ' geplaatst · ' + human(totalBytes())
                                   : 'nog geen eigen foto’s';
    }
    if (downloadBtn) downloadBtn.hidden = !(filled && downloadsApi);
  }

  function pick(slot, file) {
    say('Beeld wordt verkleind…');
    toJpeg(file).then(function (dataUri) {
      var projected = totalBytes() - (store[slot.id] ? bytesOf(store[slot.id]) : 0) + bytesOf(dataUri);
      if (projected > MAX_TOTAL) {
        say('Samen worden de foto’s te groot (' + human(projected) + '). Verwijder eerst een andere foto.', 'warn');
        return;
      }
      store[slot.id] = dataUri;
      storeEl.textContent = JSON.stringify(store);
      apply(slot.id);
      render();
      say('Geplaatst: ' + slot.label + ' (' + human(bytesOf(dataUri)) + ').');
      publish();
    }).catch(function (err) {
      say(err.message || 'Kon dit bestand niet verwerken.', 'warn');
    });
  }

  function remove(slot) {
    delete store[slot.id];
    storeEl.textContent = JSON.stringify(store);
    apply(slot.id);
    render();
    say('Verwijderd: ' + slot.label + '. De illustratie staat weer op zijn plek.');
    publish();
  }

  function downloadAll() {
    if (!downloadsApi) return;
    var ids = Object.keys(store);
    say('Bestanden worden aangeboden…');
    ids.reduce(function (chain, id) {
      return chain.then(function () {
        var slot = SLOTS.filter(function (s) { return s.id === id; })[0];
        if (!slot) return;
        return downloadsApi.save({ filename: slot.file, data: store[id] }).catch(function () { /* geweigerd */ });
      });
    }, Promise.resolve()).then(function () {
      say(ids.length + ' bestand(en) aangeboden met de juiste bestandsnaam voor assets/img/photos/.', 'ok');
    });
  }

  if (downloadBtn) downloadBtn.addEventListener('click', downloadAll);

  /* --------------------------------------------------------- opstarten ----- */
  if (!window.claude || typeof window.claude.use !== 'function') return;  // lokaal: paneel blijft verborgen

  Promise.all([
    window.claude.use('artifact').catch(function () { return null; }),
    window.claude.use('downloads').catch(function () { return null; })
  ]).then(function (apis) {
    artifactApi = apis[0];
    downloadsApi = apis[1];
    if (!artifactApi) return;      // geen publiceerrecht in deze weergave
    panel.hidden = false;
    render();
  });
})();
