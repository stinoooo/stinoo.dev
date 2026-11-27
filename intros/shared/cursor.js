// The pointer as a terminal cursor: a hollow block that snaps to the character grid, with a
// small dot at the exact point. Over anything clickable the block leaves the grid and wraps the
// thing, like a target lock. Colors come from the current theme (--accent).
//
// Only on devices with a mouse; touch keeps its own behavior. The native cursor comes back
// whenever the pointer leaves the window, and inside text fields.

const CLICKABLE = "a, button, [role='button'], input, select, textarea, summary, label, .wheel-item, .arc-card, .frame, .t-dot";

export function createCursor() {
  const fine = matchMedia("(pointer: fine) and (hover: hover)");
  if (!fine.matches) return null;
  const root = document.documentElement;
  const box = document.createElement("div");
  const dot = document.createElement("div");
  box.className = "cursor-box";
  dot.className = "cursor-dot";
  box.setAttribute("aria-hidden", "true");
  dot.setAttribute("aria-hidden", "true");
  document.body.append(box, dot);
  root.classList.add("has-cursor");

  const cell = () => {
    const style = getComputedStyle(document.body);
    return [parseFloat(style.getPropertyValue("--cell-w")) || 7.2, parseFloat(style.getPropertyValue("--cell-h")) || 13];
  };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let x = -100;
  let y = -100;
  let shown = false;
  let lock = null;
  const now = { x: -100, y: -100, w: 8, h: 14 };
  const want = { ...now };
  let frame = 0;

  function aim() {
    if (lock?.isConnected) {
      const r = lock.getBoundingClientRect();
      const pad = 3;
      Object.assign(want, { x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 });
      return;
    }
    const [cw, ch] = cell();
    Object.assign(want, { x: Math.floor(x / cw) * cw, y: Math.floor(y / ch) * ch, w: cw, h: ch });
  }

  function tick() {
    frame = 0;
    aim();
    const k = reduced.matches ? 1 : 0.32;
    let moving = false;
    for (const key of ["x", "y", "w", "h"]) {
      const d = want[key] - now[key];
      now[key] = Math.abs(d) < 0.2 ? want[key] : now[key] + d * k;
      if (now[key] !== want[key]) moving = true;
    }
    box.style.transform = `translate(${now.x}px, ${now.y}px)`;
    box.style.width = `${now.w}px`;
    box.style.height = `${now.h}px`;
    dot.style.transform = `translate(${x - 2}px, ${y - 2}px)`;
    if (moving || lock) frame = requestAnimationFrame(tick);
  }
  const queue = () => {
    if (!frame) frame = requestAnimationFrame(tick);
  };

  window.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "mouse") return;
      x = event.clientX;
      y = event.clientY;
      const el = event.target instanceof Element ? event.target : null;
      const typing = el?.closest("input[type='text'], textarea, .t-input");
      root.classList.toggle("cursor-text", Boolean(typing));
      const next = typing ? null : el?.closest(CLICKABLE) || null;
      if (next !== lock) {
        lock = next;
        root.classList.toggle("cursor-lock", Boolean(lock));
      }
      if (!shown) {
        shown = true;
        root.classList.add("cursor-on");
        Object.assign(now, { x: x - 4, y: y - 7 });
      }
      queue();
    },
    { passive: true },
  );
  window.addEventListener("pointerdown", () => root.classList.add("cursor-down"), { passive: true });
  window.addEventListener("pointerup", () => root.classList.remove("cursor-down"), { passive: true });
  document.addEventListener("pointerleave", () => {
    shown = false;
    root.classList.remove("cursor-on");
  });
  window.addEventListener("scroll", queue, { passive: true, capture: true });
  window.addEventListener("blur", () => {
    shown = false;
    root.classList.remove("cursor-on");
  });
  return { box, dot };
}
