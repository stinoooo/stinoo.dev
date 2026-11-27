// Search everything in the editor: every project and its case study, work, school, awards,
// talks, the stack and the themes. Opens with the "search" button, "/", Ctrl+K or ⌘K, or
// ":search <words>". Picking a result opens that page and marks the words on it.

const fold = (text) => String(text ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const words = (query) => [...new Set(fold(query).split(/[^a-z0-9#+.]+/).filter((w) => w.length > 0))];
// Strip the Markdown the project pages are written in, so a snippet reads like a sentence.
const plain = (line) =>
  String(line ?? "")
    .replace(/\x01IMG\d+\x01/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#+\s*|^[-*>]\s+|[`*_]/g, "")
    .trim();

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Text with every matched word wrapped in <mark>, built from text nodes only.
function marked(text, terms) {
  const out = document.createDocumentFragment();
  const folded = fold(text);
  const hits = [];
  for (const term of terms) {
    for (let at = folded.indexOf(term); at >= 0; at = folded.indexOf(term, at + term.length)) hits.push([at, at + term.length]);
  }
  hits.sort((a, b) => a[0] - b[0]);
  let pos = 0;
  for (const [from, to] of hits) {
    if (from < pos) continue;
    out.append(text.slice(pos, from), make("mark", "", text.slice(from, to)));
    pos = to;
  }
  out.append(text.slice(pos));
  return out;
}

function snippet(line, terms, room = 110) {
  const at = Math.max(0, Math.min(...terms.map((t) => fold(line).indexOf(t)).filter((i) => i >= 0)));
  if (line.length <= room) return line;
  // Start the cut at a word, and never on a stray full stop or comma.
  let start = Math.max(0, Math.min(at - 30, line.length - room));
  if (start > 0) start = line.indexOf(" ", start) + 1 || start;
  const cut = line.slice(start, start + room).replace(/^[\s.,;:·]+/, "");
  return `${start > 0 ? "…" : ""}${cut.trim()}${start + room < line.length ? "…" : ""}`;
}

export function createSearch({ docs, onPick, onOpen, onClose, fallback, suggestions = [] }) {
  const index = docs.map((doc) => {
    const lines = doc.lines.map(plain).filter((line) => line.length > 1);
    const keywords = doc.keywords || "";
    return { ...doc, lines, titleKey: fold(doc.title), metaKey: fold(`${doc.meta} ${keywords}`), all: fold([doc.title, doc.meta, keywords, ...lines].join(" \n ")), folded: lines.map(fold) };
  });

  const dialog = make("dialog", "search");
  dialog.setAttribute("aria-labelledby", "search-label");
  const form = make("form", "search-form");
  form.method = "dialog";
  const label = make("label", "sr-only", "Search my projects, work and stack");
  label.id = "search-label";
  label.htmlFor = "search-input";
  const row = make("div", "search-row");
  const caret = make("span", "search-caret", "/");
  caret.setAttribute("aria-hidden", "true");
  const input = make("input", "search-input");
  Object.assign(input, { id: "search-input", type: "search", autocomplete: "off", spellcheck: false, placeholder: "search projects, work, stack…" });
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", "search-results");
  input.setAttribute("autocapitalize", "off");
  input.setAttribute("enterkeyhint", "go");
  const close = make("button", "search-close", "esc");
  close.type = "button";
  close.setAttribute("aria-label", "Close search");
  row.append(caret, input, close);
  const list = make("ul", "search-results");
  list.id = "search-results";
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "Results");
  const status = make("p", "search-status");
  status.setAttribute("role", "status");
  const foot = make("p", "search-foot", "↑ ↓ to choose · enter to open · esc to close");
  foot.setAttribute("aria-hidden", "true");
  form.append(label, row, status, list, foot);
  dialog.append(form);
  document.body.append(dialog);

  let results = [];
  let active = -1;
  let opener = null;

  function search(query) {
    const terms = words(query);
    if (!terms.length) return { terms, found: [] };
    const found = [];
    for (const doc of index) {
      if (!terms.every((term) => doc.all.includes(term))) continue;
      let score = 0;
      let best = -1;
      let bestHits = 0;
      for (const term of terms) {
        if (doc.titleKey.startsWith(term)) score += 12;
        else if (doc.titleKey.includes(term)) score += 8;
        if (doc.metaKey.includes(term)) score += 3;
      }
      doc.folded.forEach((line, k) => {
        const hits = terms.filter((term) => line.includes(term)).length;
        if (hits > bestHits) {
          bestHits = hits;
          best = k;
        }
        score += hits ? 1 : 0;
      });
      found.push({ doc, score, line: best >= 0 ? doc.lines[best] : "" });
    }
    found.sort((a, b) => b.score - a.score || index.indexOf(a.doc) - index.indexOf(b.doc));
    return { terms, found: found.slice(0, 12) };
  }

  function choose(k) {
    const items = list.querySelectorAll("[role=option]");
    items[active]?.setAttribute("aria-selected", "false");
    active = items.length ? (k + items.length) % items.length : -1;
    const item = items[active];
    if (!item) return input.removeAttribute("aria-activedescendant");
    item.setAttribute("aria-selected", "true");
    input.setAttribute("aria-activedescendant", item.id);
    item.scrollIntoView({ block: "nearest" });
  }

  function paint() {
    const query = input.value;
    const { terms, found } = search(query);
    results = found.map((hit) => ({ ...hit, terms }));
    list.replaceChildren();
    active = -1;
    input.removeAttribute("aria-activedescendant");
    if (!terms.length) {
      status.replaceChildren("Type a word, for example ");
      suggestions.forEach((word, k) => {
        const button = make("button", "search-try", word);
        button.type = "button";
        button.addEventListener("click", () => {
          input.value = word;
          paint();
          input.focus();
        });
        status.append(button, k < suggestions.length - 1 ? " " : "");
      });
      input.setAttribute("aria-expanded", "false");
      return;
    }
    if (!results.length) {
      status.textContent = `Nothing matches “${query.trim()}”. Try one shorter word.`;
      input.setAttribute("aria-expanded", "false");
      return;
    }
    status.textContent = `${results.length} ${results.length === 1 ? "result" : "results"}`;
    results.forEach((hit, k) => {
      const item = make("li", "search-hit");
      item.id = `search-hit-${k}`;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", "false");
      const head = make("span", "search-hit-head");
      const title = make("span", "search-hit-title");
      title.append(marked(hit.doc.title, terms));
      head.append(title, make("span", "search-hit-kind", hit.doc.meta));
      item.append(head);
      if (hit.line) {
        const text = make("span", "search-hit-line");
        text.append(marked(snippet(hit.line, terms), terms));
        item.append(text);
      }
      item.addEventListener("pointermove", () => active !== k && choose(k));
      item.addEventListener("click", () => pick(k));
      list.append(item);
    });
    input.setAttribute("aria-expanded", "true");
    choose(0);
  }

  function pick(k) {
    const hit = results[k];
    if (!hit) return;
    hide(false);
    onPick(hit.doc, hit.terms, hit.line);
  }

  function hide(restore = true) {
    if (!dialog.open) return;
    dialog.close();
    onClose?.();
    if (restore) opener?.focus?.({ preventScroll: true });
    // Opened from nowhere in particular: give focus back to the page, not the closed panel.
    if (dialog.contains(document.activeElement) || document.activeElement === document.body) fallback?.focus({ preventScroll: true });
  }

  input.addEventListener("input", paint);
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || (event.key === "n" && event.ctrlKey)) {
      event.preventDefault();
      choose(active + 1);
    } else if (event.key === "ArrowUp" || (event.key === "p" && event.ctrlKey)) {
      event.preventDefault();
      choose(active - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      pick(Math.max(0, active));
    } else if (event.key === "Escape") {
      // A search field would only clear itself on Esc; here Esc always closes.
      event.preventDefault();
      hide();
    }
  });
  close.addEventListener("click", () => hide());
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    hide();
  });
  // A click on the dim backdrop (outside the panel) closes it.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) hide();
  });

  return {
    get open() {
      return dialog.open;
    },
    show(query = "") {
      if (dialog.open) return input.focus();
      opener = document.activeElement;
      input.value = query;
      dialog.showModal();
      onOpen?.();
      paint();
      input.focus();
      if (query) input.setSelectionRange(query.length, query.length);
      else input.select();
    },
    hide,
  };
}

// Mark the searched words inside the page that just opened and bring the first one into view.
// Uses the CSS Custom Highlight API, so the page's own markup is never changed.
export function markIn(root, terms, line) {
  if (!globalThis.CSS?.highlights || !terms.length) return false;
  const ranges = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  // Scroll to the line the result showed, when it is on the page; otherwise to the first match.
  const anchor = fold(plain(line || "")).slice(0, 24);
  let first = null;
  let best = null;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.parentElement?.closest("input, .t-prompt-row, .wave")) continue;
    const text = fold(node.textContent);
    let hit = false;
    for (const term of terms) {
      for (let at = text.indexOf(term); at >= 0; at = text.indexOf(term, at + term.length)) {
        const range = new Range();
        range.setStart(node, at);
        range.setEnd(node, at + term.length);
        ranges.push(range);
        hit = true;
      }
    }
    if (!hit) continue;
    first ||= node;
    if (!best && anchor && text.includes(anchor)) best = node;
  }
  if (!ranges.length) return false;
  CSS.highlights.set("search", new Highlight(...ranges));
  (best || first).parentElement?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  return true;
}

export function clearMarks() {
  globalThis.CSS?.highlights?.delete("search");
}
