/* ==========================================================================
   CGI Retail & Consumer Services — managementprototype
   Lichte, CMS-realistische interactie (§19). Geen frameworks, geen build.
   Onderdelen:
     1. Mobiel menu
     2. Accordions (capabilities, cases)
     3. Ankerbalk: actieve sectie markeren + offset voor sticky header
     4. Insights-filter
     5. Modal (prototypeformulier, focus trap, Esc)
     6. Dummy formulieren: geen verzending
     7. Beeld met terugvaloptie (eigen foto -> placeholder-illustratie)
     8. Jaartal in de footer
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- 1. Menu */
  var navToggle = document.querySelector('.nav-toggle');
  var primaryNav = document.getElementById('primary-nav');

  if (navToggle && primaryNav) {
    navToggle.addEventListener('click', function () {
      var open = primaryNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
    });

    // Sluit het mobiele menu bij navigatie binnen de pagina.
    primaryNav.addEventListener('click', function (event) {
      var link = event.target.closest('a[href^="#"]');
      if (link) {
        primaryNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });

    // Reset de menustatus als het viewport weer desktopbreedte krijgt.
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1023) {
        primaryNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ----------------------------------------------------------- 2. Accordions */
  document.querySelectorAll('[data-accordion]').forEach(function (accordion) {
    accordion.addEventListener('click', function (event) {
      var trigger = event.target.closest('.accordion__trigger');
      if (!trigger || !accordion.contains(trigger)) return;

      var panel = document.getElementById(trigger.getAttribute('aria-controls'));
      var expanded = trigger.getAttribute('aria-expanded') === 'true';

      trigger.setAttribute('aria-expanded', String(!expanded));
      if (panel) panel.hidden = expanded;
    });
  });

  /* -------------------------------------------------- 3. Ankerbalk highlight */
  var anchorLinks = Array.prototype.slice.call(
    document.querySelectorAll('.anchor-bar__list a[href^="#"]')
  );
  var sections = anchorLinks
    .map(function (link) { return document.querySelector(link.getAttribute('href')); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var setCurrent = function (id) {
      anchorLinks.forEach(function (link) {
        link.classList.toggle('is-current', link.getAttribute('href') === '#' + id);
      });
    };

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setCurrent(entry.target.id);
      });
    }, {
      // Bovenrand net onder de sticky header + ankerbalk.
      rootMargin: '-45% 0px -50% 0px',
      threshold: 0
    });

    sections.forEach(function (section) { observer.observe(section); });
  }

  /* ------------------------------------------------------ 4. Insights-filter */
  var chips = document.querySelectorAll('.filter-bar .chip');
  var insightsGrid = document.getElementById('insights-grid');
  var insightsEmpty = document.getElementById('insights-empty');

  if (chips.length && insightsGrid) {
    var cards = Array.prototype.slice.call(insightsGrid.querySelectorAll('[data-claim]'));

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var filter = chip.getAttribute('data-filter');

        chips.forEach(function (other) {
          var active = other === chip;
          other.classList.toggle('is-active', active);
          other.setAttribute('aria-pressed', String(active));
        });

        var visible = 0;
        cards.forEach(function (card) {
          var show = filter === 'all' || card.getAttribute('data-claim') === filter;
          card.hidden = !show;
          if (show) visible++;
        });

        if (insightsEmpty) insightsEmpty.hidden = visible !== 0;
      });
    });
  }

  /* ---------------------------------------------------------------- 5. Modal */
  var modal = document.getElementById('proto-modal');
  var modalTitle = document.getElementById('modal-title');
  var lastFocused = null;

  var focusableSelector = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function openModal(title) {
    if (!modal) return;
    lastFocused = document.activeElement;
    if (title && modalTitle) modalTitle.textContent = title;

    // Reset formulierstatus bij iedere opening.
    var form = modal.querySelector('form');
    if (form) {
      form.reset();
      var status = form.querySelector('[data-form-status]');
      if (status) {
        status.textContent = '';
        status.classList.remove('is-visible');
      }
    }

    modal.hidden = false;
    document.body.classList.add('has-modal');

    var first = modal.querySelector(focusableSelector);
    if (first) first.focus();
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('has-modal');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  document.querySelectorAll('[data-modal-open]').forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      openModal(trigger.getAttribute('data-modal-title') || 'Neem contact op');
    });
  });

  if (modal) {
    modal.addEventListener('click', function (event) {
      if (event.target.closest('[data-modal-close]')) closeModal();
    });

    document.addEventListener('keydown', function (event) {
      if (modal.hidden) return;

      if (event.key === 'Escape') {
        closeModal();
        return;
      }

      // Eenvoudige focus trap zolang de modal open is.
      if (event.key === 'Tab') {
        var nodes = Array.prototype.slice
          .call(modal.querySelectorAll(focusableSelector))
          .filter(function (node) { return node.offsetParent !== null; });
        if (!nodes.length) return;

        var first = nodes[0];
        var last = nodes[nodes.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
  }

  /* ------------------------------------------------- 6. Niet-actieve formulieren */
  document.querySelectorAll('[data-dummy-form]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var status = form.querySelector('[data-form-status]');
      if (status) {
        status.textContent = 'Dit is een managementprototype. Er zijn geen gegevens verzonden.';
        status.classList.add('is-visible');
      }
    });
  });

  /* ------------------------------------------- 7. Beeld met terugvaloptie
     Eigen foto's staan in assets/img/photos/. Zolang een bestand daar nog niet
     staat, valt het <img> terug op de placeholder-illustratie in data-fallback. */
  document.querySelectorAll('img[data-fallback]').forEach(function (img) {
    var swap = function () {
      var fallback = img.getAttribute('data-fallback');
      if (fallback && img.getAttribute('src') !== fallback) img.src = fallback;
    };
    img.addEventListener('error', swap);
    // Al gefaald voordat deze listener stond (cache/parse-race).
    if (img.complete && img.naturalWidth === 0) swap();
  });

  /* --------------------------------------------------------------- 8. Jaartal */
  var yearSlot = document.querySelector('[data-year]');
  if (yearSlot) yearSlot.textContent = String(new Date().getFullYear());
})();
