<script setup lang="ts">
import {
  computed,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
  watchEffect,
  type FunctionalComponent,
} from "vue";
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
  type QueueAttachment,
  type QueuedMessage,
  type Theme,
} from "../core";
import { ICONS, type IconName } from "../icons";
import "../message-queue.css";

const props = withDefaults(
  defineProps<{
    placeholder?: string;
    listeningPlaceholder?: string;
    theme?: Theme;
  }>(),
  {
    placeholder: "Ask AI Agent",
    listeningPlaceholder: "Listening…",
    theme: "system",
  },
);

/** `v-model:messages`. Unbound, the component keeps its own queue. */
const messages = defineModel<QueuedMessage[]>("messages", { default: () => [] });
/** `v-model:always-send-in-chat`. */
const alwaysSendInChat = defineModel<boolean>("alwaysSendInChat", { default: false });

const emit = defineEmits<{
  queue: [message: QueuedMessage];
  update: [message: QueuedMessage];
  sendNow: [message: QueuedMessage];
  sendParallel: [message: QueuedMessage];
  sendNewChat: [message: QueuedMessage];
  remove: [message: QueuedMessage];
  dismiss: [messages: QueuedMessage[]];
  reorder: [messages: QueuedMessage[]];
  recordingChange: [recording: boolean];
}>();

const Icon: FunctionalComponent<{
  name: IconName;
  stroke?: number;
  visible?: boolean;
}> = (p) =>
  h(
    "svg",
    {
      class: "mq-icon",
      viewBox: "0 0 24 24",
      "stroke-width": p.stroke ?? 2,
      "data-visible": p.visible,
      "aria-hidden": "true",
      focusable: "false",
    },
    ICONS[p.name].map((d) => h("path", { key: d, d })),
  );
Icon.props = ["name", "stroke", "visible"];

const ROW_SELECTOR = '[data-mq-row]:not([data-leaving="true"])';

const fieldId = useId();
const listId = useId();
const hintId = useId();
const menuId = useId();

const rootEl = ref<HTMLDivElement | null>(null);
const panelEl = ref<HTMLDivElement | null>(null);
const listEl = ref<HTMLUListElement | null>(null);
const fieldEl = ref<HTMLTextAreaElement | null>(null);
const fileEl = ref<HTMLInputElement | null>(null);
const tooltipEl = ref<HTMLDivElement | null>(null);
const menuEl = ref<HTMLDivElement | null>(null);
const itemEls = new Map<string, HTMLDivElement>();

let menuTrigger: HTMLButtonElement | null = null;
let menuClosedAt = { id: "", at: 0 };
let moving = false;
let sortable: ReturnType<typeof createPointerSortable> | null = null;

const draft = ref("");
const recording = ref(false);
const recordReady = ref(true);
const attachments = ref<QueueAttachment[]>([]);
const editingId = ref<string | null>(null);
const leavingIds = ref<ReadonlySet<string>>(new Set());
const activeId = ref<string | null>(null);
const expanded = ref(true);
const lifted = ref<{ id: string; origin: QueuedMessage[] } | null>(null);
const menuFor = ref<string | null>(null);
const status = ref("");

const canSend = computed(() => normalizeText(draft.value).length > 0 || attachments.value.length > 0);
const queue = computed(() => messages.value.filter((item) => !leavingIds.value.has(item.id)));
const canReorder = computed(() => queue.value.length > 1);
const hasMessages = computed(() => messages.value.length > 0);
const tabStopId = computed(() =>
  activeId.value && queue.value.some((item) => item.id === activeId.value)
    ? activeId.value
    : (queue.value[0]?.id ?? null),
);
const masked = computed(() => queue.value.length >= SCROLL_MASK_MIN_MESSAGES);
const showMic = computed(() => !canSend.value && !recording.value);
const showStop = computed(() => !canSend.value && recording.value);

const rows = computed(() =>
  messages.value.map((message) => {
    const isEditing = message.id === editingId.value;
    const isLocked = editingId.value !== null && !isEditing;
    const isLeaving = leavingIds.value.has(message.id);
    const isTabStop = message.id === tabStopId.value;
    const label = queuedLabel(message);
    return {
      message,
      index: queue.value.findIndex((item) => item.id === message.id),
      label,
      isEditing,
      isLocked,
      isLeaving,
      isTabStop,
      draggable: canReorder.value && !isEditing && !isLocked && !isLeaving,
    };
  }),
);

function setItemEl(id: string, el: unknown) {
  if (el) itemEls.set(id, el as HTMLDivElement);
  else itemEls.delete(id);
}

function queueItems() {
  return queue.value
    .map((item) => itemEls.get(item.id))
    .filter((node): node is HTMLDivElement => Boolean(node));
}

function setRecording(next: boolean) {
  if (recording.value === next) return;
  recording.value = next;
  emit("recordingChange", next);
}

function focusComposer() {
  focusAtEnd(fieldEl.value);
}

function focusQueueItem(id: string) {
  activeId.value = id;
  itemEls.get(id)?.focus({ preventScroll: true });
  revealQueueItem(listEl.value, queueItems(), queue.value.findIndex((item) => item.id === id));
}

function finishLeaving(id: string) {
  if (leavingIds.value.has(id)) {
    const next = new Set(leavingIds.value);
    next.delete(id);
    leavingIds.value = next;
  }
  messages.value = messages.value.filter((item) => item.id !== id);
}

function removeMessage(id: string, announcement: string) {
  status.value = announcement;
  if (editingId.value === id) {
    editingId.value = null;
    draft.value = "";
    attachments.value = [];
  }
  if (prefersReducedMotion()) {
    messages.value = messages.value.filter((item) => item.id !== id);
    return;
  }
  leavingIds.value = new Set(leavingIds.value).add(id);
  window.setTimeout(() => finishLeaving(id), LEAVE_FALLBACK_MS);
}

function removeAndRefocus(message: QueuedMessage, announcement: string) {
  const items = queue.value;
  const index = items.findIndex((item) => item.id === message.id);
  const nextId = items[index + 1]?.id ?? items[index - 1]?.id ?? null;
  removeMessage(message.id, announcement);
  nextTick(() => {
    if (nextId) focusQueueItem(nextId);
    else focusComposer();
  });
}

function deleteMessage(message: QueuedMessage) {
  emit("remove", message);
  removeAndRefocus(message, announce.removed());
}

function edit(message: QueuedMessage) {
  editingId.value = message.id;
  activeId.value = message.id;
  draft.value = message.text;
  attachments.value = message.attachments;
  setRecording(false);
  status.value = announce.editing();
  requestAnimationFrame(focusComposer);
}

watch(editingId, (current, previous) => {
  if (!previous || current) return;
  if (messages.value.some((item) => item.id === previous && !leavingIds.value.has(previous))) {
    requestAnimationFrame(() => focusQueueItem(previous));
  }
});

function reorderByIndex(from: number, to: number) {
  const fromId = queue.value[from]?.id;
  const toId = queue.value[to]?.id;
  if (!fromId || !toId) return messages.value;
  const all = messages.value;
  const next = moveItem(
    all,
    all.findIndex((item) => item.id === fromId),
    all.findIndex((item) => item.id === toId),
  );
  messages.value = next;
  return next;
}

watch(
  [hasMessages, listEl],
  ([present, list], _previous, onCleanup) => {
    if (!present || !list) return;
    const instance = createPointerSortable(list, {
      rowSelector: ROW_SELECTOR,
      ignoreSelector: ".mq-item-actions",
      canStart: (row) => row.dataset.draggable === "true",
      onDrop: async (from, to) => {
        const next = reorderByIndex(from, to);
        await nextTick();
        emit("reorder", next);
      },
    });
    sortable = instance;
    onCleanup(() => {
      instance.destroy();
      sortable = null;
    });
  },
  { flush: "post", immediate: true },
);

watchEffect((onCleanup) => {
  if (!expanded.value || queue.value.length === 0 || editingId.value || lifted.value) return;
  function onKeyDown(event: KeyboardEvent) {
    if (sortable?.isActive()) return;
    const action = resolveQueueKey(event, {
      list: listEl.value,
      panel: panelEl.value,
      field: fieldEl.value,
      items: queueItems(),
    });
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    if (action.type === "composer") {
      focusComposer();
      return;
    }
    const message = queue.value[action.index];
    if (!message) return;
    if (action.type === "focus") focusQueueItem(message.id);
    else if (action.type === "edit") edit(message);
    else deleteMessage(message);
  }
  window.addEventListener("keydown", onKeyDown, true);
  onCleanup(() => window.removeEventListener("keydown", onKeyDown, true));
});

watch(draft, () => autosize(fieldEl.value), { flush: "post" });

watch(recordReady, (ready, _previous, onCleanup) => {
  if (!ready) onCleanup(afterTwoFrames(() => (recordReady.value = true)));
});

function onMenuToggle(event: Event) {
  if ((event as ToggleEvent).newState !== "closed") return;
  menuClosedAt = { id: menuFor.value ?? "", at: performance.now() };
  const active = document.activeElement;
  if (
    menuTrigger?.isConnected &&
    (!active || active === document.body || menuEl.value?.contains(active))
  ) {
    menuTrigger.focus({ preventScroll: true });
  }
  menuFor.value = null;
}

let stopTooltips: (() => void) | null = null;
onMounted(() => {
  autosize(fieldEl.value);
  if (rootEl.value && tooltipEl.value) stopTooltips = createTooltips(rootEl.value, tooltipEl.value);
  menuEl.value?.addEventListener("toggle", onMenuToggle);
});
onBeforeUnmount(() => {
  stopTooltips?.();
  menuEl.value?.removeEventListener("toggle", onMenuToggle);
});

async function openMenu(message: QueuedMessage, event: MouseEvent) {
  const menu = menuEl.value;
  const trigger = event.currentTarget as HTMLButtonElement;
  if (!menu) return;
  if (menuClosedAt.id === message.id && performance.now() - menuClosedAt.at < 200) return;
  if (menu.matches(":popover-open")) {
    menu.hidePopover();
    return;
  }
  menuTrigger = trigger;
  menuFor.value = message.id;
  await nextTick();
  menu.showPopover();
  placePopover(trigger, menu, "bottom-end", 6);
  menu.querySelector<HTMLElement>('[role^="menuitem"]')?.focus();
}

function runMenuAction(action: (message: QueuedMessage) => void) {
  const message = messages.value.find((item) => item.id === menuFor.value);
  menuEl.value?.hidePopover();
  if (message) action(message);
}

function onMenuKeydown(event: KeyboardEvent) {
  if (menuEl.value) handleMenuKeydown(event, menuEl.value);
}

function sendParallel() {
  runMenuAction((message) => {
    emit("sendParallel", message);
    removeAndRefocus(message, announce.sentParallel(message));
  });
}

function sendNewChat() {
  runMenuAction((message) => {
    emit("sendNewChat", message);
    removeAndRefocus(message, announce.sentNewChat(message));
  });
}

function toggleAlwaysSendInChat() {
  const next = !alwaysSendInChat.value;
  alwaysSendInChat.value = next;
  status.value = announce.alwaysSendInChat(next);
}

function sendNow(message: QueuedMessage) {
  emit("sendNow", message);
  removeAndRefocus(message, announce.sent(message));
}

async function onItemKeyDown(event: KeyboardEvent, message: QueuedMessage, index: number) {
  if (event.target !== event.currentTarget) return;
  const current = lifted.value;
  if (current) {
    if (current.id !== message.id) return;
    const action = resolveLiftKey(event, index, queue.value.length);
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    if (action.type === "move" && action.to !== index) {
      moving = true;
      reorderByIndex(index, action.to);
      await nextTick();
      focusQueueItem(message.id);
      moving = false;
      status.value = announce.moved(action.to + 1, queue.value.length);
    } else if (action.type === "drop") {
      lifted.value = null;
      status.value = announce.dropped(message, index + 1, queue.value.length);
      emit("reorder", messages.value);
    } else if (action.type === "cancel") {
      moving = true;
      messages.value = current.origin;
      lifted.value = null;
      await nextTick();
      focusQueueItem(message.id);
      moving = false;
      status.value = announce.reorderCancelled(message);
    }
    return;
  }
  if (isSpaceKey(event) && isUnmodifiedKey(event) && canReorder.value && !editingId.value) {
    event.preventDefault();
    lifted.value = { id: message.id, origin: messages.value };
    status.value = announce.lifted(message, index + 1, queue.value.length);
  }
}

function onItemBlur(message: QueuedMessage) {
  if (moving || !lifted.value || lifted.value.id !== message.id) return;
  lifted.value = null;
  emit("reorder", messages.value);
}

function onItemPointerEnter(event: PointerEvent, id: string) {
  if (event.pointerType !== "touch") activeId.value = id;
}

function onRowTransitionEnd(event: TransitionEvent, id: string) {
  if (event.target !== event.currentTarget || event.propertyName !== "height") return;
  if (leavingIds.value.has(id)) finishLeaving(id);
}

function send() {
  const text = normalizeText(fieldEl.value?.value ?? draft.value);
  if (!text && attachments.value.length === 0) return;
  const wasEditing = editingId.value !== null;
  if (editingId.value) {
    const updated = { id: editingId.value, text, attachments: attachments.value };
    messages.value = messages.value.map((item) => (item.id === updated.id ? updated : item));
    emit("update", updated);
    status.value = announce.updated();
    editingId.value = null;
  } else {
    const message: QueuedMessage = { id: createId(), text, attachments: attachments.value };
    messages.value = [...messages.value, message];
    emit("queue", message);
    status.value = announce.queued(message);
    expanded.value = true;
  }
  draft.value = "";
  attachments.value = [];
  setRecording(false);
  recordReady.value = false;
  if (!wasEditing) requestAnimationFrame(() => fieldEl.value?.focus());
}

function cancelEdit() {
  editingId.value = null;
  draft.value = "";
  attachments.value = [];
  status.value = announce.cancelledEdit();
}

function dismissQueue() {
  emit("dismiss", queue.value);
  status.value = announce.dismissed();
  editingId.value = null;
  lifted.value = null;
  leavingIds.value = new Set();
  messages.value = [];
  focusComposer();
}

function onFieldInput(event: Event) {
  const value = (event.target as HTMLTextAreaElement).value;
  draft.value = value;
  if (value.trim()) setRecording(false);
}

function onFieldKeyDown(event: KeyboardEvent) {
  if (event.key === "Escape" && editingId.value) {
    event.preventDefault();
    cancelEdit();
    return;
  }
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  send();
}

function onFilesChosen(event: Event) {
  const input = event.target as HTMLInputElement;
  const added = filesToAttachments(input.files);
  if (added.length) attachments.value = [...attachments.value, ...added];
  input.value = "";
}

function removeAttachment(id: string) {
  attachments.value = attachments.value.filter((item) => item.id !== id);
}
</script>

<template>
  <div ref="rootEl" class="mq" :data-theme="props.theme === 'system' ? undefined : props.theme">
    <p class="mq-sr-only" role="status" aria-live="polite">{{ status }}</p>

    <div v-if="hasMessages" ref="panelEl" class="mq-panel" :data-expanded="expanded">
      <div class="mq-card">
        <div class="mq-header">
          <button
            type="button"
            class="mq-count mq-focus"
            :aria-expanded="expanded"
            :aria-controls="listId"
            @click="expanded = !expanded"
          >
            <span>{{ queuedCountLabel(queue.length) }}</span>
            <Icon name="chevronDown" :stroke="1.5" class="mq-chevron" />
          </button>
          <button
            type="button"
            class="mq-icon-button mq-press mq-focus"
            aria-label="Dismiss queue"
            data-tooltip="Dismiss queue"
            @click="dismissQueue"
          >
            <Icon name="x" :stroke="1.5" />
          </button>
        </div>

        <div class="mq-collapse" :inert="!expanded || undefined">
          <div class="mq-collapse-inner">
            <p :id="hintId" class="mq-sr-only">{{ REORDER_HINT }}</p>
            <ul
              :id="listId"
              ref="listEl"
              class="mq-list"
              role="listbox"
              aria-label="Queued messages"
              aria-orientation="vertical"
              :data-masked="masked"
              :data-lifted="lifted ? true : undefined"
            >
              <li
                v-for="row in rows"
                :key="row.message.id"
                class="mq-row"
                role="presentation"
                data-mq-row=""
                :data-leaving="row.isLeaving || undefined"
                :data-locked="row.isLocked || undefined"
                :data-draggable="row.draggable"
                :data-lifted="lifted?.id === row.message.id || undefined"
                :inert="row.isLocked || undefined"
                @transitionend="onRowTransitionEnd($event, row.message.id)"
              >
                <div
                  :ref="(el) => setItemEl(row.message.id, el)"
                  class="mq-item"
                  role="option"
                  :aria-selected="row.isTabStop"
                  :aria-current="row.isEditing || undefined"
                  :aria-label="row.isEditing ? `Editing ${row.label}` : row.label"
                  :aria-describedby="row.draggable ? hintId : undefined"
                  :aria-roledescription="row.draggable ? 'sortable message' : undefined"
                  :tabindex="row.isTabStop && !row.isLeaving ? 0 : -1"
                  :data-editing="row.isEditing || undefined"
                  :data-draggable="row.draggable"
                  @focus="activeId = row.message.id"
                  @blur="onItemBlur(row.message)"
                  @pointerenter="onItemPointerEnter($event, row.message.id)"
                  @keydown="onItemKeyDown($event, row.message, row.index)"
                >
                  <p class="mq-item-label">{{ row.label }}</p>
                  <div class="mq-item-actions">
                    <span v-if="row.isEditing" class="mq-item-status">Editing</span>
                    <template v-else>
                      <button
                        type="button"
                        class="mq-send-now mq-press mq-focus"
                        :tabindex="row.isTabStop ? 0 : -1"
                        @click="sendNow(row.message)"
                      >
                        <Icon name="cornerDownRight" />
                        Send now
                      </button>
                      <button
                        type="button"
                        class="mq-icon-button mq-press mq-focus"
                        :tabindex="row.isTabStop ? 0 : -1"
                        aria-label="Edit queued message"
                        aria-keyshortcuts="E"
                        data-tooltip="Edit queued message"
                        data-tooltip-kbd="E"
                        @click="edit(row.message)"
                      >
                        <Icon name="pencil" />
                      </button>
                      <button
                        type="button"
                        class="mq-icon-button mq-press mq-focus"
                        :tabindex="row.isTabStop ? 0 : -1"
                        aria-label="Remove queued message"
                        aria-keyshortcuts="Meta+Backspace Control+Backspace"
                        data-tooltip="Remove queued message"
                        data-tooltip-kbd="⌘⌫"
                        @click="deleteMessage(row.message)"
                      >
                        <Icon name="trash" />
                      </button>
                      <button
                        type="button"
                        class="mq-icon-button mq-press mq-focus"
                        :tabindex="row.isTabStop ? 0 : -1"
                        aria-label="More options"
                        aria-haspopup="menu"
                        :aria-expanded="menuFor === row.message.id"
                        :aria-controls="menuFor === row.message.id ? menuId : undefined"
                        @click="openMenu(row.message, $event)"
                      >
                        <Icon name="ellipsis" />
                      </button>
                    </template>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <form class="mq-composer" @submit.prevent="send">
      <label :for="fieldId" class="mq-sr-only">Message</label>
      <textarea
        :id="fieldId"
        ref="fieldEl"
        class="mq-field"
        rows="1"
        :value="draft"
        :placeholder="recording ? props.listeningPlaceholder : props.placeholder"
        @input="onFieldInput"
        @keydown="onFieldKeyDown"
      />
      <div v-if="attachments.length > 0" class="mq-chips">
        <span v-for="file in attachments" :key="file.id" class="mq-chip">
          <span class="mq-chip-name">{{ file.name }}</span>
          <button
            type="button"
            class="mq-chip-remove mq-focus"
            :aria-label="`Remove ${file.name}`"
            @click="removeAttachment(file.id)"
          >
            <Icon name="x" :stroke="1.5" />
          </button>
        </span>
      </div>
      <div class="mq-footer">
        <input
          ref="fileEl"
          class="mq-file-input"
          type="file"
          multiple
          tabindex="-1"
          aria-hidden="true"
          @change="onFilesChosen"
        />
        <div class="mq-footer-start">
          <button
            type="button"
            class="mq-add mq-press mq-focus"
            aria-label="Add attachment"
            @click="fileEl?.click()"
          >
            <Icon name="plus" :stroke="1.5" />
          </button>
          <span v-if="editingId" class="mq-badge">
            Editing
            <button
              type="button"
              class="mq-badge-cancel mq-press mq-focus"
              aria-label="Cancel editing"
              aria-keyshortcuts="Escape"
              data-tooltip="Cancel editing"
              data-tooltip-kbd="Esc"
              @click="cancelEdit"
            >
              <Icon name="x" />
            </button>
          </span>
        </div>
        <div class="mq-primary">
          <button
            type="submit"
            class="mq-primary-button mq-press mq-focus"
            aria-label="Send message"
            :tabindex="canSend ? 0 : -1"
            :aria-hidden="canSend ? undefined : true"
            :data-hidden="!canSend"
          />
          <button
            type="button"
            class="mq-primary-button mq-press mq-focus"
            :aria-label="recording ? 'Stop recording' : 'Record voice'"
            :aria-pressed="recording"
            :disabled="!recordReady"
            :tabindex="canSend ? -1 : 0"
            :aria-hidden="canSend ? true : undefined"
            :data-hidden="canSend"
            @click="setRecording(!recording)"
          />
          <span class="mq-primary-icons">
            <span class="mq-primary-stack">
              <Icon name="mic" :stroke="1.5" class="mq-primary-icon" :visible="showMic" />
              <Icon name="square" :stroke="1.5" class="mq-primary-icon" :visible="showStop" />
              <Icon name="arrowUp" :stroke="1.5" class="mq-primary-icon" :visible="canSend" />
            </span>
          </span>
        </div>
      </div>
    </form>

    <div
      :id="menuId"
      ref="menuEl"
      class="mq-menu"
      popover="auto"
      role="menu"
      aria-label="More options"
      @keydown="onMenuKeydown"
    >
      <button type="button" role="menuitem" tabindex="-1" class="mq-menu-item" @click="sendParallel">
        <Icon name="flowSquare" :stroke="1.75" />
        Send and run in parallel
      </button>
      <button type="button" role="menuitem" tabindex="-1" class="mq-menu-item" @click="sendNewChat">
        <Icon name="split" :stroke="1.75" />
        Send in a new chat
      </button>
      <hr class="mq-menu-separator" />
      <button
        type="button"
        role="menuitemcheckbox"
        :aria-checked="alwaysSendInChat"
        tabindex="-1"
        class="mq-menu-item"
        @click="toggleAlwaysSendInChat"
      >
        Always send in chat
        <span class="mq-switch" aria-hidden="true">
          <span class="mq-switch-thumb" />
        </span>
      </button>
    </div>

    <div ref="tooltipEl" class="mq-tooltip" popover="manual" role="tooltip" />
  </div>
</template>
