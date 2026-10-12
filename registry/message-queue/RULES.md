# Message Queue: rules

Non-negotiables for anyone, human or AI, who changes this component. Each rule has a reason. If you break one, you will probably reintroduce a bug that has already been fixed once.

## Architecture

1. **Behaviour lives in `core.ts`. Frameworks only render and hold state.** Keyboard maps, drag physics, tooltip timing, popover placement, copy, and constants are written once. If you add a behaviour to one framework file, add it to `core.ts` and call it from all three.
2. **All three ports change together.** A pull request that touches one framework file and not the other two is incomplete. Run the parity test in `HANDOFF.md` on each port.
3. **No runtime dependencies.** No Tailwind, headless UI kits, dnd-kit/sortable libraries, motion libraries, or icon packages. The point of the component is that the CSS file plus one framework file is everything.
4. **One stylesheet, `mq-` prefix, no scoped styles.** Don't move styles into `<style scoped>`, Svelte `<style>`, or CSS modules. The class names are the public, documented API that aicss.dev lists.
5. **State is expressed through attributes.** Use `data-*` and ARIA attributes with the literal values `"true"` and `"false"`, never class toggles. The CSS selects `[data-x="true"]`, so each framework must render booleans as those strings.

## Styling

6. **Colours, radii, and curves are tokens.** New values go into `--mq-*` on `.mq`, with a dark value in *both* dark blocks (`[data-theme=dark]` / `:where(.dark)` and the `prefers-color-scheme` media query). The two blocks must stay identical.
7. **No `!important`.** Resets are wrapped in `:where()` so they have zero specificity and any consumer rule wins.
8. **No borders on the panel or composer.** The `0 0 1px` shadow is the edge.
9. **Dark fills are translucent white over the warm surface.** Don't introduce opaque greys. That is exactly what made the dark mode look patchy before.
10. **The field is 16px below 640px.** iOS zooms into inputs smaller than 16px.
11. **Hit areas are at least 20px and icons sit centred in them.** Don't shrink the boxes to tighten spacing. Change the gap instead, which is 0 between row actions today.

## Behaviour

12. **IDs are the identity.** Never key rows by index, and never derive focus or drag state from an index without mapping it back to an id first.
13. **Reorder through `moveItem` on the full `messages` array**, mapping from the visible `queue`, which excludes leaving rows. Indices from the sortable controller are visible-queue indices.
14. **The pointer sortable's `onDrop` must update the DOM synchronously** (React `flushSync`, Svelte `flushSync`, Vue `await nextTick()`). The controller clears its transforms right after `onDrop` resolves. If the DOM hasn't reordered by then, the row snaps back to its old slot for a frame.
15. **Moving a focused row must be guarded.** Reordering the DOM blurs the focused element, and blur drops a lifted row. Set the `moving` flag before the reorder, refocus afterwards, then clear it.
16. **The global key handler is off while** the panel is collapsed, the queue is empty, a message is being edited, a pointer drag is active, or a row is lifted. Each of those states owns the keyboard.
17. **The global handler listens on `window` in the capture phase** and calls `stopPropagation` when it acts, so the host app's own shortcuts don't fire as well.
18. **Accept Space by `key` or `code`** (use `isSpaceKey`). Some keyboards, IMEs, and automation tools only set one of them.
19. **The menu handles Enter and Space itself.** Don't rely on native button activation inside the popover. Synthetic and assistive-technology key events don't always trigger it.
20. **Focus never falls to `<body>`.** After every removal, focus moves to the next row, the previous row, or the composer. After an edit is saved or cancelled, it returns to the edited row.
21. **Events fire immediately; the messages update fires after exit motion.** Consumers rely on `onSendNow` and the other events being synchronous with the click. Don't defer them behind animations.
22. **Editing locks the other rows** (`inert` plus `data-locked`). Editing one message while sending or removing another leads to lost edits.

## Accessibility

23. **Every change is announced** through the single polite live region, using a string from `announce`. Never use `role="alert"`.
24. **Every icon-only control has an `aria-label`**, plus `aria-keyshortcuts` if a shortcut exists. The tooltip repeats the label; it never replaces it.
25. **Tooltips never appear on touch** and never contain anything interactive.
26. **Reduced motion keeps every feature.** Remove movement, not functionality.

## Copy

27. **Every user-facing string lives in `core.ts`**, either in `announce`, `REORDER_HINT`, or the label helpers, apart from fixed control labels in the templates. If you change one, change it in all three templates.
28. **Sentence case, verb-first, no trailing full stops** on controls. Announcements are full sentences.
