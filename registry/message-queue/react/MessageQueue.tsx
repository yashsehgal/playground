"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type TransitionEvent,
} from "react";
import { flushSync } from "react-dom";
import {
  afterTwoFrames,
  announce,
  autosize,
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
  createId,
  type PointerSortable,
  type QueueAttachment,
  type QueuedMessage,
  type Theme,
} from "../core";
import { ICONS, type IconName } from "../icons";
import "../message-queue.css";

export type { QueueAttachment, QueuedMessage, Theme };

export type MessageQueueProps = {
  /** Controlled queue. Omit to let the component own it (see `defaultMessages`). */
  messages?: QueuedMessage[];
  defaultMessages?: QueuedMessage[];
  /** Fires with the next array after every change, once exit motion has finished. */
  onMessagesChange?: (messages: QueuedMessage[]) => void;
  alwaysSendInChat?: boolean;
  defaultAlwaysSendInChat?: boolean;
  onAlwaysSendInChatChange?: (on: boolean) => void;
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
  className?: string;
};

type Lifted = { id: string; origin: QueuedMessage[] };
type Updater<T> = T | ((previous: T) => T);

const ROW_SELECTOR = '[data-mq-row]:not([data-leaving="true"])';
const EMPTY: QueuedMessage[] = [];

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (next: T) => void) {
  const [internal, setInternal] = useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : internal;
  const latest = useRef(current);
  useLayoutEffect(() => {
    latest.current = current;
  });
  const set = useCallback(
    (next: Updater<T>) => {
      const resolved =
        typeof next === "function" ? (next as (previous: T) => T)(latest.current) : next;
      if (Object.is(resolved, latest.current)) return;
      latest.current = resolved;
      if (!controlled) setInternal(resolved);
      onChange?.(resolved);
    },
    [controlled, onChange],
  );
  return [current, set] as const;
}

function Icon({
  name,
  stroke = 2,
  className,
  visible,
}: {
  name: IconName;
  stroke?: number;
  className?: string;
  visible?: boolean;
}) {
  return (
    <svg
      className={cx("mq-icon", className)}
      viewBox="0 0 24 24"
      strokeWidth={stroke}
      data-visible={visible}
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export function MessageQueue({
  messages: messagesProp,
  defaultMessages = EMPTY,
  onMessagesChange,
  alwaysSendInChat: alwaysProp,
  defaultAlwaysSendInChat = false,
  onAlwaysSendInChatChange,
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
  className,
}: MessageQueueProps) {
  const fieldId = useId();
  const listId = useId();
  const hintId = useId();
  const menuId = useId();

  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const menuClosedAt = useRef({ id: "", at: 0 });
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const sortableRef = useRef<PointerSortable | null>(null);
  const movingRef = useRef(false);
  const prevEditingId = useRef<string | null>(null);

  const [messages, setMessages] = useControllable(messagesProp, defaultMessages, onMessagesChange);
  const [alwaysSendInChat, setAlwaysSendInChat] = useControllable(
    alwaysProp,
    defaultAlwaysSendInChat,
    onAlwaysSendInChatChange,
  );
  const [draft, setDraft] = useState("");
  const [recording, setRecordingState] = useState(false);
  const [recordReady, setRecordReady] = useState(true);
  const [attachments, setAttachments] = useState<QueueAttachment[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [leavingIds, setLeavingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [lifted, setLifted] = useState<Lifted | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const canSend = normalizeText(draft).length > 0 || attachments.length > 0;
  const queue = messages.filter((item) => !leavingIds.has(item.id));
  const canReorder = queue.length > 1;
  const tabStopId =
    activeId && queue.some((item) => item.id === activeId) ? activeId : (queue[0]?.id ?? null);
  const hasMessages = messages.length > 0;

  const latest = useRef({ messages, queue });
  useLayoutEffect(() => {
    latest.current = { messages, queue };
  });

  const setRecording = useCallback(
    (next: boolean) => {
      setRecordingState((current) => {
        if (current !== next) onRecordingChange?.(next);
        return next;
      });
    },
    [onRecordingChange],
  );

  const queueItems = useCallback(
    () =>
      latest.current.queue
        .map((item) => itemRefs.current.get(item.id))
        .filter((node): node is HTMLDivElement => Boolean(node)),
    [],
  );

  useEffect(() => {
    if (recordReady) return;
    return afterTwoFrames(() => setRecordReady(true));
  }, [recordReady]);

  useLayoutEffect(() => autosize(fieldRef.current), [draft]);

  useEffect(() => {
    if (!rootRef.current || !tooltipRef.current) return;
    return createTooltips(rootRef.current, tooltipRef.current);
  }, []);

  const focusComposer = useCallback(() => focusAtEnd(fieldRef.current), []);

  const focusQueueItem = useCallback(
    (id: string) => {
      setActiveId(id);
      const node = itemRefs.current.get(id);
      node?.focus({ preventScroll: true });
      const index = latest.current.queue.findIndex((item) => item.id === id);
      revealQueueItem(listRef.current, queueItems(), index);
    },
    [queueItems],
  );

  const finishLeaving = useCallback(
    (id: string) => {
      setLeavingIds((current) => {
        if (!current.has(id)) return current;
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      setMessages((items) => items.filter((item) => item.id !== id));
    },
    [setMessages],
  );

  const removeMessage = useCallback(
    (id: string, announcement: string) => {
      setStatus(announcement);
      if (editingId === id) {
        setEditingId(null);
        setDraft("");
        setAttachments([]);
      }
      if (prefersReducedMotion()) {
        setMessages((items) => items.filter((item) => item.id !== id));
        return;
      }
      setLeavingIds((current) => new Set(current).add(id));
      window.setTimeout(() => finishLeaving(id), LEAVE_FALLBACK_MS);
    },
    [editingId, finishLeaving, setMessages],
  );

  const removeAndRefocus = useCallback(
    (message: QueuedMessage, announcement: string) => {
      const items = latest.current.queue;
      const index = items.findIndex((item) => item.id === message.id);
      const nextId = items[index + 1]?.id ?? items[index - 1]?.id ?? null;
      removeMessage(message.id, announcement);
      if (nextId) focusQueueItem(nextId);
      else focusComposer();
    },
    [focusComposer, focusQueueItem, removeMessage],
  );

  const deleteMessage = useCallback(
    (message: QueuedMessage) => {
      onRemove?.(message);
      removeAndRefocus(message, announce.removed());
    },
    [onRemove, removeAndRefocus],
  );

  const edit = useCallback(
    (message: QueuedMessage) => {
      setEditingId(message.id);
      setActiveId(message.id);
      setDraft(message.text);
      setAttachments(message.attachments);
      setRecording(false);
      setStatus(announce.editing());
      requestAnimationFrame(focusComposer);
    },
    [focusComposer, setRecording],
  );

  useEffect(() => {
    const previous = prevEditingId.current;
    prevEditingId.current = editingId;
    if (!previous || editingId) return;
    if (messages.some((item) => item.id === previous && !leavingIds.has(previous))) {
      requestAnimationFrame(() => focusQueueItem(previous));
    }
  }, [editingId, focusQueueItem, leavingIds, messages]);

  const reorderByIndex = useCallback(
    (from: number, to: number) => {
      const items = latest.current.queue;
      const fromId = items[from]?.id;
      const toId = items[to]?.id;
      if (!fromId || !toId) return latest.current.messages;
      const all = latest.current.messages;
      const next = moveItem(
        all,
        all.findIndex((item) => item.id === fromId),
        all.findIndex((item) => item.id === toId),
      );
      setMessages(next);
      return next;
    },
    [setMessages],
  );

  useEffect(() => {
    const list = listRef.current;
    if (!hasMessages || !list) return;
    const sortable = createPointerSortable(list, {
      rowSelector: ROW_SELECTOR,
      ignoreSelector: ".mq-item-actions",
      canStart: (row) => row.dataset.draggable === "true",
      onDrop: (from, to) => {
        let next = latest.current.messages;
        flushSync(() => {
          next = reorderByIndex(from, to);
        });
        onReorder?.(next);
      },
    });
    sortableRef.current = sortable;
    return () => {
      sortable.destroy();
      sortableRef.current = null;
    };
  }, [hasMessages, onReorder, reorderByIndex]);

  useEffect(() => {
    if (!expanded || queue.length === 0 || editingId || lifted) return;
    function onKeyDown(event: KeyboardEvent) {
      if (sortableRef.current?.isActive()) return;
      const action = resolveQueueKey(event, {
        list: listRef.current,
        panel: panelRef.current,
        field: fieldRef.current,
        items: queueItems(),
      });
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      if (action.type === "composer") {
        focusComposer();
        return;
      }
      const message = latest.current.queue[action.index];
      if (!message) return;
      if (action.type === "focus") focusQueueItem(message.id);
      else if (action.type === "edit") edit(message);
      else deleteMessage(message);
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [deleteMessage, edit, editingId, expanded, focusComposer, focusQueueItem, lifted, queue.length, queueItems]);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    function onToggle(event: Event) {
      if ((event as ToggleEvent).newState !== "closed") return;
      menuClosedAt.current = { id: menuFor ?? "", at: performance.now() };
      const trigger = menuTriggerRef.current;
      const active = document.activeElement;
      if (trigger?.isConnected && (!active || active === document.body || menu!.contains(active))) {
        trigger.focus({ preventScroll: true });
      }
      setMenuFor(null);
    }
    menu.addEventListener("toggle", onToggle);
    return () => menu.removeEventListener("toggle", onToggle);
  }, [menuFor]);

  function openMenu(message: QueuedMessage, event: ReactMouseEvent<HTMLButtonElement>) {
    const menu = menuRef.current;
    if (!menu) return;
    const recent = menuClosedAt.current;
    if (recent.id === message.id && performance.now() - recent.at < 200) return;
    if (menu.matches(":popover-open")) {
      menu.hidePopover();
      return;
    }
    menuTriggerRef.current = event.currentTarget;
    flushSync(() => setMenuFor(message.id));
    menu.showPopover();
    placePopover(event.currentTarget, menu, "bottom-end", 6);
    menu.querySelector<HTMLElement>('[role^="menuitem"]')?.focus();
  }

  function runMenuAction(action: (message: QueuedMessage) => void) {
    const message = messages.find((item) => item.id === menuFor);
    menuRef.current?.hidePopover();
    if (message) action(message);
  }

  function onItemKeyDown(event: ReactKeyboardEvent<HTMLDivElement>, message: QueuedMessage, index: number) {
    if (event.target !== event.currentTarget) return;
    if (lifted) {
      if (lifted.id !== message.id) return;
      const action = resolveLiftKey(event.nativeEvent, index, queue.length);
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      if (action.type === "move" && action.to !== index) {
        movingRef.current = true;
        flushSync(() => reorderByIndex(index, action.to));
        focusQueueItem(message.id);
        movingRef.current = false;
        setStatus(announce.moved(action.to + 1, queue.length));
      } else if (action.type === "drop") {
        setLifted(null);
        setStatus(announce.dropped(message, index + 1, queue.length));
        onReorder?.(latest.current.messages);
      } else if (action.type === "cancel") {
        movingRef.current = true;
        flushSync(() => {
          setMessages(lifted.origin);
          setLifted(null);
        });
        focusQueueItem(message.id);
        movingRef.current = false;
        setStatus(announce.reorderCancelled(message));
      }
      return;
    }
    if (isSpaceKey(event) && isUnmodifiedKey(event) && canReorder && !editingId) {
      event.preventDefault();
      setLifted({ id: message.id, origin: messages });
      setStatus(announce.lifted(message, index + 1, queue.length));
    }
  }

  function onItemBlur(message: QueuedMessage) {
    if (movingRef.current || !lifted || lifted.id !== message.id) return;
    setLifted(null);
    onReorder?.(latest.current.messages);
  }

  function send() {
    const text = normalizeText(fieldRef.current?.value ?? draft);
    if (!text && attachments.length === 0) return;
    const wasEditing = editingId !== null;
    if (editingId) {
      const updated = { id: editingId, text, attachments };
      setMessages((items) => items.map((item) => (item.id === editingId ? updated : item)));
      onUpdate?.(updated);
      setStatus(announce.updated());
      setEditingId(null);
    } else {
      const message: QueuedMessage = { id: createId(), text, attachments };
      setMessages((items) => [...items, message]);
      onQueue?.(message);
      setStatus(announce.queued(message));
      setExpanded(true);
    }
    setDraft("");
    setAttachments([]);
    setRecording(false);
    setRecordReady(false);
    if (!wasEditing) requestAnimationFrame(() => fieldRef.current?.focus());
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft("");
    setAttachments([]);
    setStatus(announce.cancelledEdit());
  }

  function dismissQueue() {
    onDismiss?.(queue);
    setStatus(announce.dismissed());
    setEditingId(null);
    setLifted(null);
    setLeavingIds(new Set());
    setMessages([]);
    focusComposer();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send();
  }

  function onFieldKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape" && editingId) {
      event.preventDefault();
      cancelEdit();
      return;
    }
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    send();
  }

  function onRowTransitionEnd(event: TransitionEvent<HTMLLIElement>, id: string) {
    if (event.target !== event.currentTarget || event.propertyName !== "height") return;
    if (leavingIds.has(id)) finishLeaving(id);
  }

  const showMic = !canSend && !recording;
  const showStop = !canSend && recording;
  const masked = queue.length >= SCROLL_MASK_MIN_MESSAGES;

  return (
    <div
      ref={rootRef}
      className={cx("mq", className)}
      data-theme={theme === "system" ? undefined : theme}
    >
      <p className="mq-sr-only" role="status" aria-live="polite">
        {status}
      </p>

      {hasMessages ? (
        <div ref={panelRef} className="mq-panel" data-expanded={expanded}>
          <div className="mq-card">
            <div className="mq-header">
              <button
                type="button"
                className="mq-count mq-focus"
                aria-expanded={expanded}
                aria-controls={listId}
                onClick={() => setExpanded((open) => !open)}
              >
                <span>{queuedCountLabel(queue.length)}</span>
                <Icon name="chevronDown" stroke={1.5} className="mq-chevron" />
              </button>
              <button
                type="button"
                className="mq-icon-button mq-press mq-focus"
                aria-label="Dismiss queue"
                data-tooltip="Dismiss queue"
                onClick={dismissQueue}
              >
                <Icon name="x" stroke={1.5} />
              </button>
            </div>

            <div className="mq-collapse" inert={!expanded}>
              <div className="mq-collapse-inner">
                <p id={hintId} className="mq-sr-only">
                  {REORDER_HINT}
                </p>
                <ul
                  id={listId}
                  ref={listRef}
                  className="mq-list"
                  role="listbox"
                  aria-label="Queued messages"
                  aria-orientation="vertical"
                  data-masked={masked}
                  data-lifted={lifted ? true : undefined}
                >
                  {messages.map((message) => {
                    const index = queue.findIndex((item) => item.id === message.id);
                    const isEditing = message.id === editingId;
                    const isLocked = editingId !== null && !isEditing;
                    const isLeaving = leavingIds.has(message.id);
                    const isTabStop = message.id === tabStopId;
                    const draggable = canReorder && !isEditing && !isLocked && !isLeaving;
                    const label = queuedLabel(message);
                    const tab = isTabStop ? 0 : -1;
                    return (
                      <li
                        key={message.id}
                        className="mq-row"
                        role="presentation"
                        data-mq-row=""
                        data-leaving={isLeaving || undefined}
                        data-locked={isLocked || undefined}
                        data-draggable={draggable}
                        data-lifted={lifted?.id === message.id || undefined}
                        inert={isLocked}
                        onTransitionEnd={(event) => onRowTransitionEnd(event, message.id)}
                      >
                        <div
                          ref={(node) => {
                            if (node) itemRefs.current.set(message.id, node);
                            else itemRefs.current.delete(message.id);
                          }}
                          className="mq-item"
                          role="option"
                          aria-selected={isTabStop}
                          aria-current={isEditing || undefined}
                          aria-label={isEditing ? `Editing ${label}` : label}
                          aria-describedby={draggable ? hintId : undefined}
                          aria-roledescription={draggable ? "sortable message" : undefined}
                          tabIndex={isTabStop && !isLeaving ? 0 : -1}
                          data-editing={isEditing || undefined}
                          data-draggable={draggable}
                          onFocus={() => setActiveId(message.id)}
                          onBlur={() => onItemBlur(message)}
                          onPointerEnter={(event) => {
                            if (event.pointerType !== "touch") setActiveId(message.id);
                          }}
                          onKeyDown={(event) => onItemKeyDown(event, message, index)}
                        >
                          <p className="mq-item-label">{label}</p>
                          <div className="mq-item-actions">
                            {isEditing ? (
                              <span className="mq-item-status">Editing</span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="mq-send-now mq-press mq-focus"
                                  tabIndex={tab}
                                  onClick={() => {
                                    onSendNow?.(message);
                                    removeAndRefocus(message, announce.sent(message));
                                  }}
                                >
                                  <Icon name="cornerDownRight" />
                                  Send now
                                </button>
                                <button
                                  type="button"
                                  className="mq-icon-button mq-press mq-focus"
                                  tabIndex={tab}
                                  aria-label="Edit queued message"
                                  aria-keyshortcuts="E"
                                  data-tooltip="Edit queued message"
                                  data-tooltip-kbd="E"
                                  onClick={() => edit(message)}
                                >
                                  <Icon name="pencil" />
                                </button>
                                <button
                                  type="button"
                                  className="mq-icon-button mq-press mq-focus"
                                  tabIndex={tab}
                                  aria-label="Remove queued message"
                                  aria-keyshortcuts="Meta+Backspace Control+Backspace"
                                  data-tooltip="Remove queued message"
                                  data-tooltip-kbd="⌘⌫"
                                  onClick={() => deleteMessage(message)}
                                >
                                  <Icon name="trash" />
                                </button>
                                <button
                                  type="button"
                                  className="mq-icon-button mq-press mq-focus"
                                  tabIndex={tab}
                                  aria-label="More options"
                                  aria-haspopup="menu"
                                  aria-expanded={menuFor === message.id}
                                  aria-controls={menuFor === message.id ? menuId : undefined}
                                  onClick={(event) => openMenu(message, event)}
                                >
                                  <Icon name="ellipsis" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <form className="mq-composer" onSubmit={onSubmit}>
        <label htmlFor={fieldId} className="mq-sr-only">
          Message
        </label>
        <textarea
          id={fieldId}
          ref={fieldRef}
          className="mq-field"
          rows={1}
          value={draft}
          placeholder={recording ? listeningPlaceholder : placeholder}
          onChange={(event) => {
            setDraft(event.target.value);
            if (event.target.value.trim()) setRecording(false);
          }}
          onKeyDown={onFieldKeyDown}
        />
        {attachments.length > 0 ? (
          <div className="mq-chips">
            {attachments.map((file) => (
              <span key={file.id} className="mq-chip">
                <span className="mq-chip-name">{file.name}</span>
                <button
                  type="button"
                  className="mq-chip-remove mq-focus"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => setAttachments((current) => current.filter((item) => item.id !== file.id))}
                >
                  <Icon name="x" stroke={1.5} />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div className="mq-footer">
          <input
            ref={fileRef}
            className="mq-file-input"
            type="file"
            multiple
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              const added = filesToAttachments(event.target.files);
              if (added.length) setAttachments((current) => [...current, ...added]);
              event.target.value = "";
            }}
          />
          <div className="mq-footer-start">
            <button
              type="button"
              className="mq-add mq-press mq-focus"
              aria-label="Add attachment"
              onClick={() => fileRef.current?.click()}
            >
              <Icon name="plus" stroke={1.5} />
            </button>
            {editingId ? (
              <span className="mq-badge">
                Editing
                <button
                  type="button"
                  className="mq-badge-cancel mq-press mq-focus"
                  aria-label="Cancel editing"
                  aria-keyshortcuts="Escape"
                  data-tooltip="Cancel editing"
                  data-tooltip-kbd="Esc"
                  onClick={cancelEdit}
                >
                  <Icon name="x" />
                </button>
              </span>
            ) : null}
          </div>
          <div className="mq-primary">
            <button
              type="submit"
              className="mq-primary-button mq-press mq-focus"
              aria-label="Send message"
              tabIndex={canSend ? 0 : -1}
              aria-hidden={canSend ? undefined : true}
              data-hidden={!canSend}
            />
            <button
              type="button"
              className="mq-primary-button mq-press mq-focus"
              aria-label={recording ? "Stop recording" : "Record voice"}
              aria-pressed={recording}
              disabled={!recordReady}
              tabIndex={canSend ? -1 : 0}
              aria-hidden={canSend ? true : undefined}
              data-hidden={canSend}
              onClick={() => setRecording(!recording)}
            />
            <span className="mq-primary-icons">
              <span className="mq-primary-stack">
                <Icon name="mic" stroke={1.5} className="mq-primary-icon" visible={showMic} />
                <Icon name="square" stroke={1.5} className="mq-primary-icon" visible={showStop} />
                <Icon name="arrowUp" stroke={1.5} className="mq-primary-icon" visible={canSend} />
              </span>
            </span>
          </div>
        </div>
      </form>

      <div
        ref={menuRef}
        id={menuId}
        className="mq-menu"
        popover="auto"
        role="menu"
        aria-label="More options"
        onKeyDown={(event) => {
          if (menuRef.current) handleMenuKeydown(event.nativeEvent, menuRef.current);
        }}
      >
        <button
          type="button"
          role="menuitem"
          tabIndex={-1}
          className="mq-menu-item"
          onClick={() =>
            runMenuAction((message) => {
              onSendParallel?.(message);
              removeAndRefocus(message, announce.sentParallel(message));
            })
          }
        >
          <Icon name="flowSquare" stroke={1.75} />
          Send and run in parallel
        </button>
        <button
          type="button"
          role="menuitem"
          tabIndex={-1}
          className="mq-menu-item"
          onClick={() =>
            runMenuAction((message) => {
              onSendNewChat?.(message);
              removeAndRefocus(message, announce.sentNewChat(message));
            })
          }
        >
          <Icon name="split" stroke={1.75} />
          Send in a new chat
        </button>
        <hr className="mq-menu-separator" />
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={alwaysSendInChat}
          tabIndex={-1}
          className="mq-menu-item"
          onClick={() => {
            const next = !alwaysSendInChat;
            setAlwaysSendInChat(next);
            setStatus(announce.alwaysSendInChat(next));
          }}
        >
          Always send in chat
          <span className="mq-switch" aria-hidden="true">
            <span className="mq-switch-thumb" />
          </span>
        </button>
      </div>

      <div ref={tooltipRef} className="mq-tooltip" popover="manual" role="tooltip" />
    </div>
  );
}
