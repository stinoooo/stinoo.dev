// My profile picture as colored ASCII (portrait.json, drawn by scripts/portrait-art.py),
// beside a neofetch-style list of facts. The portrait types itself in, row by row.

// Said by hand and kept true. Uptime counts from my birthday, like the card on my GitHub profile.
const BORN = "2002-10-09";
const FACTS = [
  ["os", "Stijn Heemskerk"],
  ["host", "Leiden, the Netherlands"],
  ["uptime", () => uptime()],
  ["work", "junior full stack software engineer, Bemmel & Kroon"],
  ["school", "Software Engineering, The Hague University"],
  ["studio", "Arcnode"],
  ["langs", "TypeScript, JavaScript, PHP, Python, SQL, Rust, GDScript"],
  ["web", "Next.js, React, Tailwind CSS, Hono, Prisma"],
  ["desktop", "Tauri, Electron"],
  ["games", "Godot 4, Blender, synthesized sound"],
  ["ships", "Vercel, Railway, Cloudflare, GitHub Actions"],
  ["wins", "2 hackathons, both 1st place"],
  ["off", "mountain biking, drums, gaming"],
  ["dog", "Banjer, lovely labradoodle, head of quality assurance"],
];
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
let art = null;

function uptime(today = new Date()) {
  const born = new Date(`${BORN}T00:00:00Z`);
  let years = today.getUTCFullYear() - born.getUTCFullYear();
  let months = today.getUTCMonth() - born.getUTCMonth();
  if (today.getUTCDate() < born.getUTCDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return `${years} years, ${months} month${months === 1 ? "" : "s"}`;
}

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const loadArt = () => (art ||= fetch("portrait.json").then((response) => (response.ok ? response.json() : null)).catch(() => null));

function draw(canvas, data, onRow) {
  const cell = { w: 4.8, h: 8 };
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = data.cols * cell.w;
  const h = data.rows.length * cell.h;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.aspectRatio = `${w} / ${h}`;
  const g = canvas.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.font = `700 8px "Plex Mono", ui-monospace, monospace`;
  g.textBaseline = "top";
  let y = 0;
  let stop = false;
  const paint = (row) => {
    const [chars, colors] = data.rows[row];
    for (let x = 0; x < chars.length; x++) {
      if (chars[x] === " ") continue;
      g.fillStyle = `#${colors.slice(x * 3, x * 3 + 3)}`;
      g.fillText(chars[x], x * cell.w, row * cell.h);
    }
  };
  if (reduced.matches) {
    data.rows.forEach((_, row) => paint(row));
    return () => {};
  }
  const step = () => {
    if (stop) return;
    for (let k = 0; k < 2 && y < data.rows.length; k++, y++) {
      paint(y);
      onRow?.(y, data.rows[y][0]);
    }
    if (y < data.rows.length) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  return () => (stop = true);
}

export function createPortrait(host, { onRow } = {}) {
  host.classList.add("fetch");
  const canvas = make("canvas", "fetch-art");
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "My profile picture, drawn in colored ASCII characters");
  const title = make("p", "fetch-title");
  title.append(make("span", "t-user", "stijn"), "@", make("span", "t-host", "stinoo.dev"));
  const rule = make("p", "fetch-rule", "-".repeat("stijn@stinoo.dev".length));
  const list = make("dl", "fetch-list");
  for (const [name, value] of FACTS) {
    const row = make("div");
    row.append(make("dt", "t-key", name), make("dd", "", typeof value === "function" ? value() : value));
    list.append(row);
  }
  const swatch = make("p", "fetch-swatch");
  swatch.setAttribute("aria-hidden", "true");
  for (let n = 0; n < 8; n++) swatch.append(make("i"));
  const side = make("div", "fetch-side");
  side.append(title, rule, list, swatch);
  host.append(canvas, side);
  let stop = () => {};
  let gone = false;
  loadArt().then((data) => {
    if (data && !gone) stop = draw(canvas, data, onRow);
  });
  return {
    destroy() {
      gone = true;
      stop();
    },
    recolor() {},
  };
}
