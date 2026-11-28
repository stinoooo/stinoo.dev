// Renders /simple/: the same portfolio as a plain, readable page, for anyone who would rather
// not drive a terminal. Built from portfolio.config.json and the baked GitHub data, so it always
// says the same as the interactive site. It works the same with scripts off, in a reader view,
// for a screen reader and on paper; one small script (simple/gallery.js) only adds the
// screenshot gallery on top of plain links to the images.
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const bare = (url) => url.replace(/^https?:\/\//, "").replace(/^mailto:/, "").replace(/\/$/, "");
const fmt = (n) => Number(n || 0).toLocaleString("en-US");
const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const when = (s) => s.replace(/(\d\d)\/(\d{4})/g, (_, m, y) => `${MONTHS[Number(m) - 1]} ${y}`);

const ICON = {
  github: '<path d="M12 .5a11.5 11.5 0 0 0-3.64 22.42c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.7 5.38-5.27 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/>',
  x: '<path d="M18.9 1.2h3.7l-8 9.2L24 22.8h-7.4l-5.8-7.6-6.6 7.6H.5l8.6-9.8L0 1.2h7.6l5.2 6.9 6.1-6.9Zm-1.3 19.4h2L6.5 3.3H4.3l13.3 17.3Z"/>',
  mail: '<path d="M2 4h20a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm1 2.4V18h18V6.4l-9 6.3-9-6.3ZM4.6 6l7.4 5.2L19.4 6H4.6Z"/>',
  globe: '<path d="M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm7.9 10h-3.4a17 17 0 0 0-1.4-6.6A9 9 0 0 1 19.9 11ZM12 3.1c1 1.3 2.2 4 2.4 7.9H9.6C9.8 7.1 11 4.4 12 3.1ZM8.9 4.4A17 17 0 0 0 7.5 11H4.1a9 9 0 0 1 4.8-6.6ZM4.1 13h3.4a17 17 0 0 0 1.4 6.6A9 9 0 0 1 4.1 13Zm7.9 7.9c-1-1.3-2.2-4-2.4-7.9h4.8c-.2 3.9-1.4 6.6-2.4 7.9Zm3.1-1.3a17 17 0 0 0 1.4-6.6h3.4a9 9 0 0 1-4.8 6.6Z"/>',
  terminal: '<path d="M3 4h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm1 2v12h16V6H4Zm2.3 2.3L10 12l-3.7 3.7-1.4-1.4L7.2 12 4.9 9.7l1.4-1.4ZM12 14h6v2h-6v-2Z"/>',
  linkedin: '<path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/>',
  discord: '<path d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.6 1.3a18.2 18.2 0 0 0-5.6 0L8.6 3a19.6 19.6 0 0 0-4.9 1.4C.6 9 0 13.6.3 18.1a19.8 19.8 0 0 0 6 3l1.3-2a12.8 12.8 0 0 1-2-1l.5-.4a14 14 0 0 0 11.8 0l.5.4c-.6.4-1.3.7-2 1l1.3 2a19.7 19.7 0 0 0 6-3c.4-5.3-.7-9.8-3.5-13.7ZM8.3 15.3c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm7.4 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z"/>',
  arrow: '<path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  down: '<path d="M12 5v14m-6-6 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON[name]}</svg>`;

const SKILLS = [
  ["Languages", "TypeScript, JavaScript, PHP, Python, SQL, Rust (learning), GDScript"],
  ["Front end", "React, Next.js, Tailwind CSS, HTML, CSS"],
  ["Back end and data", "Node.js, Hono, Prisma, PostgreSQL, MySQL, MongoDB, Redis, REST APIs"],
  ["Desktop and games", "Tauri, Electron, Godot 4, Blender"],
  ["Bots", "discord.js, discord.py"],
  ["Tools and hosting", "Git, GitHub Actions, Turborepo, Vitest, Playwright, Vercel, Railway, Cloudflare"],
  ["Way of working", "Scrum, Kanban, object-oriented design, database design, wireframing"],
  ["Spoken languages", "Dutch, English"],
];

// Real pixel sizes, so the browser reserves the right space before an image loads.
let DIMS = {};
const size = (file) => DIMS[file] || [1280, 800];

function picture(file, alt, { eager = false, sizes = "(max-width: 820px) 100vw, 560px" } = {}) {
  const [w, h] = size(file);
  return `<img src="/site/${esc(file)}" alt="${esc(alt)}" width="${w}" height="${h}" sizes="${sizes}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

// "Arcnode Remote screenshot 2" -> "Arcnode Remote, screenshot 2 of 3"
const altOf = (p, image, k, total) => (/ screenshot \d+$/.test(image.alt || "") || !image.alt ? `${p.name}, screenshot ${k + 1} of ${total}` : image.alt);

function gallery(p) {
  const images = p.images || [];
  const film = images.find((image) => image.kind === "film");
  const stills = images.filter((image) => image.kind !== "film");
  const total = stills.length;
  const main = film
    ? `<div class="shot is-film"><video controls preload="none" playsinline poster="/site/${esc(film.file)}" width="${size(film.file)[0]}" height="${size(film.file)[1]}" aria-label="${esc(film.alt)}"><source src="/site/${esc(film.video)}" type="video/mp4"></video></div>`
    : stills[0]
      ? `<a class="shot" href="/site/${esc(stills[0].file)}" data-gallery="${slug(p.name)}" data-title="${esc(p.name)}">${picture(stills[0].file, altOf(p, stills[0], 0, total))}<span class="zoom" aria-hidden="true">${icon("arrow")}</span><span class="sr-only"> (full size)</span></a>`
      : "";
  const rest = film ? stills : stills.slice(1);
  const offset = film ? 0 : 1;
  // All of a project's screenshots form one gallery (simple/gallery.js).
  const group = `data-gallery="${slug(p.name)}" data-title="${esc(p.name)}"`;
  const thumbs = rest.length
    ? `<ul class="thumbs" aria-label="More screenshots of ${esc(p.name)}">${rest
        .map((image, k) => `<li><a href="/site/${esc(image.file)}" ${group}>${picture(image.file, altOf(p, image, k + offset, total), { sizes: "180px" })}<span class="sr-only"> (full size)</span></a></li>`)
        .join("")}</ul>`
    : "";
  return main ? `<div class="project-media">${main}${thumbs}</div>` : "";
}

function cover(p) {
  const film = p.images?.find((image) => image.kind === "film");
  if (film) return gallery({ ...p, images: [film] });
  const file = p.cover || p.images?.[0]?.file;
  if (!file) return "";
  // The card's title already links to the project, so the picture is a second, hidden way in.
  return `<a class="shot" href="${esc(p.url || `#${slug(p.name)}`)}" tabindex="-1" aria-hidden="true">${picture(file, "", { sizes: "(max-width: 820px) 100vw, 340px" })}</a>`;
}

function caseStudy(c) {
  return `<ol class="case" aria-label="Case study">
      <li><h4>The problem</h4><p>${esc(c.problem)}</p></li>
      <li><h4>What I built</h4><p>${esc(c.built)}</p></li>
      <li><h4>The result</h4><p>${esc(c.result)}</p></li>
    </ol>`;
}

// A product's own site is "Visit rosarealism.com"; a page about it is "View on arcnode.dev".
function linkLabel(url) {
  const [host, ...rest] = bare(url).split("/");
  if (host === "github.com") return "Source on GitHub";
  return rest.filter(Boolean).length ? `View on ${host}` : `Visit ${host}`;
}

function projectLinks(p) {
  const links = [
    p.url && { url: p.url, label: linkLabel(p.url) },
    ...(p.links || []).map((l) => ({ url: l.url, label: l.label === "Source" ? "Source on GitHub" : l.label })),
  ].filter(Boolean);
  return links.length ? `<p class="links">${links.map((l, k) => `<a class="${k ? "text-link" : "button small"}" href="${esc(l.url)}">${esc(l.label)}${icon("arrow")}</a>`).join("")}</p>` : "";
}

function chips(list, label = "Built with") {
  return list?.length ? `<ul class="chips" aria-label="${label}">${list.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : "";
}

function featuredProject(p) {
  return `<article class="project is-featured" id="${slug(p.name)}" aria-labelledby="${slug(p.name)}-title">
  ${gallery(p)}
  <div class="project-body">
    <p class="tag">${esc(p.tag)}</p>
    <h3 id="${slug(p.name)}-title">${esc(p.name)}</h3>
    <p class="lead">${esc(p.description)}</p>
    ${p.case ? caseStudy(p.case) : p.long ? `<p>${esc(p.long)}</p>` : ""}
    ${chips(p.stack)}
    ${projectLinks(p)}
  </div>
</article>`;
}

function compactProject(p) {
  const title = p.url ? `<a href="${esc(p.url)}">${esc(p.name)}</a>` : esc(p.name);
  return `<article class="project" id="${slug(p.name)}" aria-labelledby="${slug(p.name)}-title">
  ${cover(p)}
  <div class="project-body">
    <p class="tag">${esc(p.tag)}</p>
    <h3 id="${slug(p.name)}-title">${title}</h3>
    <p>${esc(p.description)}</p>
    ${chips(p.stack)}
    ${(p.links || []).length ? `<p class="links">${p.links.map((l) => `<a class="text-link" href="${esc(l.url)}">${esc(l.label === "Source" ? "Source on GitHub" : l.label)}${icon("arrow")}</a>`).join("")}</p>` : ""}
  </div>
</article>`;
}

function timeline(items, { compact = false } = {}) {
  return `<ol class="timeline${compact ? " is-compact" : ""}">${items
    .map(
      (i) => `<li>
    <p class="when">${esc(when(i.when))}</p>
    <div>
      <h3>${esc(i.title)}</h3>
      ${i.org || i.where ? `<p class="org">${i.org ? (i.url ? `<a href="${esc(i.url)}">${esc(i.org)}</a>` : esc(i.org)) : ""}${i.org && i.where ? " · " : ""}${i.where ? esc(i.where) : ""}</p>` : ""}
      ${i.desc ? `<p>${esc(i.desc)}</p>` : ""}
    </div>
  </li>`,
    )
    .join("\n")}</ol>`;
}

const sectionHead = (id, kicker, title, lead = "") =>
  `<header class="section-head"><p class="kicker" aria-hidden="true">${kicker}</p><h2 id="${id}-title">${title}</h2>${lead ? `<p class="section-lead">${lead}</p>` : ""}</header>`;

export function renderSimple({ config, content, snapshot, stack, head, styles, dims = {}, updated, script }) {
  DIMS = dims;
  const projects = content.projects.map((p) => ({ ...p, ...config.projects.find((c) => slug(c.name) === p.repo) }));
  const more = new Set(content.more || []);
  const featured = projects.filter((p) => !more.has(p.repo)).slice(0, 5);
  const other = projects.filter((p) => !more.has(p.repo)).slice(5);
  const small = projects.filter((p) => more.has(p.repo));
  const email = config.links.find((l) => l.url.startsWith("mailto:"));
  const github = config.links.find((l) => l.label === "GitHub");
  const x = config.links.find((l) => l.label === "X");
  const arcnode = config.links.find((l) => l.label === "Arcnode");
  const linkedin = config.links.find((l) => l.label === "LinkedIn");
  const langs = (stack?.languages || []).slice(0, 6);
  const top = langs.length ? Math.max(...langs.map((l) => l.share)) : 1;
  const jobs = config.work.filter((w) => w.type !== "internship");
  const internships = config.work.filter((w) => w.type === "internship");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${head}
<style>${styles}</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top">
  <div class="top-inner">
    <a class="brand" href="/simple/" aria-label="stinoo.dev, back to the top">stinoo<span>.dev</span></a>
    <nav aria-label="Sections">
      <ul>
        <li><a href="#projects">Projects</a></li>
        <li><a href="#experience">Experience</a></li>
        <li><a href="#skills">Skills</a></li>
        <li><a href="#about">About</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
    </nav>
    <a class="switch" href="/">${icon("terminal")}<span>Interactive version</span></a>
  </div>
</header>

<main id="main">
<section class="hero" aria-labelledby="hero-title">
  <div class="hero-text">
    <p class="eyebrow">Leiden, the Netherlands</p>
    <h1 id="hero-title">Hi, I'm Stijn Heemskerk. <span>I build web apps, desktop apps and games.</span></h1>
    <p class="intro">I'm a junior full stack software engineer at <strong>Bemmel &amp; Kroon</strong> and a Software Engineering student at <strong>The Hague University</strong>. I like making things all the way through: the code, but also the icon, the installer, the little sound when something works. Most of my own work ships under <a href="https://arcnode.dev">Arcnode</a>, my small studio.</p>
    <p class="actions">
      <a class="button primary" href="#projects">See my projects${icon("down")}</a>
      <a class="button" href="#contact">Get in touch</a>
    </p>
    <p class="alt-link">Like terminals? <a href="/">Try the interactive version</a>, with code, sound and themes.</p>
  </div>
  <div class="hero-photo">
    <img class="avatar" src="/site/shots/avatar.webp" alt="My profile picture: me as a kid, smiling, in a dark blue shirt" width="320" height="320" fetchpriority="high" decoding="async">
  </div>
</section>

<section class="facts" aria-label="At a glance">
  <dl>
    <div><dt>Now</dt><dd>Junior full stack software engineer at Bemmel &amp; Kroon</dd></div>
    <div><dt>Studying</dt><dd>Software Engineering (bachelor)</dd></div>
    <div><dt>Studio</dt><dd><a href="https://arcnode.dev">Arcnode</a>, since 2026</dd></div>
    <div><dt>On GitHub this year</dt><dd>${fmt(snapshot.contributions.total)} contributions</dd></div>
    <div><dt>Hackathons</dt><dd>2 entered, 2 won</dd></div>
  </dl>
</section>

<section id="projects" aria-labelledby="projects-title">
  ${sectionHead("projects", "01", "Projects", "The work I'm proudest of, newest focus first. Most of it is private code, so the links go to the live product or its page on arcnode.dev. Click a screenshot to see it full size.")}
  <div class="featured">${featured.map(featuredProject).join("\n")}</div>
  ${other.length ? `<h3 class="sub">More of my own work</h3><div class="grid">${other.map(compactProject).join("\n")}</div>` : ""}
  ${small.length ? `<h3 class="sub">Smaller things</h3><ul class="others">${small.map((p) => `<li><a href="${esc(p.url)}">${esc(p.name)}</a><span>${esc(p.description)}</span></li>`).join("")}</ul>` : ""}
</section>

<section id="experience" aria-labelledby="experience-title">
  ${sectionHead("experience", "02", "Experience")}
  <div class="exp">
    <div>
      <h3 class="sub first">Work</h3>
      ${timeline(jobs)}
      <h3 class="sub">Internships</h3>
      ${timeline(internships)}
    </div>
    <div>
      <h3 class="sub first">Education</h3>
      ${timeline(config.education || [], { compact: true })}
      <h3 class="sub">Achievements</h3>
      ${timeline((config.awards || []).map((a) => ({ ...a, org: "" })), { compact: true })}
    </div>
  </div>
</section>

<section id="skills" aria-labelledby="skills-title">
  ${sectionHead("skills", "03", "Skills")}
  <dl class="skills">${SKILLS.map(([k, v]) => `<div><dt>${k}</dt><dd>${chips(v.split(", "), k)}</dd></div>`).join("")}</dl>
  ${
    langs.length
      ? `<figure class="langs">
    <figcaption>What I actually write: languages by amount of code across all ${fmt(stack.repos)} of my repositories.</figcaption>
    <ul>${langs.map((l) => `<li><span class="lang">${esc(l.name)}</span><span class="bar" aria-hidden="true"><span style="width:${((l.share / top) * 100).toFixed(1)}%"></span></span><span class="pct">${Math.round(l.share * 100)}%</span></li>`).join("")}</ul>
  </figure>`
      : ""
  }
</section>

<section id="about" class="about" aria-labelledby="about-title">
  <div>
    ${sectionHead("about", "04", "About me")}
    <p>At Bemmel &amp; Kroon I grew from customer service and sales into building their software, and I'm studying Software Engineering next to that. I'm early in my career and learning all the time: by doing, by asking questions and by working with others.</p>
    <p>Outside work and school I mountain bike, play drums and there is pretty much always music on. I game, and I'm part of a few online gaming communities, which is how most of my client work started: websites and Discord bots for the communities I play in.</p>
    <p>And this is Banjer, my lovely labradoodle and head of quality assurance. Most of my bugs get solved on his walks.</p>
  </div>
  <figure class="dog">
    <a href="/site/shots/banjer.webp" data-gallery="banjer" data-title="Banjer"><img src="/site/shots/banjer.webp" alt="Banjer, a curly brown labradoodle in a blue harness, sitting on a sandy beach in front of tall cliffs, tongue out" width="560" height="746" sizes="(max-width: 820px) 280px, 300px" loading="lazy" decoding="async"><span class="sr-only"> (full size)</span></a>
    <figcaption>Banjer, head of quality assurance</figcaption>
  </figure>
</section>

<section id="contact" class="contact" aria-labelledby="contact-title">
  ${sectionHead("contact", "05", "Get in touch", "Always happy to talk about work, side projects or anything you're building. Email is the quickest way to reach me.")}
  ${email ? `<p class="actions"><a class="button primary big" href="${esc(email.url)}">${icon("mail")}${esc(bare(email.url))}</a></p>` : ""}
  <ul class="contact-list">
    ${github ? `<li><a href="${esc(github.url)}" rel="me">${icon("github")}<span><b>GitHub</b>${esc(bare(github.url))}</span></a></li>` : ""}
    ${linkedin ? `<li><a href="${esc(linkedin.url)}" rel="me">${icon("linkedin")}<span><b>LinkedIn</b>${esc(bare(linkedin.url).replace(/^(www\.)?linkedin\.com\/in\//, ""))}</span></a></li>` : ""}
    ${x ? `<li><a href="${esc(x.url)}" rel="me">${icon("x")}<span><b>X</b>@s_tinoo</span></a></li>` : ""}
    <li><span class="static">${icon("discord")}<span><b>Discord</b>bossmannn</span></span></li>
    ${arcnode ? `<li><a href="${esc(arcnode.url)}">${icon("globe")}<span><b>Studio</b>arcnode.dev</span></a></li>` : ""}
  </ul>
</section>
</main>

<footer class="foot">
  <div>
    <p>© ${new Date().getFullYear()} Stijn Heemskerk · designed, built and synthesized by me</p>
    <p class="foot-links"><a href="/">Interactive version</a><a href="/site/">Editor</a><a href="https://github.com/stinoooo/stinoo.dev">Source on GitHub</a><a href="#main">Back to top</a></p>
    ${updated ? `<p class="updated">Updated <time datetime="${updated}">${MONTHS[Number(updated.slice(5, 7)) - 1]} ${Number(updated.slice(8, 10))}, ${updated.slice(0, 4)}</time></p>` : ""}
  </div>
</footer>
${script ? `<script type="module" src="${script}"></script>` : ""}
</body>
</html>
`;
}
