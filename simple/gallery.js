// The screenshot gallery on /simple/. Every screenshot is a plain link to the image, so the page
// works without this script; with it, a click opens the project's screenshots in an overlay:
// ← → or a swipe to browse, the strip to jump, Esc, the ✕, a click beside the picture or the
// browser's back button to close.
const links = [...document.querySelectorAll("a[data-gallery]")];
const reduced = matchMedia("(prefers-reduced-motion: reduce)");

if (links.length && typeof HTMLDialogElement === "function") {
  const make = (tag, className, attrs = {}) => Object.assign(document.createElement(tag), className ? { className } : {}, attrs);
  const ICON = {
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  };

  const dialog = make("dialog", "lb");
  dialog.setAttribute("aria-labelledby", "lb-title");
  const top = make("div", "lb-top");
  const title = make("p", "lb-title", { id: "lb-title" });
  const count = make("p", "lb-count");
  count.setAttribute("aria-live", "polite");
  const close = make("button", "lb-button lb-close", { type: "button", innerHTML: ICON.close });
  close.setAttribute("aria-label", "Close");
  top.append(title, count, close);
  const stage = make("figure", "lb-stage");
  const img = make("img", "lb-img", { decoding: "async", draggable: false });
  const caption = make("figcaption", "lb-caption");
  stage.append(img, caption);
  const prev = make("button", "lb-button lb-prev", { type: "button", innerHTML: ICON.prev });
  prev.setAttribute("aria-label", "Previous screenshot");
  const next = make("button", "lb-button lb-next", { type: "button", innerHTML: ICON.next });
  next.setAttribute("aria-label", "Next screenshot");
  const strip = make("ol", "lb-strip");
  strip.setAttribute("aria-label", "All screenshots");
  dialog.append(top, stage, prev, next, strip);
  document.body.append(dialog);

  let group = [];
  let at = 0;
  let opener = null;
  let pushed = false;

  const itemOf = (link) => {
    const thumb = link.querySelector("img");
    return {
      href: link.getAttribute("href"),
      alt: thumb?.getAttribute("alt") || "",
      width: Number(thumb?.getAttribute("width")) || 1280,
      height: Number(thumb?.getAttribute("height")) || 800,
      link,
    };
  };

  function show(k, { focus = false } = {}) {
    at = (k + group.length) % group.length;
    const item = group[at];
    if (!reduced.matches) {
      img.classList.remove("is-in");
      void img.offsetWidth;
      img.classList.add("is-in");
    }
    Object.assign(img, { src: item.href, alt: item.alt, width: item.width, height: item.height });
    caption.textContent = item.alt;
    count.textContent = group.length > 1 ? `${at + 1} / ${group.length}` : "";
    const many = group.length > 1;
    prev.hidden = next.hidden = strip.hidden = !many;
    strip.querySelectorAll("button").forEach((button, n) => {
      if (n === at) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
    strip.children[at]?.scrollIntoView({ block: "nearest", inline: "nearest" });
    // Load the neighbors now, so the next press shows at once.
    for (const n of [at + 1, at - 1]) {
      const near = group[(n + group.length) % group.length];
      if (near && near !== item) new Image().src = near.href;
    }
    if (focus) close.focus();
  }

  function open(link) {
    const name = link.dataset.gallery;
    const members = links.filter((other) => other.dataset.gallery === name);
    group = members.map(itemOf);
    title.textContent = link.dataset.title || "";
    strip.replaceChildren(
      ...group.map((item, n) => {
        const li = make("li");
        const button = make("button", "lb-thumb", { type: "button" });
        button.setAttribute("aria-label", `Screenshot ${n + 1} of ${group.length}`);
        button.append(make("img", "", { src: item.href, alt: "", loading: "lazy", decoding: "async" }));
        button.addEventListener("click", () => show(n));
        li.append(button);
        return li;
      }),
    );
    opener = link;
    document.documentElement.classList.add("lb-open");
    dialog.showModal();
    show(members.indexOf(link), { focus: true });
    // The back button closes the gallery instead of leaving the page, like on a phone.
    history.pushState({ gallery: true }, "");
    pushed = true;
  }

  function shut() {
    if (!dialog.open) return;
    dialog.close();
  }

  let refocus = false;
  const giveBack = () => opener?.focus({ preventScroll: true });

  dialog.addEventListener("close", () => {
    document.documentElement.classList.remove("lb-open");
    img.removeAttribute("src");
    if (pushed && history.state?.gallery) {
      // Step back over the entry the gallery added; focus returns once that is done.
      pushed = false;
      refocus = true;
      history.back();
    } else {
      pushed = false;
      giveBack();
    }
  });

  addEventListener("popstate", () => {
    if (refocus) {
      refocus = false;
      giveBack();
      return;
    }
    if (!dialog.open) return;
    pushed = false;
    shut();
  });

  for (const link of links) {
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      open(link);
    });
  }

  prev.addEventListener("click", () => show(at - 1));
  next.addEventListener("click", () => show(at + 1));
  close.addEventListener("click", shut);

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") show(at + 1);
    else if (event.key === "ArrowLeft") show(at - 1);
    else if (event.key === "Home") show(0);
    else if (event.key === "End") show(group.length - 1);
    else return;
    event.preventDefault();
  });

  // A click on the dark space around the picture closes; a click on the picture does not.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target === stage) shut();
  });

  // Swipe left or right to browse; a short tap does nothing.
  let startX = 0;
  let startY = 0;
  stage.addEventListener("pointerdown", (event) => {
    startX = event.clientX;
    startY = event.clientY;
  });
  stage.addEventListener("pointerup", (event) => {
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (group.length > 1 && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) show(at + (dx < 0 ? 1 : -1));
  });
}
