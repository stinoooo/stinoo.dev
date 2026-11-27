// Builds the static site into dist/ for Vercel.
//   node scripts/build.mjs
//
// One bundled, minified script per page with a content hash in its name (cached for a year),
// CSS inlined into the page, fonts and first data preloaded, and the metadata a link preview
// and a search engine need. The data files keep their names and are revalidated on every visit.
import * as esbuild from "esbuild";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderSimple } from "./simple.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "dist");
const config = JSON.parse(fs.readFileSync(path.join(ROOT, "portfolio.config.json"), "utf8"));
const SITE = `https://${config.identity.domain}`;
const NAME = config.identity.name;
const DESCRIPTION = "Stijn Heemskerk: junior full stack software engineer at Bemmel & Kroon and Software Engineering student from Leiden. Builds web apps, desktop apps and games under Arcnode.";

const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const hash = (data) => crypto.createHash("sha256").update(data).digest("hex").slice(0, 10);
const copy = (from, to = from) => {
  fs.mkdirSync(path.dirname(path.join(OUT, to)), { recursive: true });
  fs.copyFileSync(path.join(ROOT, from), path.join(OUT, to));
};
const write = (file, data) => {
  fs.mkdirSync(path.dirname(path.join(OUT, file)), { recursive: true });
  fs.writeFileSync(path.join(OUT, file), data);
};

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// Absolute imports such as "/intros/shared/sfx.js" point at the project root.
const rootImports = {
  name: "root-imports",
  setup(build) {
    build.onResolve({ filter: /^\/(intros|site)\// }, (args) => ({ path: path.join(ROOT, args.path) }));
  },
};

async function bundle(entry, out) {
  const result = await esbuild.build({
    entryPoints: [path.join(ROOT, entry)],
    bundle: true,
    format: "esm",
    target: "es2022",
    minify: true,
    write: false,
    legalComments: "none",
    plugins: [rootImports],
    define: { BUILD_ID: JSON.stringify(buildId) },
  });
  const code = result.outputFiles[0].text;
  const name = `${out}.${hash(code)}.js`;
  write(name, code);
  return `/${name}`;
}

async function css(files) {
  const joined = files.map(read).join("\n");
  const { code } = await esbuild.transform(joined, { loader: "css", minify: true, target: "chrome100" });
  return code.trim();
}

// Data files are fetched with ?v=<build id> by the intro, so a deploy never serves an old mix.
const dataFiles = ["wall.json", "wall.txt", "themes.json", "github-snapshot.json", "face-track.json", "site/content.json", "site/stack.json", "site/months.json", "site/portrait.json"];
const buildId = hash(dataFiles.map((file) => (fs.existsSync(path.join(ROOT, file)) ? read(file) : "")).join("") + Date.now()).slice(0, 8);

for (const file of dataFiles) {
  if (!fs.existsSync(path.join(ROOT, file))) continue;
  const text = read(file);
  write(file, file.endsWith(".json") ? JSON.stringify(JSON.parse(text)) : text);
}
for (const file of ["face.webm", "face.mp4", "og.png", "favicon.svg", "assets/fonts/plex-mono.woff2", "assets/fonts/archivo.woff2"]) copy(file);
for (const dir of ["site/shots", "site/assets/themes"]) for (const file of fs.readdirSync(path.join(ROOT, dir))) copy(`${dir}/${file}`);

const person = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: NAME,
  alternateName: "stino",
  url: SITE,
  image: `${SITE}/og.png`,
  jobTitle: "Junior Full Stack Software Engineer",
  worksFor: { "@type": "Organization", name: "Bemmel & Kroon" },
  alumniOf: [{ "@type": "CollegeOrUniversity", name: "The Hague University" }, { "@type": "EducationalOrganization", name: "mboRijnland" }],
  address: { "@type": "PostalAddress", addressLocality: "Leiden", addressCountry: "NL" },
  knowsAbout: ["TypeScript", "Next.js", "React", "Rust", "Tauri", "Electron", "Godot", "PostgreSQL", "Discord bots"],
  sameAs: config.links.map((link) => link.url).filter((url) => url.startsWith("https://")),
};

function head({ title, description, path: page, preload = [] }) {
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${SITE}${page}">`,
    `<meta name="theme-color" content="#0b0b0a">`,
    `<meta name="color-scheme" content="dark light">`,
    `<meta name="author" content="${NAME}">`,
    `<meta property="og:type" content="profile">`,
    `<meta property="og:site_name" content="stinoo.dev">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${SITE}${page}">`,
    `<meta property="og:image" content="${SITE}/og.png">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="A terminal window made of my code: my name, Stijn Heemskerk, junior full stack software engineer, Arcnode, and my profile picture in colored ASCII.">`,
    `<meta property="profile:first_name" content="Stijn">`,
    `<meta property="profile:last_name" content="Heemskerk">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:creator" content="@s_tinoo">`,
    `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`,
    `<link rel="preload" href="/assets/fonts/plex-mono.woff2" as="font" type="font/woff2" crossorigin>`,
    ...preload,
    `<script type="application/ld+json">${JSON.stringify(person)}</script>`,
    // Vercel Speed Insights, free tier: real load times, no cookies, nothing stored about a visitor.
    `<script>window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };</script>`,
    `<script defer src="/_vercel/speed-insights/script.js"></script>`,
  ].join("\n");
}

function page(source, { script, styles, meta }) {
  let html = read(source);
  html = html.replace(/<title>[\s\S]*?<link rel="icon"[^>]*>/, meta);
  html = html.replace(/<link rel="stylesheet"[^>]*>\s*/g, "");
  html = html.replace("</head>", `<style>${styles}</style>\n<link rel="modulepreload" href="${script}">\n</head>`);
  html = html.replace(/<script type="module" src="[^"]*"><\/script>/, `<script type="module" src="${script}"></script>`);
  return html.replace(/\n\s*\n/g, "\n");
}

// The intro asks for its data with ?v=ASSET_V; point that at this build.
const glimpseSource = read("glimpse.js");
if (!glimpseSource.includes('const ASSET_V = "dev";')) throw new Error("glimpse.js: ASSET_V marker missing");

const introScript = await (async () => {
  const tmp = path.join(ROOT, ".build-glimpse.js");
  fs.writeFileSync(tmp, glimpseSource.replace('const ASSET_V = "dev";', `const ASSET_V = "${buildId}";`));
  try {
    return await bundle(".build-glimpse.js", "glimpse");
  } finally {
    fs.rmSync(tmp);
  }
})();
const editorScript = await bundle("site/editor.js", "site/editor");

write(
  "index.html",
  page("index.html", {
    script: introScript,
    styles: await css(["intros/shared/frame.css", "glimpse.css"]),
    meta: head({
      title: "Stijn Heemskerk · stinoo.dev",
      description: DESCRIPTION,
      path: "/",
      preload: [`<link rel="preload" href="/wall.json?v=${buildId}" as="fetch" crossorigin>`, `<link rel="preload" href="/wall.txt?v=${buildId}" as="fetch" crossorigin>`],
    }),
  }),
);
write(
  "site/index.html",
  page("site/index.html", {
    script: editorScript,
    styles: await css(["intros/shared/frame.css", "site/editor.css"]),
    meta: head({
      title: "Projects, work and stack · Stijn Heemskerk",
      description: "My projects (Exit Only, Arcnode Remote, ArcJournal, Arcnode Games and client work), where I work and study, and the tools I build with, opened in an editor.",
      path: "/site/",
      preload: ["/site/content.json", "/themes.json", "/github-snapshot.json", "/site/stack.json", "/site/months.json"].map((url) => `<link rel="preload" href="${url}" as="fetch" crossorigin>`),
    }),
  }),
);

const json = (file) => JSON.parse(read(file));
write(
  "simple/index.html",
  renderSimple({
    config,
    content: json("site/content.json"),
    snapshot: json("github-snapshot.json"),
    stack: json("site/stack.json"),
    styles: await css(["simple/simple.css"]),
    head: head({
      title: "Stijn Heemskerk · junior full stack software engineer",
      description: DESCRIPTION,
      path: "/simple/",
    }).replace(/<link rel="preload" href="\/assets\/fonts\/plex-mono.woff2"[^>]*>/, '<link rel="preload" href="/assets/fonts/archivo.woff2" as="font" type="font/woff2" crossorigin>'),
  }),
);

write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
const today = new Date().toISOString().slice(0, 10);
write(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${["/", "/site/", "/simple/"].map((p) => `  <url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`,
);
copy("404.html");

let total = 0;
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
for (const file of walk(OUT)) total += fs.statSync(file).size;
console.log(`built dist/ (${Math.round(total / 1024)} KB, build ${buildId}): intro ${introScript}, editor ${editorScript}`);
