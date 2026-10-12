/**
 * Framework-agnostic logic for the message queue. The React, Vue, and Svelte
 * ports all import from here so keyboard behaviour, drag physics, copy, and
 * timing stay identical; only rendering and state wiring differ per framework.
 */

export type QueueAttachment = {
  id: string;
  name: string;
  file?: File;
};

export type QueuedMessage = {
  id: string;
  text: string;
  attachments: QueueAttachment[];
};

export type Theme = "system" | "light" | "dark";

export const FIELD_MAX_HEIGHT = 128;
export const SCROLL_MASK_MIN_MESSAGES = 6;
export const LEAVE_FALLBACK_MS = 300;
export const DRAG_CLICK_WINDOW_MS = 250;
export const TOOLTIP_DELAY_MS = 600;
export const TOOLTIP_WARM_MS = 300;
export const SORT_DURATION_MS = 150;
export const SORT_EASING = "cubic-bezier(0.23, 1, 0.32, 1)";
export const DRAG_DISTANCE_PX = 8;
export const TOUCH_DELAY_MS = 250;
export const TOUCH_TOLERANCE_PX = 5;
export const AUTOSCROLL_EDGE_PX = 24;
export const AUTOSCROLL_MAX_SPEED_PX = 8;
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `mq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = items.slice();
  if (from === to || from < 0 || to < 0 || from >= next.length || to >= next.length) {
    return next;
  }
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function filesToAttachments(files: FileList | null): QueueAttachment[] {
  if (!files) return [];
  return Array.from(files).map((file) => ({ id: createId(), name: file.name, file }));
}

/* ------------------------------------------------------------------ */
/* Copy                                                                */
/* ------------------------------------------------------------------ */

export function queuedCountLabel(count: number): string {
  return count === 1 ? "1 queued message" : `${count} queued messages`;
}

export function queuedLabel(message: Pick<QueuedMessage, "text" | "attachments">): string {
  const names = message.attachments.map((file) => file.name).join(", ");
  if (message.text && names) return `${message.text} · ${names}`;
  return message.text || names;
}

/** Every string the polite live region can announce. */
export const announce = {
  queued: (m: QueuedMessage) => `Queued: ${queuedLabel(m)}`,
  updated: () => "Updated queued message",
  editing: () => "Editing queued message",
  cancelledEdit: () => "Cancelled editing",
  removed: () => "Removed queued message",
  dismissed: () => "Dismissed queue",
  sent: (m: QueuedMessage) => `Sent: ${queuedLabel(m)}`,
  sentParallel: (m: QueuedMessage) => `Sent and running in parallel: ${queuedLabel(m)}`,
  sentNewChat: (m: QueuedMessage) => `Sent in a new chat: ${queuedLabel(m)}`,
  alwaysSendInChat: (on: boolean) => (on ? "Always send in chat on" : "Always send in chat off"),
  lifted: (m: QueuedMessage, position: number, total: number) =>
    `Picked up ${queuedLabel(m)}. Position ${position} of ${total}. Use the arrow keys to move, Space to drop, Escape to cancel.`,
  moved: (position: number, total: number) => `Moved to position ${position} of ${total}`,
  dropped: (m: QueuedMessage, position: number, total: number) =>
    `Dropped ${queuedLabel(m)} at position ${position} of ${total}`,
  reorderCancelled: (m: QueuedMessage) => `Reorder cancelled. ${queuedLabel(m)} returned to its position`,
};

export const REORDER_HINT =
  "Press Space to reorder, E to edit, Command or Control Backspace to remove.";

/* ------------------------------------------------------------------ */
/* Environment                                                         */
/* ------------------------------------------------------------------ */

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function subscribeReducedMotion(onChange: (reduced: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  const listener = () => onChange(media.matches);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

export function autosize(field: HTMLTextAreaElement | null, max = FIELD_MAX_HEIGHT): void {
  if (!field) return;
  field.style.height = "0px";
  field.style.height = `${Math.min(field.scrollHeight, max)}px`;
}

export function focusAtEnd(field: HTMLTextAreaElement | null): void {
  if (!field) return;
  field.focus();
  const end = field.value.length;
  field.setSelectionRange(end, end);
}

/** Two frames: lets the send→mic swap paint before the mic accepts a click,
 *  so a double-tap on Send can't start a recording. */
export function afterTwoFrames(callback: () => void): () => void {
  let second = 0;
  const first = requestAnimationFrame(() => {
    second = requestAnimationFrame(callback);
  });
  return () => {
    cancelAnimationFrame(first);
    cancelAnimationFrame(second);
  };
}

/* ------------------------------------------------------------------ */
/* Keyboard                                                            */
/* ------------------------------------------------------------------ */

type Modifiers = Pick<KeyboardEvent, "shiftKey" | "metaKey" | "ctrlKey" | "altKey">;

export function isUnmodifiedKey(event: Modifiers): boolean {
  return !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey;
}

export function isEditShortcut(event: KeyboardEvent): boolean {
  return isUnmodifiedKey(event) && (event.key === "e" || event.key === "E");
}

export function isDeleteShortcut(event: KeyboardEvent): boolean {
  if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return false;
  return event.key === "Backspace" || event.key === "Delete";
}

/** Arrows stop at the ends; Home/End jump. `current < 0` means nothing in the
 *  list has focus yet: Down/Home → first, Up/End → last. */
export function nextQueueIndex(current: number, key: string, length: number): number | null {
  if (length <= 0) return null;
  if (current < 0) {
    if (key === "ArrowDown" || key === "ArrowRight" || key === "Home") return 0;
    if (key === "ArrowUp" || key === "ArrowLeft" || key === "End") return length - 1;
    return null;
  }
  switch (key) {
    case "ArrowDown":
    case "ArrowRight":
      return Math.min(current + 1, length - 1);
    case "ArrowUp":
    case "ArrowLeft":
      return Math.max(current - 1, 0);
    case "Home":
      return 0;
    case "End":
      return length - 1;
    default:
      return null;
  }
}

export type QueueKeyContext = {
  list: HTMLElement | null;
  panel: HTMLElement | null;
  field: HTMLTextAreaElement | null;
  /** Option elements of the rows that are not leaving, in queue order. */
  items: HTMLElement[];
};

export type QueueKeyAction =
  | { type: "focus"; index: number }
  | { type: "edit"; index: number }
  | { type: "delete"; index: number }
  | { type: "composer" };

/**
 * The window-level (capture phase) key map. Returns what to do, or null to let
 * the event through. Callers must skip this entirely while the panel is
 * collapsed, the queue is empty, a message is being edited, a pointer drag is
 * active, or a row is lifted for keyboard reordering.
 */
export function resolveQueueKey(event: KeyboardEvent, ctx: QueueKeyContext): QueueKeyAction | null {
  if (event.isComposing) return null;
  const active = document.activeElement;
  const inList = Boolean(ctx.list && active && ctx.list.contains(active));

  if (!inList) {
    const inPanel = Boolean(ctx.panel && active && ctx.panel.contains(active));
    if (inPanel) return null;
    const field = ctx.field;
    const composerFocused = Boolean(field && active === field);
    const idle = !active || active === document.body;
    if (!composerFocused && !idle) return null;
    // With a draft, only ArrowUp with the caret at the very start leaves the field.
    if (field && composerFocused && field.value !== "") {
      const caretAtStart = field.selectionStart === 0 && field.selectionEnd === 0;
      if (!(isUnmodifiedKey(event) && event.key === "ArrowUp" && caretAtStart)) return null;
    }
  }

  const current = inList
    ? ctx.items.findIndex((node) => Boolean(active && node.contains(active)))
    : -1;

  if (current >= 0 && isDeleteShortcut(event)) return { type: "delete", index: current };
  if (current >= 0 && isEditShortcut(event)) return { type: "edit", index: current };
  if (
    inList &&
    isUnmodifiedKey(event) &&
    event.key === "ArrowDown" &&
    current === ctx.items.length - 1
  ) {
    return { type: "composer" };
  }
  if (!isUnmodifiedKey(event)) return null;
  const next = nextQueueIndex(current, event.key, ctx.items.length);
  return next === null ? null : { type: "focus", index: next };
}

export function isSpaceKey(event: Pick<KeyboardEvent, "key" | "code">): boolean {
  return event.key === " " || event.key === "Spacebar" || event.code === "Space";
}

/** Keyboard reordering of a lifted row. */
export type LiftKeyAction =
  | { type: "move"; to: number }
  | { type: "drop" }
  | { type: "cancel" }
  | { type: "swallow" };

export function resolveLiftKey(event: KeyboardEvent, index: number, length: number): LiftKeyAction | null {
  if (event.isComposing) return null;
  if (isSpaceKey(event)) return { type: "drop" };
  switch (event.key) {
    case "ArrowUp":
    case "ArrowLeft":
      return { type: "move", to: Math.max(0, index - 1) };
    case "ArrowDown":
    case "ArrowRight":
      return { type: "move", to: Math.min(length - 1, index + 1) };
    case "Home":
      return { type: "move", to: 0 };
    case "End":
      return { type: "move", to: length - 1 };
    case "Enter":
    case "Tab":
      return { type: "drop" };
    case "Escape":
      return { type: "cancel" };
    default:
      return { type: "swallow" };
  }
}

/* ------------------------------------------------------------------ */
/* Scrolling                                                           */
/* ------------------------------------------------------------------ */

/** Keeps the focused row and its neighbours inside the list's clip. Pinning to
 *  an end lets the scroll mask switch off there, so the end row isn't faded. */
export function revealQueueItem(list: HTMLElement | null, items: HTMLElement[], index: number): void {
  if (!list || index < 0 || index >= items.length) return;
  const start = Math.max(0, index - 1);
  const end = Math.min(items.length - 1, index + 1);
  const maxScroll = Math.max(0, list.scrollHeight - list.clientHeight);
  if (start === 0) {
    list.scrollTop = 0;
    return;
  }
  if (end === items.length - 1) {
    list.scrollTop = maxScroll;
    return;
  }
  const listTop = list.getBoundingClientRect().top - list.scrollTop;
  const rangeTop = items[start].getBoundingClientRect().top - listTop;
  const rangeBottom = items[end].getBoundingClientRect().bottom - listTop;
  let next = list.scrollTop;
  if (rangeBottom > next + list.clientHeight) next = rangeBottom - list.clientHeight;
  if (rangeTop < next) next = rangeTop;
  list.scrollTop = Math.max(0, Math.min(next, maxScroll));
}

/* ------------------------------------------------------------------ */
/* Popovers (top layer, so the clipped list can't cut them off)        */
/* ------------------------------------------------------------------ */

export const supportsPopover =
  typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;

const VIEWPORT_GUTTER = 8;

export function placePopover(
  anchor: HTMLElement,
  popover: HTMLElement,
  placement: "bottom-end" | "top",
  offset: number,
): void {
  const a = anchor.getBoundingClientRect();
  const width = popover.offsetWidth;
  const height = popover.offsetHeight;
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  let left: number;
  let top: number;
  if (placement === "bottom-end") {
    left = a.right - width;
    top = a.bottom + offset;
    if (top + height > vh - VIEWPORT_GUTTER) top = a.top - offset - height;
  } else {
    left = a.left + a.width / 2 - width / 2;
    top = a.top - offset - height;
    if (top < VIEWPORT_GUTTER) top = a.bottom + offset;
  }
  left = Math.max(VIEWPORT_GUTTER, Math.min(left, vw - width - VIEWPORT_GUTTER));
  popover.style.left = `${Math.round(left)}px`;
  popover.style.top = `${Math.round(Math.max(VIEWPORT_GUTTER, top))}px`;
  popover.dataset.side = top < a.top ? "top" : "bottom";
}

/**
 * One shared tooltip for every `[data-tooltip]` element inside `root`.
 * `data-tooltip-kbd` adds a shortcut hint. The tooltip element must be an
 * empty `popover="manual"` node rendered by the framework; this controller
 * owns its children.
 */
export function createTooltips(root: HTMLElement, tooltip: HTMLElement): () => void {
  if (!supportsPopover) return () => {};
  let timer = 0;
  let target: HTMLElement | null = null;
  let hiddenAt = 0;

  function show(next: HTMLElement) {
    target = next;
    tooltip.replaceChildren(document.createTextNode(next.dataset.tooltip ?? ""));
    const kbd = next.dataset.tooltipKbd;
    if (kbd) {
      const hint = document.createElement("kbd");
      hint.className = "mq-kbd";
      hint.textContent = kbd;
      tooltip.append(hint);
    }
    if (!tooltip.matches(":popover-open")) tooltip.showPopover();
    placePopover(next, tooltip, "top", 6);
  }

  function hide() {
    window.clearTimeout(timer);
    if (target && tooltip.matches(":popover-open")) {
      tooltip.hidePopover();
      hiddenAt = performance.now();
    }
    target = null;
  }

  function schedule(next: HTMLElement) {
    window.clearTimeout(timer);
    const warm = performance.now() - hiddenAt < TOOLTIP_WARM_MS;
    if (target || warm) {
      show(next);
      return;
    }
    timer = window.setTimeout(() => show(next), TOOLTIP_DELAY_MS);
  }

  function owner(node: EventTarget | null): HTMLElement | null {
    if (!(node instanceof Element)) return null;
    const el = node.closest<HTMLElement>("[data-tooltip]");
    return el && root.contains(el) ? el : null;
  }

  const onPointerOver = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    const el = owner(event.target);
    if (el && el !== target) schedule(el);
  };
  const onPointerOut = (event: PointerEvent) => {
    const el = owner(event.target);
    if (!el) return;
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return;
    hide();
  };
  const onFocusIn = (event: FocusEvent) => {
    const el = owner(event.target);
    if (el && el.matches(":focus-visible")) schedule(el);
  };
  const onFocusOut = () => hide();
  const onPointerDown = () => hide();
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") hide();
  };

  root.addEventListener("pointerover", onPointerOver);
  root.addEventListener("pointerout", onPointerOut);
  root.addEventListener("focusin", onFocusIn);
  root.addEventListener("focusout", onFocusOut);
  root.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("scroll", hide, true);
  return () => {
    hide();
    root.removeEventListener("pointerover", onPointerOver);
    root.removeEventListener("pointerout", onPointerOut);
    root.removeEventListener("focusin", onFocusIn);
    root.removeEventListener("focusout", onFocusOut);
    root.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("scroll", hide, true);
  };
}

/** Roving focus inside an open menu. Returns true when the key was handled. */
export function handleMenuKeydown(event: KeyboardEvent, menu: HTMLElement): boolean {
  const items = Array.from(
    menu.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemcheckbox"]'),
  );
  if (items.length === 0) return false;
  const index = items.indexOf(document.activeElement as HTMLElement);
  let next = -1;
  if (event.key === "ArrowDown") next = index < 0 ? 0 : (index + 1) % items.length;
  else if (event.key === "ArrowUp") next = index < 0 ? items.length - 1 : (index - 1 + items.length) % items.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = items.length - 1;
  else if (event.key === "Tab") {
    menu.hidePopover();
    return false;
  } else if ((event.key === "Enter" || isSpaceKey(event)) && index >= 0) {
    event.preventDefault();
    items[index].click();
    return true;
  }
  if (next < 0) return false;
  event.preventDefault();
  items[next].focus();
  return true;
}

/* ------------------------------------------------------------------ */
/* Pointer reordering                                                  */
/* ------------------------------------------------------------------ */

export type PointerSortableOptions = {
  /** Rows that take part in sorting. Leaving rows must be excluded. */
  rowSelector: string;
  /** Pointer-downs inside this selector never start a drag (row actions). */
  ignoreSelector: string;
  canStart: (row: HTMLElement) => boolean;
  /** Must update the DOM order before resolving (flushSync / nextTick / tick). */
  onDrop: (from: number, to: number) => void | Promise<void>;
  onStart?: () => void;
  onEnd?: () => void;
};

export type PointerSortable = {
  isActive: () => boolean;
  destroy: () => void;
};

type Pending = {
  pointerId: number;
  pointerType: string;
  x: number;
  y: number;
  row: HTMLElement;
  armed: boolean;
  timer: number;
};

type Drag = {
  pointerId: number;
  row: HTMLElement;
  rows: HTMLElement[];
  from: number;
  to: number;
  startY: number;
  startScroll: number;
  tops: number[];
  heights: number[];
  minOffset: number;
  maxOffset: number;
  lastY: number;
  raf: number;
  settling: boolean;
};

/**
 * Vertical, list-bounded drag to reorder. Mouse and pen start after 8px of
 * travel; touch starts after a 250ms press so the list can still scroll.
 * Rows are moved with transforms only; the framework re-orders its data once,
 * on drop. Escape or pointercancel animates the row back.
 */
export function createPointerSortable(list: HTMLElement, options: PointerSortableOptions): PointerSortable {
  let pending: Pending | null = null;
  let drag: Drag | null = null;
  let endedAt = 0;

  const rowsNow = () => Array.from(list.querySelectorAll<HTMLElement>(options.rowSelector));
  const easing = () => (prefersReducedMotion() ? "none" : `transform ${SORT_DURATION_MS}ms ${SORT_EASING}`);

  function clearPending() {
    if (pending) window.clearTimeout(pending.timer);
    pending = null;
  }

  function activate() {
    if (!pending) return;
    const rows = rowsNow();
    const from = rows.indexOf(pending.row);
    if (from < 0) {
      clearPending();
      return;
    }
    const tops = rows.map((row) => row.offsetTop);
    const heights = rows.map((row) => row.offsetHeight);
    const last = rows.length - 1;
    drag = {
      pointerId: pending.pointerId,
      row: pending.row,
      rows,
      from,
      to: from,
      startY: pending.y,
      startScroll: list.scrollTop,
      tops,
      heights,
      minOffset: tops[0] - tops[from],
      maxOffset: tops[last] + heights[last] - (tops[from] + heights[from]),
      lastY: pending.y,
      raf: 0,
      settling: false,
    };
    clearPending();
    window.getSelection()?.removeAllRanges();
    list.dataset.pointerDragging = "true";
    drag.row.dataset.dragSource = "true";
    drag.row.style.transition = "none";
    drag.row.style.zIndex = "1";
    options.onStart?.();
    drag.raf = requestAnimationFrame(autoscroll);
  }

  function layout(clientY: number) {
    if (!drag || drag.settling) return;
    const d = drag;
    const scrollDelta = list.scrollTop - d.startScroll;
    const offset = Math.max(d.minOffset, Math.min(d.maxOffset, clientY - d.startY + scrollDelta));
    d.row.style.transform = `translate3d(0, ${offset}px, 0)`;
    const height = d.heights[d.from];
    const center = d.tops[d.from] + height / 2 + offset;
    let to = d.from;
    for (let i = 0; i < d.rows.length; i++) {
      const mid = d.tops[i] + d.heights[i] / 2;
      if (i < d.from && center < mid) {
        to = i;
        break;
      }
      if (i > d.from && center > mid) to = i;
    }
    d.to = to;
    const transition = easing();
    d.rows.forEach((row, i) => {
      if (i === d.from) return;
      let shift = 0;
      if (d.from < i && i <= to) shift = -height;
      else if (to <= i && i < d.from) shift = height;
      row.style.transition = transition;
      row.style.transform = shift ? `translate3d(0, ${shift}px, 0)` : "";
    });
  }

  function autoscroll() {
    if (!drag || drag.settling) return;
    const rect = list.getBoundingClientRect();
    const y = drag.lastY;
    let speed = 0;
    if (y < rect.top + AUTOSCROLL_EDGE_PX) {
      speed = -Math.ceil(((rect.top + AUTOSCROLL_EDGE_PX - y) / AUTOSCROLL_EDGE_PX) * AUTOSCROLL_MAX_SPEED_PX);
    } else if (y > rect.bottom - AUTOSCROLL_EDGE_PX) {
      speed = Math.ceil(((y - (rect.bottom - AUTOSCROLL_EDGE_PX)) / AUTOSCROLL_EDGE_PX) * AUTOSCROLL_MAX_SPEED_PX);
    }
    speed = Math.max(-AUTOSCROLL_MAX_SPEED_PX, Math.min(AUTOSCROLL_MAX_SPEED_PX, speed));
    if (speed) {
      const before = list.scrollTop;
      list.scrollTop += speed;
      if (list.scrollTop !== before) layout(y);
    }
    drag.raf = requestAnimationFrame(autoscroll);
  }

  function slotOffset(d: Drag): number {
    if (d.to > d.from) return d.tops[d.to] + d.heights[d.to] - (d.tops[d.from] + d.heights[d.from]);
    if (d.to < d.from) return d.tops[d.to] - d.tops[d.from];
    return 0;
  }

  async function finish(commit: boolean) {
    if (!drag || drag.settling) return;
    const d = drag;
    d.settling = true;
    cancelAnimationFrame(d.raf);
    if (!commit) d.to = d.from;
    const transition = easing();
    d.rows.forEach((row, i) => {
      if (i !== d.from && !commit) {
        row.style.transition = transition;
        row.style.transform = "";
      }
    });
    d.row.style.transition = transition;
    d.row.style.transform = `translate3d(0, ${slotOffset(d)}px, 0)`;
    if (transition !== "none") {
      await new Promise((resolve) => window.setTimeout(resolve, SORT_DURATION_MS));
    }
    if (d.to !== d.from) await options.onDrop(d.from, d.to);
    const touched = new Set([...d.rows, ...rowsNow()]);
    touched.forEach((row) => {
      row.style.transition = "none";
      row.style.transform = "";
      row.style.zIndex = "";
      delete row.dataset.dragSource;
    });
    void list.offsetHeight;
    touched.forEach((row) => {
      row.style.transition = "";
    });
    delete list.dataset.pointerDragging;
    endedAt = performance.now();
    drag = null;
    options.onEnd?.();
  }

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !event.isPrimary || drag) return;
    const target = event.target as Element | null;
    if (!target || target.closest(options.ignoreSelector)) return;
    const row = target.closest<HTMLElement>(options.rowSelector);
    if (!row || !list.contains(row) || !options.canStart(row)) return;
    clearPending();
    pending = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      x: event.clientX,
      y: event.clientY,
      row,
      armed: event.pointerType !== "touch",
      timer: 0,
    };
    if (event.pointerType === "touch") {
      const current = pending;
      current.timer = window.setTimeout(() => {
        if (pending === current) activate();
      }, TOUCH_DELAY_MS);
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    if (pending && event.pointerId === pending.pointerId) {
      const distance = Math.hypot(event.clientX - pending.x, event.clientY - pending.y);
      if (pending.armed && distance >= DRAG_DISTANCE_PX) activate();
      else if (!pending.armed && distance > TOUCH_TOLERANCE_PX) clearPending();
    }
    if (drag && event.pointerId === drag.pointerId) {
      drag.lastY = event.clientY;
      layout(event.clientY);
    }
  };

  const onPointerUp = (event: PointerEvent) => {
    if (pending && event.pointerId === pending.pointerId) clearPending();
    if (drag && event.pointerId === drag.pointerId) void finish(true);
  };

  const onPointerCancel = (event: PointerEvent) => {
    if (pending && event.pointerId === pending.pointerId) clearPending();
    if (drag && event.pointerId === drag.pointerId) void finish(false);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!drag || event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    void finish(false);
  };

  const onTouchMove = (event: TouchEvent) => {
    if (drag) event.preventDefault();
  };

  const onContextMenu = (event: Event) => {
    if (drag || pending?.pointerType === "touch") event.preventDefault();
  };

  const onClickCapture = (event: MouseEvent) => {
    if (performance.now() - endedAt > DRAG_CLICK_WINDOW_MS) return;
    event.preventDefault();
    event.stopPropagation();
  };

  list.addEventListener("pointerdown", onPointerDown);
  list.addEventListener("touchmove", onTouchMove, { passive: false });
  list.addEventListener("contextmenu", onContextMenu);
  list.addEventListener("click", onClickCapture, true);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerCancel);
  window.addEventListener("keydown", onKeyDown, true);

  return {
    isActive: () => drag !== null,
    destroy() {
      clearPending();
      if (drag) cancelAnimationFrame(drag.raf);
      list.removeEventListener("pointerdown", onPointerDown);
      list.removeEventListener("touchmove", onTouchMove);
      list.removeEventListener("contextmenu", onContextMenu);
      list.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("keydown", onKeyDown, true);
    },
  };
}
