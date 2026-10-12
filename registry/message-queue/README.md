# Message Queue

Line up follow-up prompts while the agent is still working, then reorder, edit, or send any of them early.

Component by Yash

```bash
npx shadcn@latest add "https://www.aicss.dev/r/message-queue.json?token=$AICSS_TOKEN"
```

## What it is

A chat composer with a queue stacked on top of it. While an AI agent is busy, everything the user submits goes into the queue instead of interrupting the run. Each queued message can be:

- **sent now**, jumping the queue;
- **edited** in the composer, with an "Editing" badge and Esc to cancel;
- **removed**;
- **reordered** by dragging, or with the keyboard (Space, arrows, Space);
- **sent and run in parallel**, or **sent in a new chat**, from the row's `⋯` menu, which also has an **Always send in chat** switch.

The queue collapses to a one-line header, dismisses as a whole, fades its scroll edges once it holds six or more messages, and keeps every action reachable from the keyboard.

It ships as one stylesheet with `mq-*` classes and three thin framework bindings (React, Vue, Svelte) over a shared, framework-free core. There are no runtime dependencies: no Tailwind, no headless UI kit, no drag-and-drop library, no icon package.

## Files

```
message-queue/
├── core.ts                 Logic every framework shares: keyboard map, pointer sorting,
│                           tooltips, popover placement, copy, timings
├── icons.ts                12 stroke icons as raw SVG path data
├── message-queue.css       All styles. Tokens on .mq, mq-* classes, data-* states
├── react/MessageQueue.tsx  React 19
├── vue/MessageQueue.vue    Vue 3.5 (<script setup>, defineModel)
├── svelte/MessageQueue.svelte  Svelte 5 (runes)
├── registry-item.json      shadcn registry entry (React)
├── parity-test.js          Browser script that checks the three ports behave identically
├── README.md               This file
├── BREAKDOWN.md            Anatomy, states, measurements, motion spec
├── GUIDELINES.md           When and how to use it; copy and design guidance
├── RULES.md                Non-negotiables for anyone changing it
└── HANDOFF.md              Notes for the next engineer or AI agent
```

Copy the whole folder. The framework file imports `../core`, `../icons`, and `../message-queue.css`, so keep that layout or update the three import paths. You can delete the framework folders you don't use.

## Requirements

| | Minimum |
| --- | --- |
| React | 19 (uses `inert` as a boolean prop and `flushSync`) |
| Vue | 3.5 (`useId`, `defineModel`) |
| Svelte | 5.20 (`$props.id()`, `flushSync`, class arrays) |
| Browsers | Popover API and `@starting-style`: Chrome/Edge 117+, Safari 17.5+, Firefox 129+ |

The scroll-edge fade uses `animation-timeline: scroll()` and switches itself off where unsupported.

## Usage

### React

```tsx
import { MessageQueue, type QueuedMessage } from "@/components/message-queue/react/MessageQueue";

export function Composer() {
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  return (
    <MessageQueue
      messages={queue}
      onMessagesChange={setQueue}
      onSendNow={(message) => agent.interrupt(message)}
      onSendParallel={(message) => agent.fork(message)}
      onSendNewChat={(message) => chats.create(message)}
    />
  );
}
```

Omit `messages` to let the component own the queue (`defaultMessages` seeds it).

### Vue

```vue
<script setup lang="ts">
import { ref } from "vue";
import MessageQueue from "@/components/message-queue/vue/MessageQueue.vue";
import type { QueuedMessage } from "@/components/message-queue/core";

const queue = ref<QueuedMessage[]>([]);
const alwaysInChat = ref(false);
</script>

<template>
  <MessageQueue
    v-model:messages="queue"
    v-model:always-send-in-chat="alwaysInChat"
    @send-now="agent.interrupt"
    @send-parallel="agent.fork"
    @send-new-chat="chats.create"
  />
</template>
```

Leave out `v-model:messages` and the component keeps its own queue.

### Svelte

```svelte
<script lang="ts">
  import MessageQueue from "$lib/message-queue/svelte/MessageQueue.svelte";
  import type { QueuedMessage } from "$lib/message-queue/core";

  let queue = $state<QueuedMessage[]>([]);
  let alwaysInChat = $state(false);
</script>

<MessageQueue
  bind:messages={queue}
  bind:alwaysSendInChat={alwaysInChat}
  onSendNow={(m) => agent.interrupt(m)}
  onSendParallel={(m) => agent.fork(m)}
  onSendNewChat={(m) => chats.create(m)}
/>
```

### Placement

The component is `width: 100%` and grows upward from the composer. Put it at the bottom of your chat column:

```css
.chat-footer {
  display: flex;
  align-items: flex-end;
  max-width: 40rem;
  margin-inline: auto;
}
```

## Data

```ts
type QueueAttachment = { id: string; name: string; file?: File };
type QueuedMessage = { id: string; text: string; attachments: QueueAttachment[] };
```

`id` must be stable and unique. It keys rows, drives focus, and survives reordering. New messages get `crypto.randomUUID()`.

## API

The same surface in all three frameworks. React and Svelte take callback props (`onSendNow`). Vue emits events (`@send-now`) and uses `v-model` for the two bindable values.

### Values

| React | Vue | Svelte | Type | Default |
| --- | --- | --- | --- | --- |
| `messages` / `defaultMessages` / `onMessagesChange` | `v-model:messages` | `bind:messages` | `QueuedMessage[]` | `[]` |
| `alwaysSendInChat` / `defaultAlwaysSendInChat` / `onAlwaysSendInChatChange` | `v-model:always-send-in-chat` | `bind:alwaysSendInChat` | `boolean` | `false` |
| `placeholder` | `placeholder` | `placeholder` | `string` | `"Ask AI Agent"` |
| `listeningPlaceholder` | `listening-placeholder` | `listeningPlaceholder` | `string` | `"Listening…"` |
| `theme` | `theme` | `theme` | `"system" \| "light" \| "dark"` | `"system"` |
| `className` | `class` (fallthrough) | `class` | `string` | none |

### Events

Each fires once, at the moment of the user's action. The messages array updates after the row's exit animation, about 150ms later.

| React / Svelte | Vue | Payload | When |
| --- | --- | --- | --- |
| `onQueue` | `@queue` | `QueuedMessage` | A new message was added |
| `onUpdate` | `@update` | `QueuedMessage` | An edit was saved |
| `onSendNow` | `@send-now` | `QueuedMessage` | "Send now" |
| `onSendParallel` | `@send-parallel` | `QueuedMessage` | "Send and run in parallel" |
| `onSendNewChat` | `@send-new-chat` | `QueuedMessage` | "Send in a new chat" |
| `onRemove` | `@remove` | `QueuedMessage` | Trash button or ⌘/Ctrl+Backspace |
| `onDismiss` | `@dismiss` | `QueuedMessage[]` | The header X cleared the queue |
| `onReorder` | `@reorder` | `QueuedMessage[]` | A drag or keyboard move was committed |
| `onRecordingChange` | `@recording-change` | `boolean` | The mic toggled |

The component handles the UI only. Sending, recording, and uploads are yours: `file` on an attachment is the raw `File` from the picker.

## Keyboard

| Where | Key | Does |
| --- | --- | --- |
| Composer, empty | ↑ ↓ ← → | Moves into the queue (↑/← last row, ↓/→ first row) |
| Composer, with text | ↑ with caret at the start | Moves into the queue (last row) |
| Composer | Enter / Shift+Enter | Queue the message / new line |
| Composer, editing | Esc | Cancel the edit |
| Queue row | ↑ ↓ Home End | Move between rows; ↓ on the last row returns to the composer |
| Queue row | E | Edit |
| Queue row | ⌘/Ctrl+Backspace or Delete | Remove |
| Queue row | Space | Pick up for reordering |
| Picked-up row | ↑ ↓ Home End | Move it |
| Picked-up row | Space, Enter, Tab | Drop |
| Picked-up row | Esc | Put everything back |
| During a pointer drag | Esc | Cancel the drag |
| Menu | ↑ ↓ Home End, Enter/Space, Esc, Tab | Navigate, choose, close |

The queue is a single tab stop (roving `tabindex`). Tab moves from the row to its actions, then on to the composer.

## Accessibility

- The queue is a `listbox` of `option`s with `aria-roledescription="sortable message"` and a visually hidden hint (`aria-describedby`) that lists the shortcuts.
- Every change is announced in a polite live region: queued, updated, removed, sent, picked up, moved to position N of M, dropped, reorder cancelled.
- Removing a row moves focus to the next row, or the previous one, or the composer. Focus never falls to `<body>`.
- While editing, the other rows are `inert`, so they can't be focused or clicked.
- The menu is a `menu` with `menuitem` and `menuitemcheckbox` items. It returns focus to its trigger on close.
- Tooltips show on hover and keyboard focus only, never on touch, and close on Esc.
- Every icon-only control has an `aria-label`, plus `aria-keyshortcuts` where a shortcut exists.
- With `prefers-reduced-motion`, everything still works, using opacity changes instead of movement.

## Theming

Everything visual is a custom property on `.mq`. Override them on `.mq` or on any ancestor class of your own:

```css
.my-app .mq {
  --mq-surface: #fbfaf7;
  --mq-primary: #2f5bea;
  --mq-primary-hover: #244bd0;
  --mq-radius-composer: 16px;
}
```

Dark mode follows the OS. Force it with `theme="dark"` (which sets `data-theme="dark"`), or put the component under a `.dark` ancestor. `theme="light"` opts out of both.

| Token | Role |
| --- | --- |
| `--mq-surface`, `--mq-shadow` | Panel and composer surface; the shadow is the only edge (no border) |
| `--mq-ink`, `--mq-ink-muted`, `--mq-ink-subtle`, `--mq-placeholder` | Text hierarchy |
| `--mq-fill-hover`, `--mq-fill-editing` | Row hover/focus/active and the row being edited |
| `--mq-control`, `--mq-control-hover`, `--mq-control-ink` | The + button |
| `--mq-chip`, `--mq-chip-ink`, `--mq-chip-remove-hover` | Attachment chips |
| `--mq-primary`, `--mq-primary-hover`, `--mq-on-primary` | Send / mic / stop button |
| `--mq-badge`, `--mq-badge-ink`, `--mq-badge-hover` | "Editing" badge |
| `--mq-layer*`, `--mq-switch*` | Tooltip and menu (inverted against the surface) |
| `--mq-focus` | Focus ring |
| `--mq-radius-*` | panel 18, composer 24, row 8, last row 12, control 6, layer 12 |
| `--mq-ease-*`, `--mq-duration` | Curves and the 150ms base duration |

## CSS class reference

| Class | Element | States |
| --- | --- | --- |
| `.mq` | Root | `data-theme` |
| `.mq-panel` | Queue wrapper (enter motion) | `data-expanded` |
| `.mq-card` | Queue surface | |
| `.mq-header`, `.mq-count`, `.mq-chevron` | Header, "N queued messages" toggle, its chevron | |
| `.mq-icon-button` | 20px icon button (dismiss, edit, remove, more) | `aria-expanded` |
| `.mq-collapse`, `.mq-collapse-inner` | Grid-rows collapse | |
| `.mq-list` | Scrolling listbox, max 160px | `data-masked`, `data-pointer-dragging`, `data-lifted` |
| `.mq-row` | Animated height wrapper | `data-leaving`, `data-locked`, `data-drag-source`, `data-lifted` |
| `.mq-item` | The option itself | `data-editing`, `data-draggable` |
| `.mq-item-label`, `.mq-item-actions`, `.mq-item-status` | Text, action group, "Editing" label | |
| `.mq-send-now` | "Send now" text button | |
| `.mq-composer`, `.mq-field` | Form surface and textarea | |
| `.mq-chips`, `.mq-chip`, `.mq-chip-name`, `.mq-chip-remove` | Attachments | |
| `.mq-footer`, `.mq-footer-start`, `.mq-add`, `.mq-file-input` | Composer footer | |
| `.mq-badge`, `.mq-badge-cancel` | "Editing" badge | |
| `.mq-primary`, `.mq-primary-button`, `.mq-primary-icons`, `.mq-primary-stack`, `.mq-primary-icon` | Send/record slot | `data-hidden`, `data-visible` |
| `.mq-tooltip`, `.mq-kbd` | Shared tooltip and its shortcut hint | `data-side` |
| `.mq-menu`, `.mq-menu-item`, `.mq-menu-separator`, `.mq-switch`, `.mq-switch-thumb` | Row menu | `data-side`, `aria-checked` |
| `.mq-icon`, `.mq-press`, `.mq-focus`, `.mq-sr-only` | Utilities | |

## Licence and credits

Icons are adapted from [Lucide](https://lucide.dev) (ISC) and [Hugeicons free](https://hugeicons.com) (MIT): `split` and `flowSquare` are Hugeicons, and the rest are Lucide.
