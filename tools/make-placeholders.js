/**
 * make-placeholders.js
 * ---------------------------------------------------------------------------
 * Genereert de placeholder-illustraties in assets/img/.
 *
 * Waarom illustraties en geen stockfoto's: deze omgeving heeft geen toegang tot
 * beeldbanken, en een gepubliceerd artifact mag geen externe hosts laden. Deze
 * SVG's zijn opgebouwd uit de CGI-merkkleuren, zodat de demopagina vol en
 * afgemaakt aanvoelt zonder te suggereren dat dit definitieve fotografie is.
 * Iedere illustratie draagt linksboven een klein "placeholder"-vlaggetje.
 *
 * Draaien:  node tools/make-placeholders.js
 */

const fs = require('fs');
const path = require('path');

const OUT = path.join(process.cwd(), 'assets', 'img');
fs.mkdirSync(OUT, { recursive: true });

/* CGI-palet, gelijk aan de tokens in styles.css */
const C = {
  red: '#e31937', magenta: '#c4187a', purple: '#46248a', deep: '#2c1a5e',
  lav1: '#eae6f7', lav2: '#dcd6f0', lav3: '#c9c0e6',
  g1: '#f1f1f3', g2: '#e2e2e6', g3: '#cfcfd6', g4: '#b6b6c0',
  white: '#ffffff',
};

const FLAG = `<g><rect width="84" height="19" fill="#ffffff" opacity=".92"/>` +
  `<text x="6" y="13.5" font-family="Source Sans 3, Segoe UI, Arial, sans-serif" ` +
  `font-size="11" font-weight="600" fill="${C.deep}">placeholder</text></g>`;

const wrap = (w, h, label, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" ` +
  `role="img" aria-label="${label}">\n  <title>${label}</title>\n  <defs>\n` +
  `    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
  `<stop offset="0" stop-color="${C.red}"/><stop offset=".5" stop-color="${C.magenta}"/>` +
  `<stop offset="1" stop-color="${C.purple}"/></linearGradient>\n` +
  `    <linearGradient id="gh" x1="0" y1="0" x2="1" y2="0">` +
  `<stop offset="0" stop-color="${C.red}"/><stop offset=".55" stop-color="${C.magenta}"/>` +
  `<stop offset="1" stop-color="${C.purple}"/></linearGradient>\n  </defs>\n` +
  body + '\n' + FLAG + '\n</svg>\n';

const person = (x, y, s, fill) =>
  `<g transform="translate(${x} ${y}) scale(${s})" fill="${fill}">` +
  `<circle cx="0" cy="-56" r="26"/><path d="M-38 0c2-30 16-44 38-44s36 14 38 44z"/></g>`;

const scenes = {
  store: (w, h) => `<rect width="${w}" height="${h}" fill="${C.g1}"/>` +
    `<rect y="${h * .72}" width="${w}" height="${h * .28}" fill="${C.g2}"/>` +
    [0, 1, 2, 3].map(i => {
      const bw = w * .19, x = w * .045 + i * (bw + w * .045), bh = h * (.48 + (i % 2) * .1);
      return `<rect x="${x}" y="${h * .72 - bh}" width="${bw}" height="${bh}" fill="${C.g3}"/>` +
        [0, 1, 2].map(j => `<rect x="${x}" y="${h * .72 - bh + bh * (.25 + j * .25)}" width="${bw}" height="${h * .018}" fill="${C.g4}"/>`).join('');
    }).join('') +
    `<rect x="${w * .62}" y="${h * .6}" width="${w * .055}" height="${h * .12}" fill="url(#g)" opacity=".85"/>` +
    person(w * .74, h * .72, h / 340, C.lav3),

  pos: (w, h) => `<rect width="${w}" height="${h}" fill="${C.lav1}"/>` +
    `<rect y="${h * .66}" width="${w}" height="${h * .34}" fill="${C.lav2}"/>` +
    `<rect x="${w * .12}" y="${h * .46}" width="${w * .48}" height="${h * .2}" fill="${C.g2}"/>` +
    `<rect x="${w * .2}" y="${h * .24}" width="${w * .24}" height="${h * .22}" fill="${C.white}"/>` +
    `<rect x="${w * .225}" y="${h * .28}" width="${w * .19}" height="${h * .032}" fill="${C.lav3}"/>` +
    `<rect x="${w * .225}" y="${h * .35}" width="${w * .12}" height="${h * .032}" fill="${C.lav3}"/>` +
    `<rect x="${w * .48}" y="${h * .32}" width="${w * .07}" height="${h * .14}" fill="url(#g)"/>` +
    person(w * .8, h * .66, h / 360, C.lav3),

  warehouse: (w, h) => `<rect width="${w}" height="${h}" fill="${C.g1}"/>` +
    `<rect y="${h * .78}" width="${w}" height="${h * .22}" fill="${C.g2}"/>` +
    [0, 1, 2, 3, 4].map(i => {
      const bw = w * .15, x = w * .04 + i * bw * 1.15;
      return [0, 1, 2].map(j =>
        `<rect x="${x}" y="${h * .78 - (j + 1) * h * .19}" width="${bw}" height="${h * .16}" ` +
        `fill="${(j === 1 && i === 2) ? 'url(#g)' : C.g3}"/>`).join('');
    }).join('') + person(w * .88, h * .78, h / 380, C.lav3),

  data: (w, h) => `<rect width="${w}" height="${h}" fill="${C.deep}"/>` +
    `<rect x="${w * .06}" y="${h * .12}" width="${w * .88}" height="${h * .76}" fill="#3a2470"/>` +
    `<rect x="${w * .12}" y="${h * .18}" width="${w * .3}" height="${h * .035}" fill="#7a5cc4"/>` +
    [0, 1, 2, 3, 4, 5, 6].map(i => {
      const bw = w * .07, x = w * .12 + i * bw * 1.5, bh = h * (.12 + ((i * 37) % 9) / 9 * .4);
      return `<rect x="${x}" y="${h * .78 - bh}" width="${bw}" height="${bh}" fill="${i === 4 ? 'url(#g)' : '#5b3fa8'}"/>`;
    }).join('') +
    `<polyline points="${[0, 1, 2, 3, 4, 5, 6].map(i => `${w * .155 + i * w * .105},${h * (.62 - ((i * 53) % 7) / 7 * .32)}`).join(' ')}" ` +
    `fill="none" stroke="${C.white}" stroke-width="${h * .008}" opacity=".8"/>`,

  consulting: (w, h) => `<rect width="${w}" height="${h}" fill="${C.g1}"/>` +
    `<rect x="${w * .08}" y="${h * .12}" width="${w * .5}" height="${h * .52}" fill="${C.white}"/>` +
    [0, 1, 2, 3].map(i => `<rect x="${w * .12}" y="${h * (.2 + i * .1)}" width="${w * (.34 - i * .05)}" height="${h * .035}" fill="${C.lav2}"/>`).join('') +
    `<rect x="${w * .43}" y="${h * .2}" width="${w * .1}" height="${h * .1}" fill="url(#g)" opacity=".9"/>` +
    `<rect y="${h * .74}" width="${w}" height="${h * .26}" fill="${C.g2}"/>` +
    person(w * .7, h * .74, h / 330, C.lav3) + person(w * .88, h * .74, h / 390, C.g4),

  field: (w, h) => `<rect width="${w}" height="${h}" fill="${C.lav1}"/>` +
    `<rect y="${h * .7}" width="${w}" height="${h * .3}" fill="${C.lav2}"/>` +
    `<rect x="${w * .1}" y="${h * .26}" width="${w * .28}" height="${h * .44}" fill="${C.g2}"/>` +
    `<rect x="${w * .14}" y="${h * .32}" width="${w * .2}" height="${h * .14}" fill="${C.white}"/>` +
    `<rect x="${w * .14}" y="${h * .52}" width="${w * .2}" height="${h * .04}" fill="${C.lav3}"/>` +
    person(w * .56, h * .7, h / 320, C.lav3) +
    `<rect x="${w * .74}" y="${h * .42}" width="${w * .15}" height="${h * .28}" fill="url(#g)" opacity=".85"/>`,

  rollout: (w, h) => `<rect width="${w}" height="${h}" fill="${C.g1}"/>` +
    [0, 1, 2].map(i => {
      const bw = w * .28, x = w * .04 + i * bw * 1.1, bh = h * (.5 + (i % 2) * .14);
      return `<rect x="${x}" y="${h * .76 - bh}" width="${bw}" height="${bh}" fill="${C.g3}"/>` +
        `<rect x="${x}" y="${h * .76 - bh}" width="${bw}" height="${h * .06}" fill="${i === 1 ? 'url(#gh)' : C.g4}"/>` +
        `<rect x="${x + bw * .2}" y="${h * .52}" width="${bw * .6}" height="${h * .24}" fill="${C.white}"/>`;
    }).join('') + `<rect y="${h * .76}" width="${w}" height="${h * .24}" fill="${C.g2}"/>`,

  customer: (w, h) => `<rect width="${w}" height="${h}" fill="${C.lav1}"/>` +
    `<circle cx="${w * .5}" cy="${h * .46}" r="${h * .3}" fill="${C.lav2}"/>` +
    person(w * .5, h * .84, h / 270, C.lav3) +
    `<rect x="${w * .7}" y="${h * .18}" width="${w * .1}" height="${h * .16}" fill="url(#g)" opacity=".8"/>`,

  framework: (w, h) => `<rect width="${w}" height="${h}" fill="${C.white}"/>` +
    `<rect x="${w * .06}" y="${h * .1}" width="${w * .88}" height="${h * .8}" fill="${C.lav1}"/>` +
    [0, 1, 2].map(i =>
      `<rect x="${w * (.11 + i * .28)}" y="${h * .24}" width="${w * .22}" height="${h * .2}" fill="${C.white}"/>` +
      `<rect x="${w * (.11 + i * .28)}" y="${h * .24}" width="${w * .22}" height="${h * .022}" fill="url(#gh)"/>` +
      `<rect x="${w * (.13 + i * .28)}" y="${h * .32}" width="${w * .14}" height="${h * .03}" fill="${C.lav3}"/>` +
      (i < 2 ? `<path d="M${w * (.335 + i * .28)} ${h * .34} h ${w * .03}" stroke="${C.purple}" stroke-width="${h * .01}"/>` : '')
    ).join('') +
    `<rect x="${w * .11}" y="${h * .56}" width="${w * .78}" height="${h * .06}" fill="${C.lav2}"/>` +
    `<rect x="${w * .11}" y="${h * .68}" width="${w * .5}" height="${h * .06}" fill="${C.lav2}"/>`,

  event: (w, h) => `<rect width="${w}" height="${h}" fill="${C.deep}"/>` +
    `<rect x="${w * .2}" y="${h * .14}" width="${w * .6}" height="${h * .36}" fill="#3a2470"/>` +
    `<rect x="${w * .24}" y="${h * .2}" width="${w * .3}" height="${h * .045}" fill="#7a5cc4"/>` +
    `<rect x="${w * .24}" y="${h * .29}" width="${w * .2}" height="${h * .045}" fill="#5b3fa8"/>` +
    `<rect x="${w * .62}" y="${h * .2}" width="${w * .12}" height="${h * .22}" fill="url(#g)" opacity=".9"/>` +
    [0, 1, 2, 3, 4].map(i => person(w * (.16 + i * .17), h * 1.02, h / 300, '#4a3382')).join(''),
};

const SIZES = { hero: [960, 600], wide: [800, 450], card: [430, 250], tile: [360, 220] };

const FILES = [
  ['hero-store.svg', 'store', 'hero', 'Winkelinterieur met medewerker en klant'],
  ['transform-consulting.svg', 'consulting', 'wide', 'Consultants werken aan een transformatieroadmap'],
  ['data-dashboard.svg', 'data', 'wide', 'Datavisualisatie van retailprestaties'],
  ['operations-field.svg', 'field', 'wide', 'Field engineer bij winkeltechnologie'],
  ['usecase-pos.svg', 'pos', 'tile', 'Kassa- en point-of-sale-omgeving'],
  ['usecase-supply.svg', 'warehouse', 'tile', 'Distributiecentrum en voorraad'],
  ['usecase-customer.svg', 'customer', 'tile', 'Klant in een omnichannel-klantreis'],
  ['usecase-rollout.svg', 'rollout', 'tile', 'Winkels tijdens een technologie-roll-out'],
  ['usecase-store.svg', 'store', 'tile', 'Winkelvloer en schapbeschikbaarheid'],
  ['usecase-data.svg', 'data', 'tile', 'Dashboard met retailprestaties'],
  ['usecase-field.svg', 'field', 'tile', 'Onderhoud aan winkeltechnologie'],
  ['usecase-consulting.svg', 'consulting', 'tile', 'Werksessie met business en IT'],
  ['framework.svg', 'framework', 'wide', 'Schematische weergave van een CGI-framework'],
  ['framework-card.svg', 'framework', 'card', 'Schematische weergave van een framework'],
  ['event.svg', 'event', 'card', 'Presentatie tijdens een CGI-event'],
  ['card-store.svg', 'store', 'card', 'Winkelomgeving'],
  ['card-data.svg', 'data', 'card', 'Data en analytics in retail'],
  ['card-operations.svg', 'field', 'card', 'Winkeltechnologie en support'],
  ['card-consulting.svg', 'consulting', 'card', 'Werksessie met retail-experts'],
  ['card-rollout.svg', 'rollout', 'card', 'Winkelopeningen en refits'],
  ['card-customer.svg', 'customer', 'card', 'Consument en klantbeleving'],
  ['card-warehouse.svg', 'warehouse', 'card', 'Distributiecentrum en supply chain'],
  ['careers.svg', 'consulting', 'card', 'Collega bij CGI aan het werk'],
];

for (const [file, scene, size, label] of FILES) {
  const [w, h] = SIZES[size];
  fs.writeFileSync(path.join(OUT, file), wrap(w, h, label, scenes[scene](w, h)));
}

console.log(FILES.length + ' placeholders geschreven naar ' + OUT);
