// Turns the product images from the Arcnode website into small WebP files in site/shots/.
// The first image of every project is the one that explains it best at a glance (key art or the
// screen that shows what it is for); the rest show how it works. Run after an image changes:
//   node scripts/shots.mjs [path-to-arcnode-public-projects] [only these outputs…]
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";

const SRC = process.argv[2] || "../arcnode/apps/website/public/projects";
const OUT = "site/shots";
// crop: [left, top, width, height] as fractions of the source, before resizing.
// top: true cuts a tall full-page capture to its first 16:10 screen.
const SHOTS = {
  "arcnode.webp": { src: "../arcnode-preview.png" },
  "arcnode-remote.webp": { src: "arcnode-remote/arcnode-remote-get-help.webp" },
  "arcnode-remote-2.webp": { src: "arcnode-remote/arcnode-remote-approval.webp", crop: [0.2, 0.08, 0.6, 0.84] },
  "arcnode-remote-3.webp": { src: "arcnode-remote/arcnode-remote-chat.webp" },
  "rosa.webp": { src: "rosa-wildlife-reserve/rosa-product-home.webp" },
  "rosa-2.webp": { src: "rosa-wildlife-reserve/rosa-product-characters.webp" },
  "rosa-3.webp": { src: "rosa-wildlife-reserve/rosa-product-status.webp" },
  "vardoxen.webp": { src: "vardoxen/vardoxen-home.png", top: true },
  "vardoxen-2.webp": { src: "vardoxen/vardoxen-login.png" },
  "vardoxen-3.webp": { src: "vardoxen/vardoxen-giveaways.png", top: true },
  "bemmel.webp": { src: "bemmel-kroon-werkplanning/bemmel-home.png" },
  "bemmel-2.webp": { src: "bemmel-kroon-werkplanning/bemmel-rooster.png", top: true },
  "bemmel-3.webp": { src: "bemmel-kroon-werkplanning/bemmel-medewerkers.png", top: true },
  "exit-only.webp": { src: "exit-only/exit-only-key-art-launcher.webp" },
  "exit-only-2.webp": { src: "exit-only/exit-only-02-searchlight-captioned.webp" },
  "exit-only-3.webp": { src: "exit-only/exit-only-08-rooftop-rush-captioned.webp" },
  "exit-only-4.webp": { src: "exit-only/exit-only-09-choose-a-mode-captioned.webp" },
  "arcjournal.webp": { src: "arcjournal/arcjournal-today.webp" },
  "arcjournal-2.webp": { src: "arcjournal/arcjournal-stats.webp" },
  "arcjournal-3.webp": { src: "arcjournal/arcjournal-journal.webp" },
  "arcnode-games.webp": { src: "arcnode-games/arcnode-games-key-art.webp" },
  "arcnode-games-2.webp": { src: "arcnode-games/arcnode-games-game-page.webp" },
  "arcnode-games-3.webp": { src: "arcnode-games/arcnode-games-downloading.webp" },
  "arcflux.webp": { src: "arcflux/arcflux-physics.png" },
  "arcflux-2.webp": { src: "arcflux/arcflux-tracking.png" },
  "arcunzip.webp": { src: "arcunzip/arcunzip-extracted.png" },
  "arcunzip-2.webp": { src: "arcunzip/arcunzip-landing.png" },
  // rosa-vscode is not on the Arcnode website; its previews live in its own repository.
  "rosa-vscode.webp": { src: "../../../../../rosa-vscode/images/dark.png" },
  "rosa-vscode-2.webp": { src: "../../../../../rosa-vscode/images/light.png" },
};
const ONLY = process.argv.slice(3);

fs.mkdirSync(OUT, { recursive: true });
for (const [name, spec] of Object.entries(SHOTS)) {
  if (ONLY.length && !ONLY.includes(name)) continue;
  let img = sharp(path.join(SRC, spec.src));
  const { width, height } = await img.metadata();
  if (spec.crop) {
    const [l, t, w, h] = spec.crop;
    img = img.extract({ left: Math.round(l * width), top: Math.round(t * height), width: Math.round(w * width), height: Math.round(h * height) });
  } else if (spec.top && height > width * 0.7) {
    img = img.extract({ left: 0, top: 0, width, height: Math.round(width * 0.625) });
  }
  const info = await sharp(await img.toBuffer())
    .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 76, effort: 6 })
    .toFile(path.join(OUT, name));
  console.log(name.padEnd(22), `${info.width}x${info.height}`.padEnd(10), `${Math.round(info.size / 1024)} KB`);
}
