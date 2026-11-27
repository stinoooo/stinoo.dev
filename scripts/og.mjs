// Draws og.png, the 1200x630 picture shown when stinoo.dev is shared: a terminal window made of
// my own code, my profile picture in colored ASCII, my name, what I do and what I make.
//   node scripts/og.mjs
import sharp from "sharp";
import fs from "node:fs";

const W = 1200;
const H = 630;
const BG = "#0b0b0a";
const INK = "#ebe6db";
const DIM = "#7a766a";
const ACCENT = "#e7c58a";
const GREEN = "#7fd1a0";
const MONO = "Consolas, 'DejaVu Sans Mono', 'Courier New', monospace";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// 1. a faint wall of real code from my public repositories, the same code the intro shows
const code = fs
  .readFileSync("wall.txt", "utf8")
  .split("\n")
  .map((l) => l.replace(/\t/g, "  "))
  .filter((l) => l.trim().length > 6);
const wall = Array.from({ length: 44 }, (_, k) => {
  const line = code[(k * 7) % code.length].slice(0, 150);
  return `<text x="24" y="${30 + k * 14.2}">${esc(line)}</text>`;
}).join("");

// 2. my profile picture as colored ASCII
const art = JSON.parse(fs.readFileSync("site/portrait.json", "utf8"));
// head and shoulders only, a little brighter than on the page so it reads at thumbnail size
const ROWS = 46;
const CW = 6;
const CH = 9.6;
const AX = 726;
const AY = 96;
const lift = (hex3) =>
  "#" + [...hex3].map((c) => Math.min(15, Math.round(parseInt(c, 16) * 1.65 + 1)).toString(16)).join("");
let glyphs = "";
art.rows.slice(0, ROWS).forEach(([chars, colors], y) => {
  for (let x = 0; x < chars.length; x++) {
    if (chars[x] === " ") continue;
    glyphs += `<text x="${(AX + x * CW).toFixed(1)}" y="${(AY + y * CH).toFixed(1)}" fill="${lift(colors.slice(x * 3, x * 3 + 3))}">${esc(chars[x])}</text>`;
  }
});

// 3. Arcnode, the name everything I make goes out under, as a tag
const tags = ["Arcnode"];
let tx = 72;
const tagSvg = tags
  .map((t) => {
    const w = t.length * 10.2 + 24;
    const out = `<rect x="${tx}" y="430" width="${w}" height="34" rx="3" fill="none" stroke="${ACCENT}" stroke-opacity="0.55"/><text x="${tx + 12}" y="452" font-size="17" fill="${INK}">${esc(t)}</text>`;
    tx += w + 10;
    return out;
  })
  .join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <radialGradient id="glow" cx="0.78" cy="0.48" r="0.42">
    <stop offset="0" stop-color="${ACCENT}" stop-opacity="0.16"/>
    <stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="fade" x1="0" x2="1">
    <stop offset="0" stop-color="${BG}" stop-opacity="0.72"/>
    <stop offset="0.55" stop-color="${BG}" stop-opacity="0.9"/>
    <stop offset="1" stop-color="${BG}" stop-opacity="0.5"/>
  </linearGradient>
  <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse">
    <rect width="4" height="1" fill="#000" fill-opacity="0.14"/>
  </pattern>
</defs>
<rect width="${W}" height="${H}" fill="${BG}"/>
<g font-family="${MONO}" font-size="12" fill="${INK}" fill-opacity="0.11">${wall}</g>
<rect width="${W}" height="${H}" fill="url(#fade)"/>
<rect width="${W}" height="${H}" fill="url(#glow)"/>

<!-- window chrome -->
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="${DIM}" stroke-opacity="0.5"/>
<g font-family="${MONO}">
  <text x="40" y="44" font-size="18" fill="${INK}"><tspan fill="${ACCENT}" font-weight="700">&gt;_</tspan>  stinoo.dev</text>
  <text x="${W - 40}" y="44" font-size="15" fill="${DIM}" text-anchor="end">fish — ~ · stijn</text>
  <line x1="40" y1="64" x2="${W - 40}" y2="64" stroke="${DIM}" stroke-opacity="0.35"/>
</g>

<!-- portrait -->
<g font-family="${MONO}" font-size="9.6" font-weight="700">${glyphs}</g>

<!-- whoami -->
<g font-family="${MONO}">
  <text x="72" y="150" font-size="20"><tspan fill="${GREEN}">stijn</tspan><tspan fill="${DIM}">@dev ~</tspan></text>
  <text x="72" y="182" font-size="20" fill="${INK}"><tspan fill="${ACCENT}">›</tspan> whoami</text>
  <text x="70" y="262" font-size="64" font-weight="700" fill="${INK}">Stijn Heemskerk</text>
  <text x="72" y="312" font-size="25" fill="${INK}">junior full stack software engineer</text>
  <text x="72" y="346" font-size="25" fill="${INK}">software engineering student</text>
  <text x="72" y="396" font-size="20" fill="${GREEN}">// games, desktop apps and the web · Leiden</text>
  ${tagSvg}
</g>

<!-- nvim-style status line -->
<g font-family="${MONO}" font-size="16">
  <rect x="0" y="${H - 64}" width="${W}" height="30" fill="${INK}" fill-opacity="0.06"/>
  <rect x="40" y="${H - 64}" width="86" height="30" fill="${ACCENT}"/>
  <text x="83" y="${H - 44}" fill="${BG}" font-weight="700" text-anchor="middle">NORMAL</text>
  <text x="142" y="${H - 44}" fill="${INK}">~/stinoo.dev/index.html</text>
  <text x="${W - 40}" y="${H - 44}" fill="${DIM}" text-anchor="end">see my work ↩</text>
  <text x="40" y="${H - 14}" fill="${ACCENT}" font-size="18">stinoo.dev<tspan fill="${INK}">  </tspan></text>
  <rect x="152" y="${H - 30}" width="10" height="20" fill="${ACCENT}"/>
</g>
<rect width="${W}" height="${H}" fill="url(#scan)"/>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9, quality: 90, palette: true, colors: 256 }).toFile("og.png");
console.log("wrote og.png", Math.round(fs.statSync("og.png").size / 1024), "KB");
