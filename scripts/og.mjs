// Draws og.png, the 1200x630 link preview: my ASCII portrait beside my name, in the site's colors.
//   node scripts/og.mjs
import sharp from "sharp";
import fs from "node:fs";

const art = JSON.parse(fs.readFileSync("site/portrait.json", "utf8"));
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const CW = 6.6;
const CH = 11;
const X0 = 70;
const Y0 = 315 - (art.rows.length * CH) / 2;
let glyphs = "";
art.rows.forEach(([chars, colors], y) => {
  for (let x = 0; x < chars.length; x++) {
    if (chars[x] === " ") continue;
    glyphs += `<text x="${(X0 + x * CW).toFixed(1)}" y="${(Y0 + y * CH).toFixed(1)}" fill="#${colors.slice(x * 3, x * 3 + 3)}">${esc(chars[x])}</text>`;
  }
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#0b0b0a"/>
<g font-family="Consolas, 'DejaVu Sans Mono', monospace" font-size="11" font-weight="700">${glyphs}</g>
<g font-family="Consolas, 'DejaVu Sans Mono', monospace">
  <text x="640" y="190" font-size="22" fill="#7a766a">stijn@stinoo.dev ~</text>
  <text x="640" y="226" font-size="22" fill="#e7c58a">› whoami</text>
  <text x="640" y="300" font-size="50" font-weight="700" fill="#ebe6db">Stijn Heemskerk</text>
  <text x="640" y="350" font-size="24" fill="#ebe6db">junior full stack engineer</text>
  <text x="640" y="384" font-size="24" fill="#ebe6db">software engineering student</text>
  <text x="640" y="440" font-size="22" fill="#7fd1a0">// games, desktop apps and the web.</text>
  <text x="640" y="520" font-size="22" fill="#e7c58a">stinoo.dev</text>
  <rect x="772" y="503" width="12" height="22" fill="#e7c58a"/>
</g>
</svg>`;
await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile("og.png");
console.log("wrote og.png", fs.statSync("og.png").size);
