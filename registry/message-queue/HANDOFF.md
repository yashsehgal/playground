# Message Queue: handoff

For the next engineer or AI agent picking this up. Read `RULES.md` first, then this.

## Where this came from

- The design was first built for the Octolane app on the branch `yash/oct-4113-support-queued-follow-up-messages-in-ai-chat`, using Tailwind, Base UI, and dnd-kit.
- It was refined in this playground. The source of truth for the *look* is `components/message-queue.tsx`, rendered at `/ai-chat-queue`. That version still uses Tailwind, Base UI, dnd-kit, Hugeicons, and Lucide.
- `registry/message-queue/` is the shareable rewrite: the same behaviour and pixels, with no dependencies, in three frameworks. When the two disagree visually, the playground version wins. Port the change into `message-queue.css`.

## Status

| Part | State | Verified |
| --- | --- | --- |
| `core.ts`, `icons.ts`, `message-queue.css` | Done | |
| React port | Done | `tsc` and ESLint clean. Browser-tested: keyboard lift, move, cancel and drop; pointer drag; menu; edit; dark mode; queueing |
| Vue port | Done | `vue-tsc` clean. Same browser test, identical results |
| Svelte port | Done | `svelte-check` 0 errors and 0 warnings. Same browser test, identical results |
| Docs | Done | README, BREAKDOWN, GUIDELINES, RULES, this file |
| `registry-item.json` | React only | See "Distribution" below |

Tested with React 19.2, Next 16.3, Vue 3.5.43, Svelte 5.57, Vite 8, Chrome. Not yet tested by hand in Safari or Firefox, or with a real screen reader.

## How the pieces talk

```
framework component
  ├─ owns state: messages, draft, editingId, leavingIds, activeId, expanded, lifted, menuFor, status
  ├─ renders markup with mq-* classes and data-* states
  └─ calls core:
       resolveQueueKey()        window keydown → focus / edit / delete / composer
       resolveLiftKey()         keydown on a lifted row → move / drop / cancel
       createPointerSortable()  pointer drag; calls back onDrop(from, to) with visible-queue indices
       createTooltips()         one tooltip for every [data-tooltip]
       placePopover()           positions the menu and tooltip in the top layer
       handleMenuKeydown()      roving focus and activation inside the menu
       announce.*               every live-region string
```

The framework never touches row transforms. The sortable controller writes `style.transform` and `data-drag-source` directly, then clears them once `onDrop` has reordered the DOM.

## Gotchas already paid for

1. **Moving a focused element blurs it.** Keyed reorders move DOM nodes, and Chrome blurs the focused node. That fires `onItemBlur`, which drops a lifted row mid-move. The `moving` flag around the reorder is the fix (rule 15).
2. **`onDrop` must flush.** Without `flushSync` or `nextTick`, the controller clears the transforms before the framework reorders, and the dropped row flashes in its old slot.
3. **Space has two identities.** Some events set `key === " "` and others only `code === "Space"`. `isSpaceKey` checks both. Missing this made keyboard lifting silently fail in automated tests.
4. **Native button activation isn't guaranteed in popovers.** Synthetic Enter on a focused `<button>` inside the menu didn't click it. `handleMenuKeydown` now clicks the item itself and calls `preventDefault`, so a real browser doesn't click twice.
5. **Light dismiss plus the trigger click reopened the menu.** Clicking the trigger of an open `popover="auto"` closes it on pointerdown, then the click reopened it. The fix is a 200ms reopen guard keyed by message id.
6. **Clicks after a drag.** Releasing a drag over a row's button would click it. The controller swallows clicks for 250ms after a drag ends. The test script waits 700ms after a drag for this reason.
7. **Dark mode drift.** Opaque greys at different lightness levels made the dark theme look patchy. Everything above the surface is now translucent white on a warm surface (rule 9).
8. **`--muted` clash.** In the playground's Tailwind theme, `--color-muted` was a *text* colour, and shadcn's `--muted` only flipped under a `.dark` class. The registry CSS avoids generic names; everything is `--mq-*`.
9. **Vue reserves `class` as a prop name.** The Vue `Icon` functional component declares `name`, `stroke`, and `visible` only, so `class` falls through and merges onto the `<svg>`.
10. **TypeScript 7 breaks the checkers.** `vue-tsc` and `svelte-check` currently need TypeScript 6 (`npm i -D typescript@~6`).
11. **The badge's left padding is 11px on purpose.** It's an optical correction for the "E" side bearing (see BREAKDOWN).
12. **Hydration race in the Next preview.** The first click right after a reload can land before React hydrates, so the menu doesn't open. Wait for hydration in tests.

## Parity test

`parity-test.js` drives a mounted queue with three messages, ids `a`, `b`, `c`, through the full flow:
- enter the list from the composer;
- lift, move, cancel, then lift, move, drop;
- pointer drag;
- open the menu, ArrowDown, Enter;
- E to edit, then Esc;
- type and send.

It returns a JSON object of observations.

1. Serve a page that mounts the component with that seed and logs `onReorder` and `onSendNewChat` into `window.__log`.
2. In DevTools, run `await import('/parity-test.js'); await mqTest()`. Or fetch it and `eval` it on pages that can't import it.
3. All three ports must return the same object. The expected values, apart from the content of `__log`:

```json
{
  "enterList": "Compa",
  "lifted": ["true", "Picked up"],
  "moved": ["Flag ,Compa,Draft", "Compa", "Moved to position 2 of 3"],
  "cancelled": ["Flag ,Draft,Compa", "Compa", "none"],
  "dropped": ["Flag ,Compa,Draft", "Dropped", "[[\"reorder\",[\"a\",\"c\",\"b\"]]]"],
  "dragging": "true",
  "dragged": ["Compa,Flag ,Draft", "||", "[\"reorder\",[\"c\",\"a\",\"b\"]]"],
  "menu": [true, "Send and", 1],
  "menuAction": [false, "Flag ,Draft", "Flag ", "Sent in a new chat", "[\"newchat\",\"c\"]"],
  "editing": [true, "Flag ", true, "false,true"],
  "editCancelled": [false, "Flag ", "Cancelled editing"],
  "canSend": "1 visible icon",
  "queued": ["Flag ,Draft,Summa", "3 queued messages", true, "Queued: Summarize the call notes"]
}
```

A Vite scratch app that mounts Vue and Svelte side by side takes about two minutes to set up:
- install `vite`, `@vitejs/plugin-vue`, `@sveltejs/vite-plugin-svelte`, `vue`, `svelte`, and `typescript@~6`;
- set `"type": "module"`;
- copy this folder into `src/`;
- mount on `#vue` or `#svelte`.

Then also check by hand, because the script can't:
- [ ] With a real keyboard, Enter and Space on "Always send in chat" toggle it exactly once. That confirms the `preventDefault` in `handleMenuKeydown` stops native activation.
- [ ] Tooltips appear after 600ms on hover and on keyboard focus, never on touch, and show the shortcut hint.
- [ ] Touch: long-press (250ms) starts a drag, and a swipe scrolls.
- [ ] Autoscroll: with 8+ messages, dragging near the list's top or bottom edge scrolls it.
- [ ] Scroll fade appears only at edges with hidden rows, and only with 6+ messages.
- [ ] Dark mode three ways: OS setting, `theme="dark"`, and a `.dark` ancestor. `theme="light"` inside `.dark` stays light.
- [ ] Reduced motion: everything works, with nothing sliding or scaling.
- [ ] VoiceOver and NVDA read the option label, the "sortable message" role description, the hint, and each announcement.

## Distribution

aicss.dev serves components through the shadcn registry protocol (`npx shadcn add <url>`). Its free items are `registry:block` entries with inline file contents, and that's what `registry-item.json` describes, with `files[].path` pointing at the sources here. To publish:

1. Run `npx shadcn build` (or the site's own build) with this item in the site's `registry.json`, so file `content` is inlined.
2. The React entry installs `core.ts`, `icons.ts`, `message-queue.css`, and `react/MessageQueue.tsx` under `components/message-queue/`.
3. Vue and Svelte don't have an official shadcn CLI. Their equivalents, shadcn-vue and shadcn-svelte, accept the same item shape with `.vue` or `.svelte` files. Either duplicate the item per framework (`message-queue-vue.json`, `message-queue-svelte.json`) with the right component file, or show the code on the page for copy and paste, as aicss already does.
4. Ask the aicss maintainers whether Pro items need a different item `type` or metadata before publishing. That's outside this repo.

## Known gaps and next steps

- **Voice is UI only.** The mic toggles `recording` and fires `onRecordingChange`, but there's no speech capture. Wire it to the Web Speech API or your own transcription and write the result into the draft. You may need to add a `draft` binding for that.
- **No attachment previews or upload progress.** Chips show names only.
- **No `draft` control from outside.** If the host needs to pre-fill or clear the composer, add a controlled `draft` value to all three ports, following the `messages` pattern.
- **No Popover API fallback.** On browsers without it, the menu and tooltip won't open. `supportsPopover` is exported, so you could render the menu inline as a fallback.
- **One instance per page is the tested case.** Multiple instances work, with ids generated per instance, but haven't been exercised.
- **Collapse doesn't persist.** Store `expanded` yourself if it should survive reloads, after adding a prop for it.
- **No preview route for the React port.** To test it in the playground, mount `registry/message-queue/react/MessageQueue` on a temporary page with `defaultMessages` seeded as above.

## Taking it to another framework

To port it to Solid, Angular, Lit, or anything else:

1. Import `core.ts`, `icons.ts`, and `message-queue.css` unchanged.
2. Copy the markup from any of the three ports. They're structurally identical, attribute for attribute.
3. Reproduce the state list (see "How the pieces talk") and the effects:
   - autosize on draft change;
   - the two-frame mic guard after send;
   - tooltips on mount;
   - the sortable while messages exist;
   - the global key handler gated by rule 16;
   - the menu `toggle` listener for focus return.
4. Find your framework's synchronous flush for `onDrop` and the lifted-row moves.
5. Run `parity-test.js`, then the manual checklist.
