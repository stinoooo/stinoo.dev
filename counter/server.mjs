// Visitor counter for stinoo.dev, behind the /api/seen rewrite on Vercel.
//   GET  /api/seen  -> { total, since, hours }  visits per hour for the last 56 hours
//   POST /api/seen  -> counts one visit
// No cookies and no IP addresses, not even in memory: the page itself remembers for half an
// hour that it was counted, so a reload or a second page does not count twice. A global limit
// keeps a flood of requests from inflating the count.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const PORT = Number(process.env.PORT) || 8080;
const FILE = path.join(process.env.DATA_DIR || "./data", "seen.json");
const HOURS = 56;
const KEEP_HOURS = 24 * 90;
const LIMIT_PER_MINUTE = 120;
const ORIGINS = new Set(["https://stinoo.dev", "https://www.stinoo.dev", "http://localhost:8767"]);

export const hourKey = (ms) => new Date(ms).toISOString().slice(0, 13);

export function createCounter(state = {}) {
  const data = { since: state.since || new Date().toISOString(), total: state.total || 0, hours: state.hours || {} };
  let minute = 0;
  let inMinute = 0;
  return {
    data,
    hit(now = Date.now()) {
      const m = Math.floor(now / 60e3);
      if (m !== minute) {
        minute = m;
        inMinute = 0;
      }
      if (++inMinute > LIMIT_PER_MINUTE) return false;
      const k = hourKey(now);
      data.hours[k] = (data.hours[k] || 0) + 1;
      data.total += 1;
      return true;
    },
    view(now = Date.now()) {
      const start = Date.parse(data.since);
      const hours = [];
      for (let n = HOURS - 1; n >= 0; n--) {
        const at = now - n * 3600e3;
        hours.push(hourKey(at) < hourKey(start) ? null : data.hours[hourKey(at)] || 0);
      }
      return { total: data.total, since: data.since, hours };
    },
    prune(now = Date.now()) {
      const oldest = hourKey(now - KEEP_HOURS * 3600e3);
      for (const k of Object.keys(data.hours)) if (k < oldest) delete data.hours[k];
    },
  };
}

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

function save(data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(`${FILE}.tmp`, JSON.stringify(data));
  fs.renameSync(`${FILE}.tmp`, FILE);
}

function start() {
  const counter = createCounter(load());
  let dirty = false;
  const flush = () => {
    if (!dirty) return;
    save(counter.data);
    dirty = false;
  };
  setInterval(() => {
    counter.prune();
    flush();
  }, 30e3).unref();

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    const origin = req.headers.origin;
    if (origin && ORIGINS.has(origin)) res.setHeader("access-control-allow-origin", origin);
    if (url.pathname === "/health") return res.writeHead(200).end("ok");
    if (url.pathname !== "/api/seen") return res.writeHead(404).end();
    if (req.method === "GET") {
      res.writeHead(200, { "content-type": "application/json", "cache-control": "public, max-age=60, s-maxage=60" });
      return res.end(JSON.stringify(counter.view()));
    }
    if (req.method === "POST") {
      req.resume();
      if (counter.hit()) dirty = true;
      return res.writeHead(204, { "cache-control": "no-store" }).end();
    }
    res.writeHead(405, { allow: "GET, POST" }).end();
  });
  server.listen(PORT, () => console.log(`seen on :${PORT}, data in ${FILE}`));
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, () => {
      flush();
      server.close(() => process.exit(0));
    });
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("server.mjs")) start();
