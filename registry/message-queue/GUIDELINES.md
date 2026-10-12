# Message Queue: guidelines

How to use the component well. These are judgement calls; `RULES.md` holds the non-negotiables.

## When to use it

Use it when an agent can be **busy for longer than a user is willing to wait to type**: multi-step tool runs, research, code generation, or anything that streams for more than a few seconds.

Don't use it:

- For instant, single-turn chat. The queue would only ever hold one message for a split second.
- As a to-do list or saved-prompts library. The queue is temporary by design, and the X clears it.
- When follow-ups can't be meaningfully reordered or edited, for example in a strictly linear form wizard.

## Wiring it to an agent

The component never sends anything itself. A typical integration:

1. While the agent is **idle**, send on submit and don't use the queue. Either render a plain composer, or take the message out of `messages` again in `onQueue`.
2. While the agent is **busy**, let submits queue up. When the run finishes, take `messages[0]`, send it, and remove it from `messages`.
3. Map the row actions:
   - **Send now**: interrupt or steer the current run with this message.
   - **Send and run in parallel**: start a second run in the same chat.
   - **Send in a new chat**: open a new thread seeded with this message.
4. Persist **Always send in chat** as a user preference. When it's on, your auto-send should keep everything in the current chat instead of offering to branch.

Keep `messages` as your single source of truth (controlled mode) once real sending is involved. Uncontrolled mode is meant for demos.

## Copy

The defaults are short, sentence case, and verb-first. If you localise or rename:

- Keep **row actions as verbs**: "Send now", not "Immediate".
- Keep the **count as a sentence**: "3 queued messages", "1 queued message". Don't use "Queue (3)".
- Keep **menu items parallel**: both start with "Send …".
- **Announcements** describe what happened and where: "Moved to position 2 of 3", "Sent in a new chat: …". Every string lives in `announce` in `core.ts`; translate them there, once, for all three frameworks.
- **Placeholder**: name the assistant if you can ("Ask Ada"); otherwise use "Ask AI Agent". Avoid "Type a message…", which says nothing.

## Layout

- Anchor it to the **bottom** of the chat column. The queue grows upward, toward the conversation it belongs to.
- Width: **32–48rem** reads best. Below about 22rem, rows lose most of their text to the four actions. Consider hiding "Send now" behind the menu if you need to go narrower.
- Leave **at least 160px** of headroom above the composer so a full queue never covers the latest assistant message. If space is tight, collapse the queue by default.
- Don't add a border around the queue or composer. The shadow is the edge. A border plus a shadow doubles the outline and looks heavy.

## Theming

- Change tokens, not selectors. Every colour is a `--mq-*` variable. If you find yourself writing `.mq-item:hover { … }`, check whether a token already covers it.
- **Dark surfaces should share the page's hue.** If your dark page is cool blue-grey, move `--mq-surface` and `--mq-on-primary` to that hue too. Fills are translucent white, so they follow automatically.
- Keep the badge **warm and distinct** from the primary colour. It marks a mode ("you are editing"), not an action.
- Keep row text at **13px** and actions at **12px**. Sizing the label up makes the whole panel feel like content rather than a control strip.

## Motion

- The motion is fast and quiet (150ms). Don't lengthen it. A queue is a tool the user touches many times per session, and slow motion becomes friction.
- Don't add stagger to rows. They enter one at a time anyway, and a stagger on first render feels like loading.
- If you add new elements, give them an enter state with `@starting-style` and a reduced-motion fallback, as the existing ones have.

## Accessibility checklist for integrators

- [ ] There's only one `MessageQueue` per page, or each sits in its own labelled region. The tooltip and menu are per instance, but two live regions announcing at once is confusing.
- [ ] Your send logic announces its own outcome (for example "Response ready") in your app's live region. The component only announces queue changes.
- [ ] If you hide the component while the agent is idle, move focus to your plain composer, so it doesn't fall to `<body>`.
- [ ] Every custom placeholder still makes sense when read aloud on its own.
- [ ] Text contrast still passes 4.5:1 after any theme overrides, including `--mq-ink-muted` on `--mq-surface`.
