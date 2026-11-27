// Renders /simple/: the same portfolio as a plain, readable page, for anyone who would rather
// not drive a terminal. Built from portfolio.config.json and the baked GitHub data, so it always
// says the same as the interactive site. No JavaScript.
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const bare = (url) => url.replace(/^https?:\/\//, "").replace(/^mailto:/, "").replace(/\/$/, "");
const fmt = (n) => Number(n || 0).toLocaleString("en-US");
const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "");

const ICON = {
  github: '<path d="M12 .5a11.5 11.5 0 0 0-3.64 22.42c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.7 5.38-5.27 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/>',
  x: '<path d="M18.9 1.2h3.7l-8 9.2L24 22.8h-7.4l-5.8-7.6-6.6 7.6H.5l8.6-9.8L0 1.2h7.6l5.2 6.9 6.1-6.9Zm-1.3 19.4h2L6.5 3.3H4.3l13.3 17.3Z"/>',
  mail: '<path d="M2 4h20a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm1 2.4V18h18V6.4l-9 6.3-9-6.3ZM4.6 6l7.4 5.2L19.4 6H4.6Z"/>',
  globe: '<path d="M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm7.9 10h-3.4a17 17 0 0 0-1.4-6.6A9 9 0 0 1 19.9 11ZM12 3.1c1 1.3 2.2 4 2.4 7.9H9.6C9.8 7.1 11 4.4 12 3.1ZM8.9 4.4A17 17 0 0 0 7.5 11H4.1a9 9 0 0 1 4.8-6.6ZM4.1 13h3.4a17 17 0 0 0 1.4 6.6A9 9 0 0 1 4.1 13Zm7.9 7.9c-1-1.3-2.2-4-2.4-7.9h4.8c-.2 3.9-1.4 6.6-2.4 7.9Zm3.1-1.3a17 17 0 0 0 1.4-6.6h3.4a9 9 0 0 1-4.8 6.6Z"/>',
  terminal: '<path d="M3 4h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm1 2v12h16V6H4Zm2.3 2.3L10 12l-3.7 3.7-1.4-1.4L7.2 12 4.9 9.7l1.4-1.4ZM12 14h6v2h-6v-2Z"/>',
  discord: '<path d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.6 1.3a18.2 18.2 0 0 0-5.6 0L8.6 3a19.6 19.6 0 0 0-4.9 1.4C.6 9 0 13.6.3 18.1a19.8 19.8 0 0 0 6 3l1.3-2a12.8 12.8 0 0 1-2-1l.5-.4a14 14 0 0 0 11.8 0l.5.4c-.6.4-1.3.7-2 1l1.3 2a19.7 19.7 0 0 0 6-3c.4-5.3-.7-9.8-3.5-13.7ZM8.3 15.3c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm7.4 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;

const SKILLS = [
  ["Languages", "TypeScript, JavaScript, PHP, Python, SQL, Rust (learning), GDScript"],
  ["Front end", "React, Next.js, Tailwind CSS, HTML and CSS"],
  ["Back end and data", "Node.js, Hono, Prisma, PostgreSQL, MySQL, MongoDB, Redis, REST APIs"],
  ["Desktop and games", "Tauri, Electron, Godot 4, Blender"],
  ["Bots", "discord.js, discord.py"],
  ["Tools and hosting", "Git, GitHub Actions, Turborepo, Vitest, Playwright, Vercel, Railway, Cloudflare"],
  ["Way of working", "Agile (Scrum and Kanban), object-oriented design, database design, wireframing"],
  ["Languages I speak", "Dutch and English"],
];

function project(p, { featured }) {
  const shot = p.images?.[0];
  const links = [p.url && `<a href="${esc(p.url)}">${esc(bare(p.url))}</a>`, ...(p.links || []).map((l) => `<a href="${esc(l.url)}">${esc(l.label)}</a>`)].filter(Boolean).join("");
  return `<article class="project${featured ? " is-featured" : ""}" id="${slug(p.name)}">
  ${shot ? `<a class="shot" href="${esc(p.url || "#")}" tabindex="-1" aria-hidden="true"><img src="/site/${esc(shot.file)}" alt="" width="1280" height="800" loading="lazy" decoding="async"></a>` : ""}
  <div class="project-body">
    <p class="tag">${esc(p.tag)}</p>
    <h3>${esc(p.name)}</h3>
    <p class="lead">${esc(p.description)}</p>
    ${featured && p.long ? `<p>${esc(p.long)}</p>` : ""}
    ${p.stack?.length ? `<ul class="chips" aria-label="Built with">${p.stack.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
    ${links ? `<p class="links">${links}</p>` : ""}
  </div>
</article>`;
}

function timeline(items) {
  return `<ol class="timeline">${items
    .map(
      (i) => `<li>
    <p class="when">${esc(i.when.replace(/(\d\d)\/(\d{4})/g, (_, m, y) => `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1]} ${y}`))}</p>
    <div><h3>${esc(i.title)}${i.org ? ` <span>· ${i.url ? `<a href="${esc(i.url)}">${esc(i.org)}</a>` : esc(i.org)}</span>` : ""}</h3>
    ${i.where ? `<p class="where">${esc(i.where)}</p>` : ""}
    ${i.desc ? `<p>${esc(i.desc)}</p>` : ""}</div>
  </li>`,
    )
    .join("\n")}</ol>`;
}

export function renderSimple({ config, content, snapshot, stack, head, styles }) {
  const projects = content.projects.map((p) => ({ ...p, ...config.projects.find((c) => slug(c.name) === p.repo) }));
  const more = new Set(content.more || []);
  const featured = projects.filter((p) => !more.has(p.repo)).slice(0, 5);
  const other = projects.filter((p) => !more.has(p.repo)).slice(5);
  const small = projects.filter((p) => more.has(p.repo));
  const email = config.links.find((l) => l.url.startsWith("mailto:"));
  const github = config.links.find((l) => l.label === "GitHub");
  const x = config.links.find((l) => l.label === "X");
  const arcnode = config.links.find((l) => l.label === "Arcnode");
  const langs = (stack?.languages || []).slice(0, 6);

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
  <a class="brand" href="/simple/">stinoo.dev</a>
  <nav aria-label="Sections">
    <a href="#projects">Projects</a>
    <a href="#experience">Experience</a>
    <a href="#about">About</a>
    <a href="#contact">Contact</a>
    <a class="switch" href="/" title="The interactive version, a terminal with code, sound and themes">${icon("terminal")}<span>Interactive version</span></a>
  </nav>
</header>

<main id="main">
<section class="hero">
  <img class="avatar" src="/site/shots/avatar.webp" alt="My profile picture: me as a kid, smiling, in a dark blue shirt" width="160" height="160">
  <div>
    <p class="eyebrow">Leiden, the Netherlands</p>
    <h1>Hi, I'm Stijn Heemskerk.</h1>
    <p class="intro">I'm a junior full stack software engineer at <strong>Bemmel &amp; Kroon</strong> and a Software Engineering student at <strong>The Hague University of Applied Sciences</strong>. I like making things all the way through: the code, but also the icon, the installer, the little sound when something works. Most of my own work ships under <a href="https://arcnode.dev">Arcnode</a>, my small studio.</p>
    <p class="actions">
      <a class="button primary" href="#projects">See my projects</a>
      <a class="button" href="#contact">Get in touch</a>
      <a class="button ghost" href="/">${icon("terminal")}Try the interactive version</a>
    </p>
  </div>
</section>

<section class="facts" aria-label="At a glance">
  <dl>
    <div><dt>Now</dt><dd>Junior full stack engineer, Bemmel &amp; Kroon</dd></div>
    <div><dt>Studying</dt><dd>Software Engineering (bachelor)</dd></div>
    <div><dt>Studio</dt><dd><a href="https://arcnode.dev">Arcnode</a>, since 2026</dd></div>
    <div><dt>This year on GitHub</dt><dd>${fmt(snapshot.contributions.total)} contributions</dd></div>
    <div><dt>Hackathons</dt><dd>2 entered, 2 won</dd></div>
  </dl>
</section>

<section id="projects">
  <h2>Projects</h2>
  <p class="section-lead">The work I'm proudest of, newest focus first. Most of it is private code, so the links go to the live product or its page on arcnode.dev.</p>
  <div class="projects">${featured.map((p) => project(p, { featured: true })).join("\n")}</div>
  ${other.length ? `<h3 class="sub">More of my own work</h3><div class="projects compact">${other.map((p) => project(p, { featured: false })).join("\n")}</div>` : ""}
  ${small.length ? `<h3 class="sub">Smaller things</h3><ul class="small">${small.map((p) => `<li><a href="${esc(p.url)}">${esc(p.name)}</a> <span>${esc(p.description)}</span></li>`).join("")}</ul>` : ""}
</section>

<section id="experience">
  <h2>Work</h2>
  ${timeline(config.work.filter((w) => w.type !== "internship"))}
  <h2 class="h2-sub">Internships</h2>
  ${timeline(config.work.filter((w) => w.type === "internship"))}
  <div class="two">
    <div>
      <h2 class="h2-sub">Education</h2>
      ${timeline(config.education || [])}
    </div>
    <div>
      <h2 class="h2-sub">Achievements</h2>
      ${timeline((config.awards || []).map((a) => ({ ...a, org: "", where: a.where })))}
    </div>
  </div>
</section>

<section id="skills">
  <h2>Skills</h2>
  <dl class="skills">${SKILLS.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
  ${langs.length ? `<p class="note">By code across all ${fmt(stack.repos)} of my repositories: ${langs.map((l) => `${esc(l.name)} ${Math.round(l.share * 100)}%`).join(", ")}.</p>` : ""}
</section>

<section id="about" class="about">
  <div>
    <h2>About me</h2>
    <p>At Bemmel &amp; Kroon I grew from customer service and sales into building their software, and I'm studying Software Engineering next to that. I'm early in my career and learning all the time: by doing, by asking questions and by working with others.</p>
    <p>Outside work and school I mountain bike, play drums and there is pretty much always music on. I game, and I'm part of a few online gaming communities, which is how most of my client work started: websites and Discord bots for the communities I play in.</p>
    <p>And this is Banjer, head of quality assurance. Most of my bugs get solved on his walks.</p>
  </div>
  <img src="/site/shots/banjer.webp" alt="Banjer, a curly brown dog in a blue harness, sitting on a sandy beach in front of tall cliffs, tongue out" width="560" height="746" loading="lazy" decoding="async">
</section>

<section id="contact" class="contact">
  <h2>Get in touch</h2>
  <p>Always happy to talk about work, side projects or anything you're building.</p>
  <ul class="contact-list">
    ${email ? `<li><a href="${esc(email.url)}">${icon("mail")}<span><b>Email</b>${esc(bare(email.url))}</span></a></li>` : ""}
    ${github ? `<li><a href="${esc(github.url)}" rel="me">${icon("github")}<span><b>GitHub</b>${esc(bare(github.url))}</span></a></li>` : ""}
    ${x ? `<li><a href="${esc(x.url)}" rel="me">${icon("x")}<span><b>X</b>@s_tinoo</span></a></li>` : ""}
    <li><span class="static">${icon("discord")}<span><b>Discord</b>bossmannn</span></span></li>
    ${arcnode ? `<li><a href="${esc(arcnode.url)}">${icon("globe")}<span><b>Studio</b>arcnode.dev</span></a></li>` : ""}
  </ul>
</section>
</main>

<footer class="foot">
  <p>Stijn Heemskerk · <a href="/">stinoo.dev</a> · Built from <a href="https://github.com/pavanjoshi914/dev-portfolio-template">dev-portfolio-template</a> by Pavan Joshi, MIT license.</p>
</footer>
</body>
</html>
`;
}
