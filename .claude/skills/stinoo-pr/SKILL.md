---
name: stinoo-pr
description: Open a pull request for the stinoo.dev portfolio repository via the GitHub CLI, into development unless a release is asked for, assigning the repository owner and labeling it. Writes a clear American English title and description with a section for QA that says what changed for a visitor, which page to open and what to check on desktop, on a phone and with sound on. Use for 'maak een PR', 'open a pull request', 'release', or /stinoo-pr in stinoo-dev.
---

# stinoo-pr

The pull-request workflow for `stinoo-dev`. Open PRs with the GitHub CLI (`gh`). This is the only
way to open a PR here.

```bash
ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
[ "$(basename "$ROOT")" = "stinoo-dev" ] || ROOT=$(find ~/Development -maxdepth 2 -type d -name stinoo-dev -not -path '*/node_modules/*' 2>/dev/null | head -1)
```

## Writing style

Clear American English. Short sentences, one thing per sentence. Use the names a visitor sees
("the intro", "the editor", "the simple version", "sound on", "see my work"). A reader must
understand the outcome without opening the diff.

## Workflow

### 1. Context

```bash
cd "$ROOT" && git fetch origin --quiet
git branch --show-current
git status --porcelain
git log origin/development..HEAD --oneline
```

Uncommitted work? Point at the **stinoo-commit** skill and stop. On `main` or `development`?
Something went wrong while committing. Report it and stop.

### 2. Check the base is not behind

The direction is always feature -> `development` -> `main`.

```bash
git log --oneline origin/development..origin/main | head
```

Anything listed means `development` lags behind `main`. Bringing it level is the user's call:
`git push origin origin/main:development`.

### 3. Verify it works

```bash
cd "$ROOT" && node scripts/build-data.mjs && node scripts/build.mjs
cd "$ROOT/counter" && node --test
```

Visible changes are looked at in the build (`python serve.py 8768 dist`) at desktop width and at
375 px, before they are described. Vercel posts a preview link on the PR; use it in the QA section
once it is there.

### 4. Title and description (English)

- **Title**: conventional-commit style, for example `feat(simple): add the simple version`.
- **Description**, read from every commit on the branch. These headings, in this order; leave out
  one that does not apply:
  - `## Summary`: what the PR changes, in a short paragraph.
  - `## Why`: which problem this solves.
  - `## Changes`: one bullet per concrete change, naming the page or the script.
  - `## For QA`: see step 5.
  - `## Notes`: a secret to set, a Railway or Vercel setting, a known limitation.
  - `## Issues`: into `development`, `Refs #<number>` per line. Into `main`, `Closes #<number>`.

Labels: `enhancement` (new or better for visitors), `bug`, `content` (what the site says),
`performance`, `chore` (tooling, data, build), `documentation`, `release` (into `main`).

Never `updates`, `fixes`, `cleanup` or `various changes` as a title.

### 5. Write the section for QA

Written for someone who opens the site and does not read the diff. Three parts, in this order.

#### What changed for you

One bullet per visible or audible difference: what it is like now and, briefly, before. No file or
function names.

- The intro says "this is just the intro: press enter to see my work" when you type. Before, typing
  edited the code on the wall.

#### Where to look

The page and the place on it, the way a visitor finds it.

- stinoo.dev, the bottom line of the intro.
- stinoo.dev/site/, "about me" at the top of the list on the left.
- stinoo.dev/simple/, the "Experience" section.

#### What to check

Numbered steps, each with the action and the result to see. Never "it works". Cover, in order:

1. **The main path**, as a visitor would do it.
2. **A phone**: the same at 375 px wide (or on a real phone). Nothing runs off the screen sideways.
3. **Sound**, when sound changed: click once, then listen for the named sound; "sound on" in the
   header turns it off, and it stays off after a reload.
4. **What must still work** nearby: the other two pages, themes, the link preview.

### 6. Open the PR (base development, HEREDOC body)

```bash
BRANCH=$(git branch --show-current)
OWNER=$(gh repo view --json owner --jq .owner.login)
gh pr create --base development --head "$BRANCH" \
  --assignee "$OWNER" --label "<label>" --title "<title>" --body "$(cat <<'BODY'
## Summary
...

## Changes
- ...

## For QA

### What changed for you
- ...

### Where to look
- ...

### What to check
1. ...
BODY
)"
```

A label that does not exist yet: create it first with `gh label create <name>`.

### 7. Release (development into main)

Only when the user asks for a release. Title `release: <what visitors get>`, label `release`,
base `main`, head `development`. The description lists every PR since the last release under
`## Changes` (`gh pr list --base development --state merged --search "merged:>=<last release date>"`)
and ends with the QA section for the whole release. After it is merged, check that the Vercel
production deployment for the merge commit is ready and that stinoo.dev serves it.

### 8. Report back

Give the PR link and the Vercel preview link. Do not merge unless the user asked for it.

## Strict rules

- American English.
- **No AI references, ever:** no "Generated with", no Claude, Codex or Anthropic, in the title,
  the body or a comment.
- Base is `development`, except a release, which is `development` into `main`.
- Always assign the owner and set a label.
- Never merge without being asked, and never with failing checks.
