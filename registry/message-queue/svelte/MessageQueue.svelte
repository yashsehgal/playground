<script lang="ts">
  import { flushSync, onMount } from "svelte";
  import {
    afterTwoFrames,
    announce,
    autosize,
    createId,
    createPointerSortable,
    createTooltips,
    filesToAttachments,
    focusAtEnd,
    handleMenuKeydown,
    isSpaceKey,
    isUnmodifiedKey,
    LEAVE_FALLBACK_MS,
    moveItem,
    normalizeText,
    placePopover,
    prefersReducedMotion,
    queuedCountLabel,
    queuedLabel,
    REORDER_HINT,
    resolveLiftKey,
    resolveQueueKey,
    revealQueueItem,
    SCROLL_MASK_MIN_MESSAGES,
    type PointerSortable,
    type QueueAttachment,
    type QueuedMessage,
    type Theme,
  } from "../core";
  import { ICONS, type IconName } from "../icons";
  import "../message-queue.css";

  type Props = {
    /** `bind:messages`. Unbound, the component keeps its own queue. */
    messages?: QueuedMessage[];
    /** `bind:alwaysSendInChat`. */
    alwaysSendInChat?: boolean;
    onQueue?: (message: QueuedMessage) => void;
    onUpdate?: (message: QueuedMessage) => void;
    onSendNow?: (message: QueuedMessage) => void;
    onSendParallel?: (message: QueuedMessage) => void;
    onSendNewChat?: (message: QueuedMessage) => void;
    onRemove?: (message: QueuedMessage) => void;
    onDismiss?: (messages: QueuedMessage[]) => void;
    onReorder?: (messages: QueuedMessage[]) => void;
    onRecordingChange?: (recording: boolean) => void;
    placeholder?: string;
    listeningPlaceholder?: string;
    theme?: Theme;
    class?: string;
  };

  let {
    messages = $bindable([]),
    alwaysSendInChat = $bindable(false),
    onQueue,
    onUpdate,
    onSendNow,
    onSendParallel,
    onSendNewChat,
    onRemove,
    onDismiss,
    onReorder,
    onRecordingChange,
    placeholder = "Ask AI Agent",
    listeningPlaceholder = "Listening…",
    theme = "system",
    class: className,
  }: Props = $props();

  const ROW_SELECTOR = '[data-mq-row]:not([data-leaving="true"])';

  const uid = $props.id();
  const fieldId = `${uid}-field`;
  const listId = `${uid}-list`;
  const hintId = `${uid}-hint`;
  const menuId = `${uid}-menu`;

  let rootEl = $state<HTMLDivElement | null>(null);
  let panelEl = $state<HTMLDivElement | null>(null);
  let listEl = $state<HTMLUListElement | null>(null);
  let fieldEl = $state<HTMLTextAreaElement | null>(null);
  let fileEl = $state<HTMLInputElement | null>(null);
  let tooltipEl = $state<HTMLDivElement | null>(null);
  let menuEl = $state<HTMLDivElement | null>(null);
  const itemEls: Record<string, HTMLDivElement | null> = {};

  let menuTrigger: HTMLButtonElement | null = null;
  let menuClosedAt = { id: "", at: 0 };
  let moving = false;
  let sortable: PointerSortable | null = null;

  let draft = $state("");
  let recording = $state(false);
  let recordReady = $state(true);
  let attachments = $state<QueueAttachment[]>([]);
  let editingId = $state<string | null>(null);
  let leavingIds = $state<ReadonlySet<string>>(new Set());
  let activeId = $state<string | null>(null);
  let expanded = $state(true);
  let lifted = $state<{ id: string; origin: QueuedMessage[] } | null>(null);
  let menuFor = $state<string | null>(null);
  let status = $state("");

  const canSend = $derived(normalizeText(draft).length > 0 || attachments.length > 0);
  const queue = $derived(messages.filter((item) => !leavingIds.has(item.id)));
  const canReorder = $derived(queue.length > 1);
  const hasMessages = $derived(messages.length > 0);
  const tabStopId = $derived(
    activeId && queue.some((item) => item.id === activeId) ? activeId : (queue[0]?.id ?? null),
  );
  const masked = $derived(queue.length >= SCROLL_MASK_MIN_MESSAGES);
  const showMic = $derived(!canSend && !recording);
  const showStop = $derived(!canSend && recording);

  function queueItems() {
    return queue
      .map((item) => itemEls[item.id])
      .filter((node): node is HTMLDivElement => Boolean(node));
  }

  function setRecording(next: boolean) {
    if (recording === next) return;
    recording = next;
    onRecordingChange?.(next);
  }

  function focusComposer() {
    focusAtEnd(fieldEl);
  }

  function focusQueueItem(id: string) {
    activeId = id;
    itemEls[id]?.focus({ preventScroll: true });
    revealQueueItem(listEl, queueItems(), queue.findIndex((item) => item.id === id));
  }

  function finishLeaving(id: string) {
    if (leavingIds.has(id)) {
      const next = new Set(leavingIds);
      next.delete(id);
      leavingIds = next;
    }
    messages = messages.filter((item) => item.id !== id);
  }

  function removeMessage(id: string, announcement: string) {
    status = announcement;
    if (editingId === id) {
      editingId = null;
      draft = "";
      attachments = [];
    }
    if (prefersReducedMotion()) {
      messages = messages.filter((item) => item.id !== id);
      return;
    }
    leavingIds = new Set(leavingIds).add(id);
    window.setTimeout(() => finishLeaving(id), LEAVE_FALLBACK_MS);
  }

  function removeAndRefocus(message: QueuedMessage, announcement: string) {
    const index = queue.findIndex((item) => item.id === message.id);
    const nextId = queue[index + 1]?.id ?? queue[index - 1]?.id ?? null;
    flushSync(() => removeMessage(message.id, announcement));
    if (nextId) focusQueueItem(nextId);
    else focusComposer();
  }

  function deleteMessage(message: QueuedMessage) {
    onRemove?.(message);
    removeAndRefocus(message, announce.removed());
  }

  function edit(message: QueuedMessage) {
    editingId = message.id;
    activeId = message.id;
    draft = message.text;
    attachments = message.attachments;
    setRecording(false);
    status = announce.editing();
    requestAnimationFrame(focusComposer);
  }

  function returnFocusAfterEdit(previous: string) {
    if (messages.some((item) => item.id === previous && !leavingIds.has(previous))) {
      requestAnimationFrame(() => focusQueueItem(previous));
    }
  }

  function reorderByIndex(from: number, to: number) {
    const fromId = queue[from]?.id;
    const toId = queue[to]?.id;
    if (!fromId || !toId) return messages;
    const next = moveItem(
      messages,
      messages.findIndex((item) => item.id === fromId),
      messages.findIndex((item) => item.id === toId),
    );
    messages = next;
    return next;
  }

  $effect(() => {
    const list = listEl;
    if (!hasMessages || !list) return;
    const instance = createPointerSortable(list, {
      rowSelector: ROW_SELECTOR,
      ignoreSelector: ".mq-item-actions",
      canStart: (row) => row.dataset.draggable === "true",
      onDrop: (from, to) => {
        let next = messages;
        flushSync(() => {
          next = reorderByIndex(from, to);
        });
        onReorder?.(next);
      },
    });
    sortable = instance;
    return () => {
      instance.destroy();
      sortable = null;
    };
  });

  $effect(() => {
    if (!expanded || queue.length === 0 || editingId || lifted) return;
    function onKeyDown(event: KeyboardEvent) {
      if (sortable?.isActive()) return;
      const action = resolveQueueKey(event, {
        list: listEl,
        panel: panelEl,
        field: fieldEl,
        items: queueItems(),
      });
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      if (action.type === "composer") {
        focusComposer();
        return;
      }
      const message = queue[action.index];
      if (!message) return;
      if (action.type === "focus") focusQueueItem(message.id);
      else if (action.type === "edit") edit(message);
      else deleteMessage(message);
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  });

  $effect(() => {
    void draft;
    autosize(fieldEl);
  });

  $effect(() => {
    if (recordReady) return;
    return afterTwoFrames(() => (recordReady = true));
  });

  onMount(() => {
    const stopTooltips = rootEl && tooltipEl ? createTooltips(rootEl, tooltipEl) : () => {};
    const menu = menuEl;
    function onToggle(event: Event) {
      if ((event as ToggleEvent).newState !== "closed") return;
      menuClosedAt = { id: menuFor ?? "", at: performance.now() };
      const active = document.activeElement;
      if (menuTrigger?.isConnected && (!active || active === document.body || menu?.contains(active))) {
        menuTrigger.focus({ preventScroll: true });
      }
      menuFor = null;
    }
    menu?.addEventListener("toggle", onToggle);
    return () => {
      stopTooltips();
      menu?.removeEventListener("toggle", onToggle);
    };
  });

  function openMenu(message: QueuedMessage, event: MouseEvent) {
    const trigger = event.currentTarget as HTMLButtonElement;
    if (!menuEl) return;
    if (menuClosedAt.id === message.id && performance.now() - menuClosedAt.at < 200) return;
    if (menuEl.matches(":popover-open")) {
      menuEl.hidePopover();
      return;
    }
    menuTrigger = trigger;
    flushSync(() => (menuFor = message.id));
    menuEl.showPopover();
    placePopover(trigger, menuEl, "bottom-end", 6);
    menuEl.querySelector<HTMLElement>('[role^="menuitem"]')?.focus();
  }

  function runMenuAction(action: (message: QueuedMessage) => void) {
    const message = messages.find((item) => item.id === menuFor);
    menuEl?.hidePopover();
    if (message) action(message);
  }

  function toggleAlwaysSendInChat() {
    alwaysSendInChat = !alwaysSendInChat;
    status = announce.alwaysSendInChat(alwaysSendInChat);
  }

  function onItemKeyDown(event: KeyboardEvent, message: QueuedMessage, index: number) {
    if (event.target !== event.currentTarget) return;
    const current = lifted;
    if (current) {
      if (current.id !== message.id) return;
      const action = resolveLiftKey(event, index, queue.length);
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      if (action.type === "move" && action.to !== index) {
        moving = true;
        flushSync(() => reorderByIndex(index, action.to));
        focusQueueItem(message.id);
        moving = false;
        status = announce.moved(action.to + 1, queue.length);
      } else if (action.type === "drop") {
        lifted = null;
        status = announce.dropped(message, index + 1, queue.length);
        onReorder?.(messages);
      } else if (action.type === "cancel") {
        moving = true;
        flushSync(() => {
          messages = current.origin;
          lifted = null;
        });
        focusQueueItem(message.id);
        moving = false;
        status = announce.reorderCancelled(message);
      }
      return;
    }
    if (isSpaceKey(event) && isUnmodifiedKey(event) && canReorder && !editingId) {
      event.preventDefault();
      lifted = { id: message.id, origin: messages };
      status = announce.lifted(message, index + 1, queue.length);
    }
  }

  function onItemBlur(message: QueuedMessage) {
    if (moving || !lifted || lifted.id !== message.id) return;
    lifted = null;
    onReorder?.(messages);
  }

  function onRowTransitionEnd(event: TransitionEvent, id: string) {
    if (event.target !== event.currentTarget || event.propertyName !== "height") return;
    if (leavingIds.has(id)) finishLeaving(id);
  }

  function send() {
    const text = normalizeText(fieldEl?.value ?? draft);
    if (!text && attachments.length === 0) return;
    const wasEditing = editingId !== null;
    if (editingId) {
      const updated = { id: editingId, text, attachments };
      messages = messages.map((item) => (item.id === updated.id ? updated : item));
      onUpdate?.(updated);
      status = announce.updated();
      editingId = null;
      returnFocusAfterEdit(updated.id);
    } else {
      const message: QueuedMessage = { id: createId(), text, attachments };
      messages = [...messages, message];
      onQueue?.(message);
      status = announce.queued(message);
      expanded = true;
    }
    draft = "";
    attachments = [];
    setRecording(false);
    recordReady = false;
    if (!wasEditing) requestAnimationFrame(() => fieldEl?.focus());
  }

  function cancelEdit() {
    const previous = editingId;
    editingId = null;
    draft = "";
    attachments = [];
    status = announce.cancelledEdit();
    if (previous) returnFocusAfterEdit(previous);
  }

  function dismissQueue() {
    onDismiss?.(queue);
    status = announce.dismissed();
    editingId = null;
    lifted = null;
    leavingIds = new Set();
    messages = [];
    focusComposer();
  }

  function onFieldInput(event: Event & { currentTarget: HTMLTextAreaElement }) {
    draft = event.currentTarget.value;
    if (draft.trim()) setRecording(false);
  }

  function onFieldKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && editingId) {
      event.preventDefault();
      cancelEdit();
      return;
    }
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    send();
  }

  function onSubmit(event: SubmitEvent) {
    event.preventDefault();
    send();
  }

  function onFilesChosen(event: Event & { currentTarget: HTMLInputElement }) {
    const added = filesToAttachments(event.currentTarget.files);
    if (added.length) attachments = [...attachments, ...added];
    event.currentTarget.value = "";
  }
</script>

{#snippet icon(name: IconName, stroke: number = 2, extra: string = "", visible?: boolean)}
  <svg
    class={["mq-icon", extra]}
    viewBox="0 0 24 24"
    stroke-width={stroke}
    data-visible={visible}
    aria-hidden="true"
    focusable="false"
  >
    {#each ICONS[name] as d (d)}
      <path {d} />
    {/each}
  </svg>
{/snippet}

<div bind:this={rootEl} class={["mq", className]} data-theme={theme === "system" ? undefined : theme}>
  <p class="mq-sr-only" role="status" aria-live="polite">{status}</p>

  {#if hasMessages}
    <div bind:this={panelEl} class="mq-panel" data-expanded={expanded}>
      <div class="mq-card">
        <div class="mq-header">
          <button
            type="button"
            class="mq-count mq-focus"
            aria-expanded={expanded}
            aria-controls={listId}
            onclick={() => (expanded = !expanded)}
          >
            <span>{queuedCountLabel(queue.length)}</span>
            {@render icon("chevronDown", 1.5, "mq-chevron")}
          </button>
          <button
            type="button"
            class="mq-icon-button mq-press mq-focus"
            aria-label="Dismiss queue"
            data-tooltip="Dismiss queue"
            onclick={dismissQueue}
          >
            {@render icon("x", 1.5)}
          </button>
        </div>

        <div class="mq-collapse" inert={!expanded}>
          <div class="mq-collapse-inner">
            <p id={hintId} class="mq-sr-only">{REORDER_HINT}</p>
            <ul
              id={listId}
              bind:this={listEl}
              class="mq-list"
              role="listbox"
              aria-label="Queued messages"
              aria-orientation="vertical"
              data-masked={masked}
              data-lifted={lifted ? true : undefined}
            >
              {#each messages as message (message.id)}
                {@const index = queue.findIndex((item) => item.id === message.id)}
                {@const isEditing = message.id === editingId}
                {@const isLocked = editingId !== null && !isEditing}
                {@const isLeaving = leavingIds.has(message.id)}
                {@const isTabStop = message.id === tabStopId}
                {@const draggable = canReorder && !isEditing && !isLocked && !isLeaving}
                {@const label = queuedLabel(message)}
                {@const tab = isTabStop ? 0 : -1}
                <li
                  class="mq-row"
                  role="presentation"
                  data-mq-row=""
                  data-leaving={isLeaving || undefined}
                  data-locked={isLocked || undefined}
                  data-draggable={draggable}
                  data-lifted={lifted?.id === message.id || undefined}
                  inert={isLocked}
                  ontransitionend={(event) => onRowTransitionEnd(event, message.id)}
                >
                  <div
                    bind:this={itemEls[message.id]}
                    class="mq-item"
                    role="option"
                    aria-selected={isTabStop}
                    aria-current={isEditing || undefined}
                    aria-label={isEditing ? `Editing ${label}` : label}
                    aria-describedby={draggable ? hintId : undefined}
                    aria-roledescription={draggable ? "sortable message" : undefined}
                    tabindex={isTabStop && !isLeaving ? 0 : -1}
                    data-editing={isEditing || undefined}
                    data-draggable={draggable}
                    onfocus={() => (activeId = message.id)}
                    onblur={() => onItemBlur(message)}
                    onpointerenter={(event) => {
                      if (event.pointerType !== "touch") activeId = message.id;
                    }}
                    onkeydown={(event) => onItemKeyDown(event, message, index)}
                  >
                    <p class="mq-item-label">{label}</p>
                    <div class="mq-item-actions">
                      {#if isEditing}
                        <span class="mq-item-status">Editing</span>
                      {:else}
                        <button
                          type="button"
                          class="mq-send-now mq-press mq-focus"
                          tabindex={tab}
                          onclick={() => {
                            onSendNow?.(message);
                            removeAndRefocus(message, announce.sent(message));
                          }}
                        >
                          {@render icon("cornerDownRight")}
                          Send now
                        </button>
                        <button
                          type="button"
                          class="mq-icon-button mq-press mq-focus"
                          tabindex={tab}
                          aria-label="Edit queued message"
                          aria-keyshortcuts="E"
                          data-tooltip="Edit queued message"
                          data-tooltip-kbd="E"
                          onclick={() => edit(message)}
                        >
                          {@render icon("pencil")}
                        </button>
                        <button
                          type="button"
                          class="mq-icon-button mq-press mq-focus"
                          tabindex={tab}
                          aria-label="Remove queued message"
                          aria-keyshortcuts="Meta+Backspace Control+Backspace"
                          data-tooltip="Remove queued message"
                          data-tooltip-kbd="⌘⌫"
                          onclick={() => deleteMessage(message)}
                        >
                          {@render icon("trash")}
                        </button>
                        <button
                          type="button"
                          class="mq-icon-button mq-press mq-focus"
                          tabindex={tab}
                          aria-label="More options"
                          aria-haspopup="menu"
                          aria-expanded={menuFor === message.id}
                          aria-controls={menuFor === message.id ? menuId : undefined}
                          onclick={(event) => openMenu(message, event)}
                        >
                          {@render icon("ellipsis")}
                        </button>
                      {/if}
                    </div>
                  </div>
                </li>
              {/each}
            </ul>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <form class="mq-composer" onsubmit={onSubmit}>
    <label for={fieldId} class="mq-sr-only">Message</label>
    <textarea
      id={fieldId}
      bind:this={fieldEl}
      class="mq-field"
      rows="1"
      value={draft}
      placeholder={recording ? listeningPlaceholder : placeholder}
      oninput={onFieldInput}
      onkeydown={onFieldKeyDown}
    ></textarea>
    {#if attachments.length > 0}
      <div class="mq-chips">
        {#each attachments as file (file.id)}
          <span class="mq-chip">
            <span class="mq-chip-name">{file.name}</span>
            <button
              type="button"
              class="mq-chip-remove mq-focus"
              aria-label={`Remove ${file.name}`}
              onclick={() => (attachments = attachments.filter((item) => item.id !== file.id))}
            >
              {@render icon("x", 1.5)}
            </button>
          </span>
        {/each}
      </div>
    {/if}
    <div class="mq-footer">
      <input
        bind:this={fileEl}
        class="mq-file-input"
        type="file"
        multiple
        tabindex="-1"
        aria-hidden="true"
        onchange={onFilesChosen}
      />
      <div class="mq-footer-start">
        <button
          type="button"
          class="mq-add mq-press mq-focus"
          aria-label="Add attachment"
          onclick={() => fileEl?.click()}
        >
          {@render icon("plus", 1.5)}
        </button>
        {#if editingId}
          <span class="mq-badge">
            Editing
            <button
              type="button"
              class="mq-badge-cancel mq-press mq-focus"
              aria-label="Cancel editing"
              aria-keyshortcuts="Escape"
              data-tooltip="Cancel editing"
              data-tooltip-kbd="Esc"
              onclick={cancelEdit}
            >
              {@render icon("x")}
            </button>
          </span>
        {/if}
      </div>
      <div class="mq-primary">
        <button
          type="submit"
          class="mq-primary-button mq-press mq-focus"
          aria-label="Send message"
          tabindex={canSend ? 0 : -1}
          aria-hidden={canSend ? undefined : true}
          data-hidden={!canSend}
        ></button>
        <button
          type="button"
          class="mq-primary-button mq-press mq-focus"
          aria-label={recording ? "Stop recording" : "Record voice"}
          aria-pressed={recording}
          disabled={!recordReady}
          tabindex={canSend ? -1 : 0}
          aria-hidden={canSend ? true : undefined}
          data-hidden={canSend}
          onclick={() => setRecording(!recording)}
        ></button>
        <span class="mq-primary-icons">
          <span class="mq-primary-stack">
            {@render icon("mic", 1.5, "mq-primary-icon", showMic)}
            {@render icon("square", 1.5, "mq-primary-icon", showStop)}
            {@render icon("arrowUp", 1.5, "mq-primary-icon", canSend)}
          </span>
        </span>
      </div>
    </div>
  </form>

  <div
    id={menuId}
    bind:this={menuEl}
    class="mq-menu"
    popover="auto"
    role="menu"
    tabindex="-1"
    aria-label="More options"
    onkeydown={(event) => {
      if (menuEl) handleMenuKeydown(event, menuEl);
    }}
  >
    <button
      type="button"
      role="menuitem"
      tabindex="-1"
      class="mq-menu-item"
      onclick={() =>
        runMenuAction((message) => {
          onSendParallel?.(message);
          removeAndRefocus(message, announce.sentParallel(message));
        })}
    >
      {@render icon("flowSquare", 1.75)}
      Send and run in parallel
    </button>
    <button
      type="button"
      role="menuitem"
      tabindex="-1"
      class="mq-menu-item"
      onclick={() =>
        runMenuAction((message) => {
          onSendNewChat?.(message);
          removeAndRefocus(message, announce.sentNewChat(message));
        })}
    >
      {@render icon("split", 1.75)}
      Send in a new chat
    </button>
    <hr class="mq-menu-separator" />
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={alwaysSendInChat}
      tabindex="-1"
      class="mq-menu-item"
      onclick={toggleAlwaysSendInChat}
    >
      Always send in chat
      <span class="mq-switch" aria-hidden="true">
        <span class="mq-switch-thumb"></span>
      </span>
    </button>
  </div>

  <div bind:this={tooltipEl} class="mq-tooltip" popover="manual" role="tooltip"></div>
</div>
