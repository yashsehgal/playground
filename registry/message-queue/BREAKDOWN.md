# Message Queue: breakdown

The anatomy, every state, the exact measurements, and the motion spec. If a number here disagrees with `message-queue.css`, the CSS is right and this file needs updating.

## Anatomy

```
.mq ─────────────────────────────────────────────────────────────────────
│ p.mq-sr-only[role=status]                live region
│
│ .mq-panel[data-expanded]                 only rendered when messages.length > 0
│ └ .mq-card                               surface, radius 18, shadow
│   ├ .mq-header                           8 8 8 12 padding (bottom 4 when expanded)
│   │ ├ button.mq-count                    "3 queued messages" + chevron, toggles collapse
│   │ └ button.mq-icon-button              X: dismiss the whole queue
│   └ .mq-collapse[inert when collapsed]   grid-template-rows 1fr ↔ 0fr
│     └ .mq-collapse-inner
│       ├ p.mq-sr-only#hint                reorder/edit/remove instructions
│       └ ul.mq-list[role=listbox]         max-height 160, padding 0 6 6
│         └ li.mq-row[role=presentation]   height 28, animates to 0 on leave
│           └ div.mq-item[role=option]     the focusable row
│             ├ p.mq-item-label            single line, ellipsis
│             └ .mq-item-actions
│               ├ button.mq-send-now       ↳ Send now
│               ├ button.mq-icon-button    pencil  (E)
│               ├ button.mq-icon-button    trash   (⌘⌫)
│               └ button.mq-icon-button    ⋯       opens the menu
│               (or span.mq-item-status "Editing" on the row being edited)
│
│ form.mq-composer                         surface, radius 24, padding 8
│ ├ textarea.mq-field                      autosizes to 128px max
│ ├ .mq-chips                              attachments, only when present
│ └ .mq-footer
│   ├ .mq-footer-start
│   │ ├ button.mq-add                      + (opens the hidden file input)
│   │ └ span.mq-badge                      "Editing ×", only while editing
│   └ .mq-primary                          one 32px slot:
│     ├ button[type=submit]                send, shown when there is content
│     ├ button                             record / stop, shown when empty
│     └ .mq-primary-icons                  mic / square / arrow cross-fade
│
│ div.mq-menu[popover=auto][role=menu]     one menu, shared by every row
│ div.mq-tooltip[popover=manual]           one tooltip, shared by every control
└────────────────────────────────────────────────────────────────────────
```

The menu and tooltip are rendered once, at the root, and promoted to the browser's top layer. That is what lets them escape the list's `overflow: hidden` without a portal, while still inheriting the `--mq-*` tokens through the DOM.

## Measurements

All values are CSS pixels.

### Queue panel

| Part | Value |
| --- | --- |
| Gap to composer | 8 |
| Radius | 18 |
| Header padding | 8 top, 8 right, 8 bottom (4 when expanded), 12 left |
| Count label | 13/20, weight 500, tabular numbers, muted ink |
| Chevron | 12, stroke 1.5, rotates −90° when collapsed |
| Header X | 20 hit box, 12 glyph, radius 6 |
| List padding | 0 6 6 |
| List max height | 160 (about five rows plus padding), then scrolls with a hidden scrollbar |
| Row height | 28 |
| Row padding | 0 2 0 6; editing row 0 10 0 6 |
| Row radius | 8; the last row's bottom corners are 12, which is panel radius 18 minus the 6 inset |
| Label | 13/20, single line, ellipsis |
| Gap label → actions | 6 |
| Gap between actions | 0 (the 20px hit boxes sit flush) |
| Send now | 20 tall, padding 0 6 0 4, gap 4, 12/16 weight 500, 12px corner-down-right icon at stroke 2 |
| Row icons | 20 hit box, 12 glyph, stroke 2 |
| Scroll fade | 24 at each edge that has hidden rows; only with 6+ messages |

### Composer

| Part | Value |
| --- | --- |
| Radius / padding | 24 / 8 |
| Field padding | 6 10 4 |
| Field type | 16/20 on small screens (prevents iOS zoom), 14/20 at ≥ 640 wide |
| Field max height | 128, then scrolls |
| Footer padding | 0 4 2 |
| + button | 32 circle, 16 glyph, stroke 1.5 |
| Gap + → badge | 6 |
| Badge | 32 tall, padding 0 4 0 11, 13/20 weight 500, X is a 24 circle with a 12 glyph |
| Primary slot | 32 circle, 16 glyph, stroke 1.5 |
| Chip | max 160 wide, padding 2 2 2 8, 12/16 weight 500, 20 remove button |

The badge's 11px left padding is optical, not a typo. The "E" has a side bearing, so 11px of padding gives 12px from the ink to the edge. That matches the 12px from the X glyph to the right edge, which is 4px of padding plus 6px of button inset plus 2px of glyph inset. Text to X is 8px of ink.

### Floating layers

| Part | Value |
| --- | --- |
| Menu | min width 224, padding 4, radius 12, offset 6 below the trigger, aligned to its right edge; flips above when there's no room |
| Menu item | padding 6 10, gap 8, 13/20, radius 8, 16px icon at stroke 1.75 |
| Separator | 1, bleeds to the menu edge (margin 4 −4) |
| Switch | 28 × 16 track, 12 thumb, 2 inset, thumb travels 12 |
| Tooltip | padding 4 8, radius 8, 12/16 weight 500, offset 6 above the trigger (flips below), max width 20rem |
| Viewport gutter | 8 on every side for both layers |

## Colour

The light and dark palettes are listed in `message-queue.css`. Three decisions shape them:

1. **Shadow instead of border.** The edge is a 1px, 0-offset shadow (`0 0 1px`) plus two soft drop shadows. It reads as a hairline but follows the radius perfectly and doesn't add to the box size.
2. **Warm dark mode.** The dark surface is `oklch(0.25 0.008 75)`, the same hue as a warm page background. Every fill on top of it is translucent white (`/0.06`, `/0.08`, `/0.12`), so the layers always stay in the same family instead of drifting into neutral greys.
3. **Inverted layers.** The menu and tooltip are near-black on light and white on dark, so they read as floating above the surface rather than part of it.

## States

### Panel

| State | Trigger | Visual |
| --- | --- | --- |
| Absent | `messages.length === 0` | Not rendered |
| Entering | First message | Fades in from 8px below, at 0.97 scale |
| Expanded | Default | List visible |
| Collapsed | Click the count | List animates to 0 rows and becomes `inert`; chevron turns −90°; keyboard shortcuts pause |

### Row

| State | Attribute | Visual |
| --- | --- | --- |
| Rest | none | Transparent |
| Hover / focus-visible | `:hover`, `:focus-visible` | `--mq-fill-hover` |
| Tab stop | `aria-selected="true"`, `tabindex=0` | Same as rest, since this is roving focus |
| Draggable | `data-draggable="true"` | `cursor: grab` (2+ messages, not editing) |
| Being edited | `data-editing="true"` | `--mq-fill-editing`, actions replaced by "Editing" |
| Locked | `data-locked="true"` + `inert` | Every other row while one is edited |
| Leaving | `data-leaving="true"` | Height and opacity animate to 0, then the row is removed |
| Dragging (source) | `data-drag-source="true"` | Follows the pointer; hover fill; above its siblings |
| Lifted (keyboard) | `data-lifted="true"` | Same as dragging source |
| Others during a move | list has `data-pointer-dragging` or `data-lifted` | 0.45 opacity, actions not clickable, but still visible |

### Composer primary slot

| Content | Recording | Shows | Label |
| --- | --- | --- | --- |
| Empty | No | Mic | Record voice |
| Empty | Yes | Square | Stop recording (placeholder becomes "Listening…") |
| Text or attachments | Any | Arrow up | Send message (typing stops recording) |

After a send, the mic button is disabled for two animation frames, so a double-click on Send can't start a recording.

### Menu

| Item | Role | Action |
| --- | --- | --- |
| Send and run in parallel | `menuitem` | Fires `onSendParallel`, removes the row |
| Send in a new chat | `menuitem` | Fires `onSendNewChat`, removes the row |
| (separator) | `hr` | |
| Always send in chat | `menuitemcheckbox` | Toggles the switch; the menu stays open |

## Motion spec

| What | Property | Duration | Curve |
| --- | --- | --- | --- |
| Panel enter | opacity, translateY 8→0, scale 0.97→1 | 150ms | `--mq-ease-enter` (0.19, 1, 0.22, 1) |
| Row enter | height 0→28, opacity | 150ms | ease-enter |
| Row leave | height 28→0, opacity | 150ms (removed on `transitionend`, or after 300ms as a fallback) | ease-enter |
| Collapse | grid-template-rows, opacity | 150ms | `--mq-ease-out` (0.23, 1, 0.32, 1) |
| Chevron | rotate | 150ms | ease-out |
| Sibling shift while sorting | transform | 150ms | ease-out |
| Drop settle | transform to the final slot, then the data reorders | 150ms | ease-out |
| Press | scale → 0.96 | 150ms | ease-out |
| Hover colours | background, colour | 150ms | `--mq-ease-hover` |
| Primary icon swap | opacity, scale 0.25↔1, blur 4px↔0 | 200ms | `--mq-ease-icon` (0.2, 0, 0, 1) |
| Badge enter | opacity, scale 0.95→1 | 150ms | ease-enter |
| Menu / tooltip | opacity, scale 0.95↔1, from the trigger side | 150ms | ease-out |
| Tooltip delay | | 600ms first, instant within 300ms of the last one | |

Enter animations use `@starting-style`, so they need no JavaScript and work for any element the framework inserts.

**Reduced motion:**
- Movement, scale and blur are removed.
- Panel, row and badge keep an opacity fade on enter.
- Removed rows disappear at once, with no exit transition to wait for.
- Sorting moves rows instantly.

## Interaction thresholds

| | Value | Why |
| --- | --- | --- |
| Mouse/pen drag start | 8px of travel | Clicks and text selection don't start a drag |
| Touch drag start | 250ms press within 5px | A swipe still scrolls the list |
| Edge autoscroll | 24px zone, up to 8px per frame | Reach rows beyond the 160px clip |
| Click suppression after a drag | 250ms | Releasing on a button doesn't trigger it |
| Menu reopen guard | 200ms | Clicking the open trigger closes the menu rather than closing and reopening it |
