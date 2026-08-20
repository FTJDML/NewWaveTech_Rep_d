/**
 * extract-cgi-design.js
 * ---------------------------------------------------------------------------
 * Leest de live CGI-pagina's uit en legt de visuele "source of truth" vast:
 * exacte kleuren, fonts, typografische schaal, spacing, contentbreedtes, de
 * header/footer-markup, de navigatielabels en de gebruikte assets.
 *
 * Vereist dat www.cgi.com bereikbaar is (network policy van de omgeving).
 * Draaien:
 *     node tools/extract-cgi-design.js
 * Output in ./design-source/ :
 *     <naam>-desktop.png / -mobile.png   volledige paginascreenshots
 *     <naam>-tokens.json                 computed styles, kleuren, fonts, nav
 *     <naam>-header.html / -footer.html  markup van de shell
 *     css/                               alle stylesheets van de pagina
 *     assets/                            logo's, hero-beelden, iconen
 */

const fs = require('fs');
const path = require('path');
const PW = '/opt/node22/lib/node_modules/playwright';
const { chromium } = require(PW);

const PAGES = [
  { name: 'home', url: 'https://www.cgi.com/en' },
  { name: 'retail', url: 'https://www.cgi.com/en/retail-consumer-services' },
  { name: 'retail-nl', url: 'https://www.cgi.com/nl/nl/retail-en-consumenten-dienstverlening' },
];

const OUT = path.join(process.cwd(), 'design-source');
const mkdir = p => fs.mkdirSync(p, { recursive: true });

/** Alles wat we in de browser willen weten, in één evaluate. */
function collect() {
  const cs = el => (el ? getComputedStyle(el) : null);
  const pick = (el, props) => {
    const s = cs(el);
    if (!s) return null;
    const o = {};
    props.forEach(p => { o[p] = s.getPropertyValue(p); });
    return o;
  };
  const TYPO = ['font-family', 'font-size', 'font-weight', 'line-height',
    'letter-spacing', 'text-transform', 'color'];
  const BOX = ['background-color', 'padding', 'margin', 'border', 'border-radius',
    'box-shadow', 'max-width', 'width'];

  // 1. CSS custom properties uit alle leesbare stylesheets
  const vars = {};
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }   // cross-origin
    for (const rule of rules || []) {
      if (!rule.style) continue;
      for (const prop of rule.style) {
        if (prop.startsWith('--')) {
          vars[prop] = { value: rule.style.getPropertyValue(prop).trim(), selector: rule.selectorText };
        }
      }
    }
  }

  // 2. Kleur- en fontinventarisatie over alle zichtbare elementen
  const colorCount = {}, bgCount = {}, fontCount = {}, radiusCount = {};
  const bump = (map, key) => { if (key) map[key] = (map[key] || 0) + 1; };
  document.querySelectorAll('body *').forEach(el => {
    if (!el.getClientRects().length) return;
    const s = getComputedStyle(el);
    bump(colorCount, s.color);
    if (s.backgroundColor !== 'rgba(0, 0, 0, 0)') bump(bgCount, s.backgroundColor);
    bump(fontCount, s.fontFamily);
    if (s.borderRadius !== '0px') bump(radiusCount, s.borderRadius);
  });
  const top = (map, n = 20) => Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n);

  // 3. Typografie per niveau — eerste voorkomen van elk element
  const typo = {};
  ['h1', 'h2', 'h3', 'h4', 'h5', 'p', 'li', 'a', 'small', 'blockquote', 'label'].forEach(tag => {
    const el = document.querySelector(tag);
    if (el) typo[tag] = pick(el, TYPO);
  });
  typo.body = pick(document.body, [...TYPO, 'background-color']);

  // 4. Buttons en links: de echte CGI-stijl
  const buttons = [...document.querySelectorAll(
    'a[class*="button"], a[class*="btn"], button, .cta, [class*="Button"]')]
    .filter(el => el.getClientRects().length)
    .slice(0, 12)
    .map(el => ({
      text: el.textContent.trim().slice(0, 40),
      cls: el.className.toString().slice(0, 80),
      style: pick(el, [...TYPO, ...BOX])
    }));

  // 5. Contentbreedtes: de breedste terugkerende container
  const widths = {};
  document.querySelectorAll('div, section, main, header, footer').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width > 600) {
      const key = Math.round(r.width) + 'px @ ' + (el.className.toString().slice(0, 40) || el.tagName);
      widths[key] = (widths[key] || 0) + 1;
    }
  });

  // 6. Navigatie en footerlinks, exact zoals ze er staan
  const linkList = sel => [...document.querySelectorAll(sel)]
    .map(a => ({ text: a.textContent.trim().replace(/\s+/g, ' ').slice(0, 60), href: a.getAttribute('href') }))
    .filter(l => l.text);

  // 7. Structuur van de pagina: koppen in documentorde
  const outline = [...document.querySelectorAll('h1, h2, h3')]
    .filter(h => h.getClientRects().length)
    .map(h => ({ level: h.tagName, text: h.textContent.trim().replace(/\s+/g, ' ').slice(0, 120) }));

  // 8. Beeld en video
  const media = {
    images: [...document.images].filter(i => i.width > 80)
      .map(i => ({ src: i.currentSrc || i.src, alt: i.alt, w: i.naturalWidth, h: i.naturalHeight })),
    videos: [...document.querySelectorAll('video, iframe')]
      .map(v => ({ tag: v.tagName, src: v.getAttribute('src') || v.currentSrc || '' })),
  };

  // 9. Stylesheets en fonts die de pagina laadt
  const sheets = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => l.href);
  const fontFaces = [];
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of rules || []) {
      if (rule.constructor.name === 'CSSFontFaceRule' || rule.type === 5) {
        fontFaces.push(rule.cssText.slice(0, 300));
      }
    }
  }

  const header = document.querySelector('header, [class*="header"], [role="banner"]');
  const footer = document.querySelector('footer, [class*="footer"], [role="contentinfo"]');

  return {
    url: location.href,
    title: document.title,
    cssVariables: vars,
    inventory: {
      textColors: top(colorCount), backgroundColors: top(bgCount),
      fonts: top(fontCount, 10), borderRadii: top(radiusCount, 10),
      containerWidths: Object.entries(widths).sort((a, b) => b[1] - a[1]).slice(0, 15),
    },
    typography: typo,
    buttons,
    nav: {
      primary: linkList('header a, [class*="header"] a, nav a').slice(0, 40),
      footer: linkList('footer a, [class*="footer"] a').slice(0, 60),
    },
    outline,
    media,
    stylesheets: sheets,
    fontFaces,
    headerHTML: header ? header.outerHTML.slice(0, 60000) : null,
    footerHTML: footer ? footer.outerHTML.slice(0, 60000) : null,
  };
}

async function saveBinary(page, url, dir) {
  try {
    const res = await page.context().request.get(url, { timeout: 20000 });
    if (!res.ok()) return null;
    const name = (url.split('/').pop() || 'asset').split('?')[0].slice(0, 80) || 'asset';
    const file = path.join(dir, name);
    fs.writeFileSync(file, await res.body());
    return name;
  } catch { return null; }
}

(async () => {
  mkdir(OUT); mkdir(path.join(OUT, 'css')); mkdir(path.join(OUT, 'assets'));

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
  });

  for (const { name, url } of PAGES) {
    const page = await context.newPage();
    console.log('→', url);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    } catch (e) {
      console.log('   niet geladen:', e.message.split('\n')[0]);
      await page.close();
      continue;
    }

    // cookiebanner wegklikken zodat de screenshots de pagina tonen
    for (const sel of ['#onetrust-accept-btn-handler', 'button:has-text("Accept")',
      'button:has-text("Accepteren")', '[aria-label*="accept" i]']) {
      try { await page.click(sel, { timeout: 2500 }); break; } catch { /* geen banner */ }
    }
    await page.waitForTimeout(1200);

    // lazy-loaded content laten inladen
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(800);

    const data = await page.evaluate(collect);
    fs.writeFileSync(path.join(OUT, `${name}-tokens.json`), JSON.stringify(data, null, 2));
    if (data.headerHTML) fs.writeFileSync(path.join(OUT, `${name}-header.html`), data.headerHTML);
    if (data.footerHTML) fs.writeFileSync(path.join(OUT, `${name}-footer.html`), data.footerHTML);

    await page.screenshot({ path: path.join(OUT, `${name}-desktop.png`), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, `${name}-mobile.png`), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });

    for (const href of data.stylesheets.slice(0, 12)) await saveBinary(page, href, path.join(OUT, 'css'));
    for (const img of data.media.images.slice(0, 25)) {
      if (img.src && /^https?:/.test(img.src)) await saveBinary(page, img.src, path.join(OUT, 'assets'));
    }

    console.log(`   ok — ${data.outline.length} koppen, ${Object.keys(data.cssVariables).length} css-variabelen,`,
      `${data.media.images.length} beelden`);
    await page.close();
  }

  await browser.close();
  console.log('\nKlaar. Output in', OUT);
})();
