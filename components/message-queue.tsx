"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FormEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type TransitionEvent,
} from "react";
import {
  ArrowUpIcon,
  ChevronDownIcon,
  CornerDownRightIcon,
  MicIcon,
  PencilIcon,
  PlusIcon,
  SquareIcon,
  Trash2Icon,
  XIcon,
  EllipsisIcon,
} from "lucide-react";
import { FlowSquareIcon, SplitIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import styles from "./message-queue.module.css";

type Attachment = {
  id: string;
  name: string;
};

type QueuedMessage = {
  id: string;
  text: string;
  attachments: Attachment[];
};

const surface =
  "bg-white shadow-[0_0_1px_rgba(0,0,0,0.16),0_1px_2px_-1px_rgba(0,0,0,0.08),0_4px_12px_-6px_rgba(0,0,0,0.06)] dark:bg-[oklch(0.25_0.008_75)] dark:shadow-[0_0_1px_rgba(255,255,255,0.12),0_1px_2px_-1px_rgba(0,0,0,0.3),0_4px_12px_-6px_rgba(0,0,0,0.3)]";
const ink = "text-black/[0.87] dark:text-white/[0.87]";
const press =
  "transition-[scale,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100";
const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black/40 dark:focus-visible:outline-white/50";
const iconBase =
  "col-start-1 row-start-1 size-4 transition-[opacity,filter,scale] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:scale-100 motion-reduce:blur-none motion-reduce:transition-none";
const iconOn = "scale-100 opacity-100 blur-none";
const iconOff =
  "pointer-events-none scale-[0.25] opacity-0 blur-[4px] motion-reduce:scale-100";
const rowIconButton =
  "grid size-5 place-items-center rounded-md text-black/60 hover:bg-black/[0.06] hover:text-black/[0.87] dark:text-white/60 dark:hover:bg-white/[0.08] dark:hover:text-white";
// shadcn's --muted only flips under a `.dark` class; this app's dark mode follows the media query.
const editingRow = "bg-[oklch(0.97_0_0)] dark:bg-white/[0.06]";
const kbd = "ml-1.5 font-normal text-white/55 dark:text-black/50";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const SCROLL_EDGE_MIN_MESSAGES = 6;
const DRAG_CLICK_WINDOW_MS = 250;
const LEAVE_FALLBACK_MS = 300;
const SORT_TRANSITION = {
  duration: 150,
  easing: "cubic-bezier(0.23, 1, 0.32, 1)",
};
const SORT_TRANSITION_REDUCED = { duration: 0, easing: "linear" };

function prefersReducedMotion() {
  return window.matchMedia(REDUCED_MOTION).matches;
}

function queuedCountLabel(count: number) {
  return count === 1 ? "1 queued message" : `${count} queued messages`;
}

function queuedLabel(message: Pick<QueuedMessage, "text" | "attachments">) {
  const names = message.attachments.map((file) => file.name).join(", ");
  if (message.text && names) return `${message.text} · ${names}`;
  return message.text || names;
}

function isUnmodifiedKey(event: {
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}) {
  return !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey;
}

function isEditShortcut(event: globalThis.KeyboardEvent) {
  return isUnmodifiedKey(event) && (event.key === "e" || event.key === "E");
}

function isDeleteShortcut(event: globalThis.KeyboardEvent) {
  if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) {
    return false;
  }
  return event.key === "Backspace" || event.key === "Delete";
}

/** Arrows stop at the ends; Home/End jump. `current < 0` means nothing in the
 *  list has focus yet: Down/Home → first, Up/End → last. */
function nextQueueIndex(current: number, key: string, length: number) {
  if (length <= 0) return null;
  if (current < 0) {
    if (key === "ArrowDown" || key === "ArrowRight" || key === "Home") return 0;
    if (key === "ArrowUp" || key === "ArrowLeft" || key === "End") {
      return length - 1;
    }
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

/** Keeps the focused row and its neighbours inside the 160px clip. Pinning to
 *  an end turns the scroll mask off there, so the first/last row isn't faded. */
function scrollRangeIntoView(
  list: HTMLElement,
  startNode: HTMLElement,
  endNode: HTMLElement,
  pinToStart: boolean,
  pinToEnd: boolean,
) {
  const maxScroll = Math.max(0, list.scrollHeight - list.clientHeight);
  if (pinToStart) {
    list.scrollTop = 0;
    return;
  }
  if (pinToEnd) {
    list.scrollTop = maxScroll;
    return;
  }
  const listTop = list.getBoundingClientRect().top - list.scrollTop;
  const rangeTop = startNode.getBoundingClientRect().top - listTop;
  const rangeBottom = endNode.getBoundingClientRect().bottom - listTop;
  let next = list.scrollTop;
  if (rangeBottom > next + list.clientHeight) {
    next = rangeBottom - list.clientHeight;
  }
  if (rangeTop < next) next = rangeTop;
  list.scrollTop = Math.max(0, Math.min(next, maxScroll));
}

function subscribeMedia(query: string) {
  return (onChange: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  };
}

const subscribeReducedMotion = subscribeMedia(REDUCED_MOTION);

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

export function MessageQueue() {
  const messageFieldId = useId();
  const listId = useId();
  const dndId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const isDraggingRef = useRef(false);
  const dragEndedAt = useRef(0);
  const prevEditingId = useRef<string | null>(null);
  const [draft, setDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordReady, setRecordReady] = useState(true);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [messages, setMessages] = useState<QueuedMessage[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [leavingIds, setLeavingIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [alwaysSendInChat, setAlwaysSendInChat] = useState(false);
  const [status, setStatus] = useState("");
  const reducedMotion = useReducedMotion();

  const text = draft.replace(/\s+/g, " ").trim();
  const canSend = text.length > 0 || attachments.length > 0;
  const showMic = !canSend && !recording;
  const showStop = !canSend && recording;
  const queue = useMemo(
    () => messages.filter((item) => !leavingIds.has(item.id)),
    [messages, leavingIds],
  );
  const sortableIds = useMemo(() => messages.map((item) => item.id), [messages]);
  const canReorder = queue.length > 1;
  const tabStopId =
    activeId && queue.some((item) => item.id === activeId)
      ? activeId
      : (queue[0]?.id ?? null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const autoScroll = useMemo(
    () => ({ canScroll: (element: Element) => element === listRef.current }),
    [],
  );

  useEffect(() => {
    if (recordReady) return;
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => setRecordReady(true));
    });
    return () => {
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
    };
  }, [recordReady]);

  useLayoutEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = "0px";
    field.style.height = `${Math.min(field.scrollHeight, 128)}px`;
  }, [draft]);

  const focusComposer = useCallback(() => {
    const field = inputRef.current;
    if (!field) return;
    field.focus();
    const length = field.value.length;
    field.setSelectionRange(length, length);
  }, []);

  const focusQueueItem = useCallback(
    (id: string) => {
      setActiveId(id);
      const node = itemRefs.current.get(id);
      node?.focus({ preventScroll: true });
      const list = listRef.current;
      const index = queue.findIndex((item) => item.id === id);
      if (!list || !node || index < 0) return;
      const start = Math.max(0, index - 1);
      const end = Math.min(queue.length - 1, index + 1);
      const startNode = itemRefs.current.get(queue[start].id);
      const endNode = itemRefs.current.get(queue[end].id);
      if (!startNode || !endNode) return;
      scrollRangeIntoView(
        list,
        startNode,
        endNode,
        start === 0,
        end === queue.length - 1,
      );
    },
    [queue],
  );

  const finishLeaving = useCallback((id: string) => {
    setLeavingIds((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setMessages((items) => items.filter((item) => item.id !== id));
  }, []);

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
    [editingId, finishLeaving],
  );

  const removeAndRefocus = useCallback(
    (id: string, announcement: string) => {
      const index = queue.findIndex((item) => item.id === id);
      const nextId = queue[index + 1]?.id ?? queue[index - 1]?.id ?? null;
      removeMessage(id, announcement);
      if (nextId) focusQueueItem(nextId);
      else focusComposer();
    },
    [focusComposer, focusQueueItem, queue, removeMessage],
  );

  const deleteMessage = useCallback(
    (id: string) => removeAndRefocus(id, "Removed queued message"),
    [removeAndRefocus],
  );

  const sendNow = useCallback(
    (message: QueuedMessage) =>
      removeAndRefocus(message.id, `Sent: ${queuedLabel(message)}`),
    [removeAndRefocus],
  );

  const edit = useCallback(
    (message: QueuedMessage) => {
      setEditingId(message.id);
      setActiveId(message.id);
      setDraft(message.text);
      setAttachments(message.attachments);
      setRecording(false);
      setStatus("Editing queued message");
      requestAnimationFrame(focusComposer);
    },
    [focusComposer],
  );

  useEffect(() => {
    const prev = prevEditingId.current;
    prevEditingId.current = editingId;
    if (!prev || editingId) return;
    if (messages.some((item) => item.id === prev && !leavingIds.has(prev))) {
      requestAnimationFrame(() => focusQueueItem(prev));
    }
  }, [editingId, focusQueueItem, leavingIds, messages]);

  useEffect(() => {
    if (!expanded || queue.length === 0 || editingId) return;

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (isDraggingRef.current || event.isComposing) return;
      const active = document.activeElement;
      const list = listRef.current;
      const inList = Boolean(list && active && list.contains(active));

      if (!inList) {
        const inPanel = Boolean(
          panelRef.current && active && panelRef.current.contains(active),
        );
        if (!inPanel) {
          const field = inputRef.current;
          const composerFocused = Boolean(field && active === field);
          const idle = !active || active === document.body;
          if (!composerFocused && !idle) return;
          if (field && composerFocused && field.value !== "") {
            const caretAtStart =
              field.selectionStart === 0 && field.selectionEnd === 0;
            if (!(isUnmodifiedKey(event) && event.key === "ArrowUp" && caretAtStart)) {
              return;
            }
          }
        }
      }

      const current = inList
        ? queue.findIndex((item) => {
            const node = itemRefs.current.get(item.id);
            return Boolean(node && active && node.contains(active));
          })
        : -1;
      const currentItem = current >= 0 ? queue[current] : undefined;

      if (currentItem && isDeleteShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
        deleteMessage(currentItem.id);
        return;
      }
      if (currentItem && isEditShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
        if (currentItem.id !== editingId) edit(currentItem);
        return;
      }
      if (
        inList &&
        isUnmodifiedKey(event) &&
        event.key === "ArrowDown" &&
        current === queue.length - 1
      ) {
        event.preventDefault();
        event.stopPropagation();
        focusComposer();
        return;
      }
      const next = nextQueueIndex(current, event.key, queue.length);
      if (next === null) return;
      event.preventDefault();
      event.stopPropagation();
      if (next !== current) focusQueueItem(queue[next].id);
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [
    deleteMessage,
    edit,
    editingId,
    expanded,
    focusComposer,
    focusQueueItem,
    queue,
  ]);

  function markDragEnded() {
    isDraggingRef.current = false;
    dragEndedAt.current = performance.now();
    setIsDragging(false);
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    markDragEnded();
    if (!over || active.id === over.id) return;
    setMessages((items) => {
      const from = items.findIndex((item) => item.id === active.id);
      const to = items.findIndex((item) => item.id === over.id);
      if (from < 0 || to < 0) return items;
      return arrayMove(items, from, to);
    });
  }

  function onListClickCapture(event: MouseEvent) {
    if (performance.now() - dragEndedAt.current > DRAG_CLICK_WINDOW_MS) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function send() {
    const nextText = (inputRef.current?.value ?? draft)
      .replace(/\s+/g, " ")
      .trim();
    if (!nextText && attachments.length === 0) return;
    const wasEditing = editingId !== null;
    if (editingId) {
      setMessages((items) =>
        items.map((item) =>
          item.id === editingId
            ? { ...item, text: nextText, attachments }
            : item,
        ),
      );
      setStatus("Updated queued message");
      setEditingId(null);
    } else {
      const message: QueuedMessage = {
        id: crypto.randomUUID(),
        text: nextText,
        attachments,
      };
      setMessages((items) => [...items, message]);
      setStatus(`Queued: ${queuedLabel(message)}`);
      setExpanded(true);
    }
    setDraft("");
    setAttachments([]);
    setRecording(false);
    setRecordReady(false);
    if (!wasEditing) requestAnimationFrame(() => inputRef.current?.focus());
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft("");
    setAttachments([]);
    setStatus("Cancelled editing");
  }

  function dismissQueue() {
    setStatus("Dismissed queue");
    setEditingId(null);
    setLeavingIds(new Set());
    setMessages([]);
    focusComposer();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape" && editingId) {
      event.preventDefault();
      cancelEdit();
      return;
    }
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    send();
  }

  function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setAttachments((current) => [
      ...current,
      ...Array.from(files).map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
      })),
    ]);
  }

  const showScrollMask =
    queue.length >= SCROLL_EDGE_MIN_MESSAGES && !isDragging;

  return (
    <TooltipProvider delay={600}>
      <div className="w-full">
        <p className="sr-only" role="status" aria-live="polite">
          {status}
        </p>
        {messages.length > 0 ? (
          <div ref={panelRef} className={cn("isolate mb-2", styles.panel)}>
            <div className={cn("overflow-hidden rounded-[18px]", surface)}>
              <div
                className={cn(
                  "flex items-center justify-between gap-2 pr-2 pl-3",
                  expanded ? "pt-2 pb-1" : "py-2",
                )}
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={listId}
                  onClick={() => setExpanded((open) => !open)}
                  className={cn(
                    "flex min-w-0 cursor-pointer items-center gap-1 text-[13px] leading-5 font-medium text-black/60 tabular-nums select-none hover:text-black/[0.87] dark:text-white/60 dark:hover:text-white/[0.87]",
                    "transition-colors duration-150 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] motion-reduce:transition-none",
                    focus,
                  )}
                >
                  <span>{queuedCountLabel(queue.length)}</span>
                  <ChevronDownIcon
                    aria-hidden
                    strokeWidth={1.5}
                    className={cn(
                      "size-3 shrink-0 transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
                      !expanded && "-rotate-90",
                    )}
                  />
                </button>
                <Tooltip>
                  <TooltipTrigger
                    type="button"
                    aria-label="Dismiss queue"
                    onClick={dismissQueue}
                    className={cn(rowIconButton, press, focus)}
                  >
                    <XIcon className="size-3" strokeWidth={1.5} aria-hidden />
                  </TooltipTrigger>
                  <TooltipContent>Dismiss queue</TooltipContent>
                </Tooltip>
              </div>

              <div
                inert={!expanded}
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
                  expanded
                    ? "grid-rows-[1fr] opacity-100"
                    : "pointer-events-none grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="relative overflow-hidden">
                  <DndContext
                    id={dndId}
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                    autoScroll={autoScroll}
                    onDragStart={() => {
                      isDraggingRef.current = true;
                      setIsDragging(true);
                    }}
                    onDragEnd={onDragEnd}
                    onDragCancel={markDragEnded}
                  >
                    <SortableContext
                      items={sortableIds}
                      strategy={verticalListSortingStrategy}
                    >
                      <ul
                        id={listId}
                        ref={listRef}
                        role="listbox"
                        aria-label="Queued messages"
                        aria-orientation="vertical"
                        onClickCapture={onListClickCapture}
                        className={cn(
                          "max-h-[160px] overflow-y-auto overscroll-contain px-1.5 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                          showScrollMask && "scroll-mask-y",
                        )}
                        style={
                          showScrollMask
                            ? {
                                ["--scroll-mask-fade-from-t" as string]:
                                  "calc(100% - 24px)",
                                ["--scroll-mask-fade-from-b" as string]:
                                  "calc(100% - 24px)",
                              }
                            : undefined
                        }
                      >
                        {messages.map((message, index) => (
                          <QueueRow
                            key={message.id}
                            message={message}
                            isLast={index === messages.length - 1}
                            isEditing={message.id === editingId}
                            isLocked={
                              editingId !== null && message.id !== editingId
                            }
                            isLeaving={leavingIds.has(message.id)}
                            isTabStop={message.id === tabStopId}
                            isListDragging={isDragging}
                            canReorder={canReorder}
                            sortTransition={
                              reducedMotion
                                ? SORT_TRANSITION_REDUCED
                                : SORT_TRANSITION
                            }
                            onActivate={() => setActiveId(message.id)}
                            onSendNow={() => sendNow(message)}
                            onSendParallel={() =>
                              removeAndRefocus(
                                message.id,
                                `Sent and running in parallel: ${queuedLabel(message)}`,
                              )
                            }
                            onSendNewChat={() =>
                              removeAndRefocus(
                                message.id,
                                `Sent in a new chat: ${queuedLabel(message)}`,
                              )
                            }
                            alwaysSendInChat={alwaysSendInChat}
                            onAlwaysSendInChatChange={(checked) => {
                              setAlwaysSendInChat(checked);
                              setStatus(
                                checked
                                  ? "Always send in chat on"
                                  : "Always send in chat off",
                              );
                            }}
                            onEdit={() => edit(message)}
                            onDelete={() => deleteMessage(message.id)}
                            onLeaveEnd={() => finishLeaving(message.id)}
                            itemRef={(node) => {
                              if (node) itemRefs.current.set(message.id, node);
                              else itemRefs.current.delete(message.id);
                            }}
                          />
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <form
          className={cn("rounded-[24px] p-2", surface)}
          onSubmit={onSubmit}
        >
          <label htmlFor={messageFieldId} className="sr-only">
            Message
          </label>
          <textarea
            id={messageFieldId}
            ref={inputRef}
            rows={1}
            value={draft}
            placeholder={recording ? "Listening…" : "Ask AI Agent"}
            onChange={(event) => {
              const value = event.target.value;
              setDraft(value);
              if (value.trim()) setRecording(false);
            }}
            onKeyDown={onKeyDown}
            className={cn(
              "max-h-32 w-full resize-none bg-transparent px-2.5 pt-1.5 pb-1 text-base leading-5 font-normal outline-none placeholder:text-[#8a8a8a] sm:text-sm",
              ink,
            )}
          />
          {attachments.length > 0 ? (
            <div className="scroll-mask-x flex gap-1 overflow-x-auto px-1.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {attachments.map((file) => (
                <span
                  key={file.id}
                  className="inline-flex max-w-40 shrink-0 items-center gap-1 rounded-full bg-[#f2f2f2] py-0.5 pr-0.5 pl-2 text-xs font-medium text-[#4a4a4a] dark:bg-white/[0.08] dark:text-white/75"
                >
                  <span className="min-w-0 truncate">{file.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() =>
                      setAttachments((current) =>
                        current.filter((item) => item.id !== file.id),
                      )
                    }
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full hover:bg-white dark:hover:bg-white/[0.12]",
                      focus,
                    )}
                  >
                    <XIcon className="size-3" strokeWidth={1.5} aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex items-center justify-between px-1 pb-0.5">
            <input
              ref={fileRef}
              type="file"
              multiple
              tabIndex={-1}
              aria-hidden
              className="sr-only"
              onChange={(event) => {
                onFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <div className="flex min-w-0 items-center gap-1.5">
              <button
                type="button"
                aria-label="Add attachment"
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full border-0 bg-[#f2f2f2] text-[#5c5c5c] hover:bg-[#e7e7e7] dark:bg-white/[0.08] dark:text-white/70 dark:hover:bg-white/[0.12]",
                  press,
                  focus,
                )}
              >
                <PlusIcon className="size-4" strokeWidth={1.5} aria-hidden />
              </button>
              {editingId ? (
                <span
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center rounded-full bg-[#fdf4d3] pr-1 pl-[11px] text-[13px] leading-5 font-medium text-[#8a6a10] select-none dark:bg-[#3a2f12] dark:text-[#e9c766]",
                    styles.badge,
                  )}
                >
                  Editing
                  <Tooltip>
                    <TooltipTrigger
                      type="button"
                      aria-label="Cancel editing"
                      aria-keyshortcuts="Escape"
                      onClick={cancelEdit}
                      className={cn(
                        "grid size-6 place-items-center rounded-full text-current hover:bg-[#f6e6a8] dark:hover:bg-[#4d3f17]",
                        press,
                        focus,
                      )}
                    >
                      <XIcon className="size-3" strokeWidth={2} aria-hidden />
                    </TooltipTrigger>
                    <TooltipContent>
                      Cancel editing
                      <kbd className={kbd}>Esc</kbd>
                    </TooltipContent>
                  </Tooltip>
                </span>
              ) : null}
            </div>
            <div className="relative size-8">
              <button
                type="submit"
                aria-label="Send message"
                tabIndex={canSend ? 0 : -1}
                aria-hidden={canSend ? undefined : true}
                className={cn(
                  "absolute inset-0 rounded-full border-0 bg-[#1a1a1a] text-white hover:bg-[#333] dark:bg-[oklch(0.93_0.008_75)] dark:text-[oklch(0.25_0.008_75)] dark:hover:bg-white",
                  press,
                  focus,
                  !canSend && "pointer-events-none invisible",
                )}
              />
              <button
                type="button"
                aria-label={recording ? "Stop recording" : "Record voice"}
                aria-pressed={recording}
                disabled={!recordReady}
                tabIndex={canSend ? -1 : 0}
                aria-hidden={canSend ? true : undefined}
                onClick={() => setRecording((value) => !value)}
                className={cn(
                  "absolute inset-0 rounded-full border-0 bg-[#1a1a1a] text-white hover:bg-[#333] disabled:hover:bg-[#1a1a1a] dark:bg-[oklch(0.93_0.008_75)] dark:text-[oklch(0.25_0.008_75)] dark:hover:bg-white dark:disabled:hover:bg-[oklch(0.93_0.008_75)]",
                  press,
                  focus,
                  canSend && "pointer-events-none invisible",
                )}
              />
              <span className="pointer-events-none absolute inset-0 grid place-items-center text-white dark:text-[oklch(0.25_0.008_75)]">
                <span className="grid size-4 place-items-center">
                  <MicIcon
                    className={cn(iconBase, showMic ? iconOn : iconOff)}
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <SquareIcon
                    className={cn(iconBase, showStop ? iconOn : iconOff)}
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <ArrowUpIcon
                    className={cn(iconBase, canSend ? iconOn : iconOff)}
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </span>
              </span>
            </div>
          </div>
        </form>
      </div>
    </TooltipProvider>
  );
}

function QueueRow({
  message,
  isLast,
  isEditing,
  isLeaving,
  isTabStop,
  isLocked,
  isListDragging,
  canReorder,
  sortTransition,
  onActivate,
  onSendNow,
  onSendParallel,
  onSendNewChat,
  alwaysSendInChat,
  onAlwaysSendInChatChange,
  onEdit,
  onDelete,
  onLeaveEnd,
  itemRef,
}: {
  message: QueuedMessage;
  isLast: boolean;
  isEditing: boolean;
  isLeaving: boolean;
  isTabStop: boolean;
  isLocked: boolean;
  isListDragging: boolean;
  canReorder: boolean;
  sortTransition: { duration: number; easing: string };
  onActivate: () => void;
  onSendNow: () => void;
  onSendParallel: () => void;
  onSendNewChat: () => void;
  alwaysSendInChat: boolean;
  onAlwaysSendInChatChange: (checked: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onLeaveEnd: () => void;
  itemRef: (node: HTMLDivElement | null) => void;
}) {
  const draggable = canReorder && !isEditing && !isLocked && !isLeaving;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: message.id,
    disabled: !draggable,
    transition: sortTransition,
  });
  const isMuted = isListDragging && !isDragging;
  const label = queuedLabel(message);
  const dragHandleProps: HTMLAttributes<HTMLDivElement> | undefined = draggable
    ? { ...attributes, ...listeners }
    : undefined;
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
    position: isDragging ? "relative" : undefined,
  };

  function onTransitionEnd(event: TransitionEvent<HTMLLIElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== "height" || !isLeaving) return;
    onLeaveEnd();
  }

  return (
    <li
      ref={setNodeRef}
      role="presentation"
      style={style}
      data-message-id={message.id}
      data-leaving={isLeaving ? "true" : undefined}
      inert={isLocked}
      onTransitionEnd={onTransitionEnd}
      className={cn(
        "flex flex-col justify-end",
        isLocked && "pointer-events-none select-none",
        styles.row,
      )}
    >
      <div
        {...dragHandleProps}
        ref={itemRef}
        role="option"
        aria-selected={isTabStop}
        aria-current={isEditing ? "true" : undefined}
        aria-label={
          isEditing ? `Editing ${label}` : draggable ? `Reorder ${label}` : label
        }
        tabIndex={isTabStop && !isLeaving ? 0 : -1}
        onFocus={onActivate}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") onActivate();
        }}
        className={cn(
          "flex h-7 min-h-7 items-center gap-1.5 pl-1.5 outline-none",
          "transition-opacity duration-150 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] motion-reduce:transition-none",
          isEditing ? "pr-2.5" : "pr-0.5",
          isLast ? "rounded-t-lg rounded-b-xl" : "rounded-lg",
          !isEditing &&
            !isLocked &&
            !isListDragging &&
            "hover:bg-black/[0.06] focus:bg-black/[0.06] dark:hover:bg-white/[0.08] dark:focus:bg-white/[0.08]",
          isEditing && editingRow,
          draggable && "cursor-grab",
          isDragging && "cursor-grabbing bg-black/[0.06] dark:bg-white/[0.08]",
          isMuted && "opacity-45",
        )}
      >
        <p className={cn("min-w-0 flex-1 truncate text-[13px] leading-5 select-none", ink)}>
          {label}
        </p>
        <div
          className={cn(
            "flex shrink-0 items-center",
            isListDragging && "pointer-events-none",
          )}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {isEditing ? (
            <span className="text-xs whitespace-nowrap text-black/50 select-none dark:text-white/50">
              Editing
            </span>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                tabIndex={isTabStop ? 0 : -1}
                onClick={onSendNow}
                className={cn(
                  "h-5 gap-1 rounded-md pr-1.5 pl-1 text-[12px] leading-4 font-medium text-black/60 hover:bg-black/[0.06] hover:text-black/[0.87] active:not-aria-[haspopup]:translate-y-0 dark:text-white/60 dark:hover:bg-white/[0.08] dark:hover:text-white",
                  press,
                  focus,
                )}
              >
                <CornerDownRightIcon
                  data-icon="inline-start"
                  className="size-3"
                  strokeWidth={2}
                  aria-hidden
                />
                Send now
              </Button>
              <Tooltip>
                <TooltipTrigger
                  type="button"
                  tabIndex={isTabStop ? 0 : -1}
                  aria-label="Edit queued message"
                  aria-keyshortcuts="E"
                  onClick={onEdit}
                  className={cn(rowIconButton, press, focus)}
                >
                  <PencilIcon className="size-3" strokeWidth={2} aria-hidden />
                </TooltipTrigger>
                <TooltipContent>
                  Edit queued message
                  <kbd className={kbd}>E</kbd>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  type="button"
                  tabIndex={isTabStop ? 0 : -1}
                  aria-label="Remove queued message"
                  aria-keyshortcuts="Meta+Backspace"
                  onClick={onDelete}
                  className={cn(rowIconButton, press, focus)}
                >
                  <Trash2Icon className="size-3" strokeWidth={2} aria-hidden />
                </TooltipTrigger>
                <TooltipContent>
                  Remove queued message
                  <kbd className={kbd}>⌘⌫</kbd>
                </TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger
                  type="button"
                  tabIndex={isTabStop ? 0 : -1}
                  aria-label="More options"
                  className={cn(
                    rowIconButton,
                    "aria-expanded:bg-black/[0.06] aria-expanded:text-black/[0.87] dark:aria-expanded:bg-white/[0.08] dark:aria-expanded:text-white",
                    press,
                    focus,
                  )}
                >
                  <EllipsisIcon className="size-3" strokeWidth={2} aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={6}
                  className="min-w-56 rounded-xl p-1"
                >
                  <DropdownMenuItem
                    className="rounded-lg px-2.5 py-1.5 text-[13px]"
                    onClick={onSendParallel}
                  >
                    <HugeiconsIcon
                      icon={FlowSquareIcon}
                      className="size-4"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    Send and run in parallel
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-lg px-2.5 py-1.5 text-[13px]"
                    onClick={onSendNewChat}
                  >
                    <HugeiconsIcon
                      icon={SplitIcon}
                      className="size-4"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    Send in a new chat
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="-mx-1 my-1" />
                  <MenuPrimitive.CheckboxItem
                    checked={alwaysSendInChat}
                    onCheckedChange={onAlwaysSendInChatChange}
                    closeOnClick={false}
                    className="group/switch flex cursor-default items-center justify-between gap-4 rounded-lg px-2.5 py-1.5 text-[13px] leading-5 outline-hidden select-none data-highlighted:bg-white/10 dark:data-highlighted:bg-black/5"
                  >
                    Always send in chat
                    <span
                      aria-hidden
                      className="flex h-4 w-7 shrink-0 items-center rounded-full bg-white/20 p-0.5 transition-colors duration-150 ease-out group-data-checked/switch:bg-white motion-reduce:transition-none dark:bg-black/15 dark:group-data-checked/switch:bg-[#171717]"
                    >
                      <span className="size-3 rounded-full bg-white shadow-[0_1px_2px_oklch(0_0_0/0.2)] transition-[translate,background-color] duration-150 ease-out group-data-checked/switch:translate-x-3 group-data-checked/switch:bg-[#171717] motion-reduce:transition-none dark:group-data-checked/switch:bg-white" />
                    </span>
                  </MenuPrimitive.CheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </li>
  );
}
