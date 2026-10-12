window.mqTest = async function mqTest() {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const order = () => $$(".mq-item-label").map((n) => n.textContent.slice(0, 5));
  const status = () => $("[role=status]").textContent;
  const focused = () => document.activeElement?.getAttribute("aria-label")?.slice(0, 5) ?? document.activeElement?.className;
  const key = async (key, code = key) => {
    const el = document.activeElement ?? document.body;
    el.dispatchEvent(new KeyboardEvent("keydown", { key, code, bubbles: true, cancelable: true }));
    await frame();
  };
  const out = {};
  window.__log = [];

  $(".mq-field").focus();
  await key("ArrowUp");
  out.enterList = focused();
  await key(" ", "Space");
  out.lifted = [$(".mq-list").dataset.lifted, status().slice(0, 9)];
  await key("ArrowUp");
  out.moved = [order().join(","), focused(), status()];
  await key("Escape");
  out.cancelled = [order().join(","), focused(), $(".mq-list").dataset.lifted ?? "none"];
  await key(" ", "Space");
  await key("ArrowUp");
  await key("Enter");
  out.dropped = [order().join(","), status().slice(0, 7), JSON.stringify(window.__log)];

  const label = $$(".mq-item-label")[0];
  const r = label.getBoundingClientRect();
  const x = r.left + 30, y = r.top + r.height / 2;
  const opt = { bubbles: true, pointerId: 9, pointerType: "mouse", isPrimary: true, button: 0, buttons: 1, clientX: x };
  label.dispatchEvent(new PointerEvent("pointerdown", { ...opt, clientY: y }));
  for (let i = 1; i <= 12; i++) {
    window.dispatchEvent(new PointerEvent("pointermove", { ...opt, clientY: y + i * 5 }));
    await wait(16);
  }
  out.dragging = $(".mq-list").dataset.pointerDragging;
  window.dispatchEvent(new PointerEvent("pointerup", { ...opt, buttons: 0, clientY: y + 60 }));
  await wait(700);
  out.dragged = [order().join(","), $$(".mq-row").map((n) => n.style.transform).join("|"), JSON.stringify(window.__log.at(-1))];

  $$('[aria-label="More options"][aria-haspopup]')[0].click();
  await frame();
  out.menu = [$(".mq-menu").matches(":popover-open"), document.activeElement.textContent.trim().slice(0, 8), $$('[aria-haspopup][aria-expanded="true"]').length];
  await key("ArrowDown");
  await key("Enter");
  await wait(450);
  out.menuAction = [$(".mq-menu").matches(":popover-open"), order().join(","), focused(), status().slice(0, 18), JSON.stringify(window.__log.at(-1))];

  await key("e", "KeyE");
  await frame();
  out.editing = [!!$(".mq-badge"), $(".mq-field").value.slice(0, 5), document.activeElement === $(".mq-field"), $$(".mq-row").map((n) => n.inert).join(",")];
  await key("Escape");
  await wait(100);
  out.editCancelled = [!!$(".mq-badge"), focused(), status()];

  $(".mq-field").focus();
  const field = $(".mq-field");
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
  setter.call(field, "Summarize the call notes");
  field.dispatchEvent(new Event("input", { bubbles: true }));
  await frame();
  out.canSend = $$(".mq-primary-icon[data-visible=true]").length + " visible icon";
  await key("Enter");
  await wait(100);
  out.queued = [order().join(","), $(".mq-count").textContent, field.value === "", status()];
  return out;
};
