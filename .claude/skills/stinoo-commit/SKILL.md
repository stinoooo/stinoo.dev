---
name: stinoo-commit
description: Analyze changes in the stinoo.dev portfolio repository, check for secrets and private data, verify the data build, the production build and the counter tests, create logical atomic commits with American English conventional-commit messages ending in an Affects block, and push a feature branch. Use for 'commit', 'push dit', 'sla op in git', or /stinoo-commit in stinoo-dev.
---

# stinoo-commit

The commit workflow for `stinoo-dev`, the repository behind stinoo.dev. Analyze the changes,
group them into atomic commits, verify the site still builds, and push. This is the only way to
commit here. Never hand-roll `git commit` outside this workflow.

Find the repository root once and use it everywhere. Never hardcode a path.

```bash
ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
[ "$(basename "$ROOT")" = "stinoo-dev" ] || ROOT=$(find ~/Development -maxdepth 2 -type d -name stinoo-dev -not -path '*/node_modules/*' 2>/dev/null | head -1)
```

No root? Ask where the repository is.

## Writing style

Clear American English. Short sentences, one thing per sentence. Commit messages are plain and
factual. Use the names a visitor sees: "the intro", "the editor", "the simple version", "sound on",
"see my work", the project names as written on the site.

## Workflow

### 1. Gather context

```bash
git -C "$ROOT" status --porcelain
git -C "$ROOT" diff
git -C "$ROOT" branch --show-current
```

### 2. Check for secrets and private data (before anything else)

This repository is published. Check the working tree, not the index.

```bash
git -C "$ROOT" status --porcelain | grep -Ei '(^|/)\.env($|[^.])|\.(pem|key|p12)$|counter/data/' && echo STOP
git -C "$ROOT" diff HEAD | grep -nEi '(token|secret|password|api[_-]?key)[[:space:]]*[=:][[:space:]]*["'"'"'][A-Za-z0-9+/._-]{16,}'
git -C "$ROOT" diff HEAD | grep -nE '\+31 ?6|[1-9][0-9]{3} ?[A-Z]{2}|@gmail\.com'
```

Anything found: stop and report. Never commit a phone number, a home address or a personal email
address. Contact on the site goes through info@arcnode.dev, GitHub, X and Discord.

Generated data must not name private repositories. `site/months.json` and `wall.json` only list
public ones; check when `scripts/build-data.mjs` changed:

```bash
node -e "const m=require('$ROOT/site/months.json');console.log([...new Set(m.months.flatMap(x=>x.top.map(t=>t.repo)))].join(' '))"
```

Every name printed must be a public repository on github.com/stinoooo.

### 3. Verify it works

```bash
cd "$ROOT" && node scripts/build-data.mjs && node scripts/build.mjs
cd "$ROOT/counter" && node --test
```

Both must pass. `build-data.mjs` without `--fetch-github` only re-syncs the config, so it is safe to
run any time. Red means fix first.

Changed what a visitor sees? Look at it before committing:

```bash
cd "$ROOT" && python serve.py 8768 dist
```

Check the intro (`/`), the editor (`/site/`) and the simple version (`/simple/`) at desktop width
and at 375 px wide, in the browser's console for errors, and with sound on after one click.

### 4. Branch: check this before you stage anything

**Never commit on `development` or on `main`.** Both only move forward by a pull request being
merged into them:

```
feat/something  ->  PR  ->  development  ->  release PR  ->  main
```

The one exception is the scheduled **Refresh data** workflow, which commits refreshed GitHub
numbers straight to `development`.

```bash
git -C "$ROOT" branch --show-current
```

On `development` or `main`? Branch now, while nothing is staged:

```bash
git -C "$ROOT" switch -c <type>/<short-name>
```

Only noticed after committing? Move the commit. Check the tree is clean first.

```bash
git -C "$ROOT" status --porcelain              # has to be empty
git -C "$ROOT" branch <type>/<short-name>
git -C "$ROOT" reset --hard origin/development
git -C "$ROOT" switch <type>/<short-name>
```

Types: `feat` `fix` `perf` `refactor` `docs` `chore` `style`.
Examples: `feat/simple-version`, `fix/header-links-on-phones`, `perf/subset-fonts`.

### 5. Stage per group

Stage each group with `git add <paths>` (never `git add -A` or `git add .`), then check it.

```bash
git -C "$ROOT" add <paths of group 1>
git -C "$ROOT" diff --cached --stat
```

Keep generated files with the change that generated them: new `site/content.json` goes in the same
commit as the `portfolio.config.json` edit that caused it.

### 6. Commit messages (English, conventional)

```
<type>(<scope>): <short description>

<why it changed, when the diff does not say it>

Affects:
- <path>
- <path>
```

Types: `feat`, `fix`, `perf`, `refactor`, `test`, `chore` (dependencies, build, tooling, config),
`docs`, `style` (wording or formatting a visitor sees, no behavior change).

Scopes: `intro` (index.html, glimpse.*), `editor` (site/), `simple` (the simple version),
`sound` (intros/shared/sfx.js), `content` (portfolio.config.json and the data it produces),
`data` (scripts/build-data.mjs and GitHub numbers), `photo` (cutout, face, portrait),
`counter` (counter/), `build` (scripts/build.mjs, vercel.json), `repo` (tooling, skills, README).

The subject names the result, not the activity. Not `update editor`, but
`show project names instead of slugs in the list`.

**The `Affects:` block is required**, last, one repo-relative path per line, from what is staged:

```bash
git -C "$ROOT" diff --cached --name-only
```

Past about six files, name directories with a count (`site/shots/ (9 files)`). Never "several files".

```
feat(editor): put Arcnode, Arcnode Remote, Rosa and Vardoxen first

Affects:
- portfolio.config.json
- site/content.json
```

Write messages with a HEREDOC or `-F` so quotes survive.

### 7. Push

```bash
git -C "$ROOT" push -u origin "$(git -C "$ROOT" branch --show-current)"
```

### 8. Report back

Name the branch and the commits, and anything that still has to happen by hand (a secret to set, a
Railway variable, a DNS record). Open the PR with the **stinoo-pr** skill. Do not open it here.

## Strict rules

- **American English** commit messages.
- **No AI references, ever:** no `Co-Authored-By`, no "Generated with", no Claude, Codex or
  Anthropic. Strip such a trailer if the environment adds one.
- **One commit does one thing.** Five unrelated changes are five commits.
- **Every commit ends with an `Affects:` block.**
- Never commit `.env`, `node_modules/`, `dist/`, `counter/data/` or the intermediate
  `face-src*` files.
- **Never commit on `development` or `main`** by hand.
- Never `git commit --no-verify`, and never force-push `main` or `development`.
- Never commit on behalf of the user without being asked.
