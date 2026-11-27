# stinoo.dev

My portfolio: **[stinoo.dev](https://stinoo.dev)**.

I'm Stijn Heemskerk, a junior full stack software engineer at Bemmel & Kroon and a Software
Engineering student from Leiden. This site shows what I make, mostly under
[Arcnode](https://arcnode.dev), in three ways:

| Address | What it is |
| --- | --- |
| [stinoo.dev](https://stinoo.dev) | The intro. A wall of my own code that types, recolors and draws my face out of glyphs. Press enter, or wait: after one pass it goes in by itself. |
| [stinoo.dev/site](https://stinoo.dev/site/) | The portfolio, opened like an editor: about me, projects, experience, my stack and color themes. Type `help` at the prompt for every command. |
| [stinoo.dev/simple](https://stinoo.dev/simple/) | The same story as a plain, readable page, for anyone who would rather not drive a terminal. |

It started from Pavan Joshi's
[dev-portfolio-template](https://github.com/pavanjoshi914/dev-portfolio-template) (MIT). The
first commit on `main` is that template as it was; everything after it is mine.

## What is in it

- **Everything is true and comes from one place.** My details, projects, work, school and awards live
  in [`portfolio.config.json`](portfolio.config.json). The GitHub numbers (contributions, languages,
  the code on the intro wall) are fetched by a script and baked in, so the page never calls GitHub.
- **My profile picture is the face.** [`scripts/cutout.py`](scripts/cutout.py) cuts me out of the
  photo with two segmentation models, [`scripts/face-from-photo.py`](scripts/face-from-photo.py)
  turns the still into a slow looping clip, and [`scripts/build-face.py`](scripts/build-face.py)
  makes the tracking data the intro draws with. The about page shows the same photo as colored ASCII.
- **Sound, made live.** [`intros/shared/sfx.js`](intros/shared/sfx.js) synthesizes film-style
  terminal sound with the Web Audio API: text chatter, computing bleeps, glitches, risers into a low
  hit, an "access granted" bell and a quiet machine-room bed. No audio files. It starts after the
  first click or key press, and "sound on" in the header turns it off.
- **A terminal you can type in.** The prompt at the end of every editor page takes commands
  (`help`, `vardoxen`, `theme paper`), and `:` opens the command line from anywhere.
- **A terminal cursor.** With a mouse, the pointer is a block that snaps to the character grid
  and wraps whatever you can click ([`intros/shared/cursor.js`](intros/shared/cursor.js)).
- **Small and fast.** One minified script per page, CSS inlined, fonts subset to WOFF2 (45 KB for
  both), screenshots as WebP. Scripts have content hashes in their names and are cached for a year.
- **A visitor counter without cookies.** The graph in the bottom bar comes from a tiny service on
  Railway ([`counter/`](counter/)). It stores counts per hour and nothing about a visitor.

## Run it

You need Node.js 22 and Python 3.

```bash
npm install
python serve.py
```

Open http://localhost:8767 for the intro, `/site/` for the editor. The dev server sends
`Cache-Control: no-store`, so a refresh always shows your latest change. `/simple/` only exists in
the build:

```bash
node scripts/build.mjs
python serve.py 8768 dist
```

## Change something

| To change | Edit | Then run |
| --- | --- | --- |
| Text, projects, work, internships (`"type": "internship"`), school, achievements, links | `portfolio.config.json` | `node scripts/build-data.mjs` |
| GitHub numbers and the code on the wall | nothing | `node scripts/build-data.mjs --fetch-github` (needs `gh`, signed in as me) |
| Project screenshots | the list in `scripts/shots.mjs` | `node scripts/shots.mjs` |
| The facts beside the portrait | `FACTS` in `site/portrait.js` | nothing |
| The simple page | `scripts/simple.mjs`, `simple/simple.css` | `node scripts/build.mjs` |
| Sounds | `intros/shared/sfx.js` | nothing |
| The link preview image | `scripts/og.mjs` | `node scripts/og.mjs` |
| My photo | the cutout and face scripts above, in that order | then `scripts/portrait-art.py` and `node scripts/og.mjs` |

The Python scripts for the photo need `opencv-python-headless`, `numpy`, `pillow` and
`rembg[cpu]`, and `ffmpeg` on the path. They only run when the photo changes; their output is
committed.

## How it ships

```
feat/something  ->  PR  ->  development  ->  release PR  ->  main
```

- **Vercel** builds every branch with `node scripts/build.mjs` into `dist/`. `main` is production on
  stinoo.dev; `development` and pull requests get preview links.
- **Railway** runs the visitor counter (project `stinoo.dev`, service `seen`, a volume at `/data`).
  Vercel forwards `/api/seen` to it, so the page only ever talks to stinoo.dev.
- **GitHub Actions** refreshes the GitHub numbers every morning and commits them to `development`
  ([`refresh-data.yml`](.github/workflows/refresh-data.yml)). Language shares include my private
  repositories only when the `STATS_TOKEN` secret is set; without it, the last full numbers stay.
- Commits and pull requests follow the **stinoo-commit** and **stinoo-pr** skills in
  [`.claude/skills`](.claude/skills).

## Layout

```
index.html, glimpse.js, glimpse.css   the intro
site/                                 the editor: editor.js, terminal.js, portrait.js, wheel.js, ...
intros/shared/                        frame styles, helpers, the sound engine and the cursor, shared by both
simple/simple.css, scripts/simple.mjs the simple page
portfolio.config.json                 everything said about me
*.json, wall.txt, site/*.json         baked data, written by scripts/build-data.mjs
face.webm, face.mp4, face-track.json  the face on the intro
scripts/                              data, images, photo and build scripts
counter/                              the visitor counter on Railway
vercel.json                           build, headers, caching, the /api/seen rewrite
```

## License

MIT, see [LICENSE](LICENSE). The template is Pavan Joshi's; the content, photos and changes are mine.
