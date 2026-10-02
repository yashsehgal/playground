"use client";

import { useEffect, useRef, useState } from "react";
import { agentList, type Agent } from "@/lib/agents";
import styles from "./agent-composer.module.css";

const surface = "bg-white text-ink dark:bg-surface-dark dark:text-ink-dark";
const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40 dark:focus-visible:outline-ink-dark/40";

function shuffle(items: Agent[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

function mentionQuery(value: string, cursor: number) {
  const match = value.slice(0, cursor).match(/(?:^|\s)@([^\s@]*)$/);
  return match ? match[1] : null;
}

function matchesAgent(agent: Agent, query: string) {
  const term = query.toLowerCase();
  if (!term) return true;
  const stem = term.endsWith("s") && term.length > 3 ? term.slice(0, -1) : term;
  const name = agent.name.toLowerCase();
  const words = agent.role.toLowerCase().split(/\s+/);
  const hits = (value: string) =>
    name.startsWith(value) || words.some((word) => word.startsWith(value));
  return hits(term) || hits(stem);
}

export function AgentComposer() {
  const [message, setMessage] = useState("");
  const [cursor, setCursor] = useState(0);
  const [listening, setListening] = useState(false);
  const [order, setOrder] = useState(agentList);
  const [activeIndex, setActiveIndex] = useState(0);
  const wasMentioning = useRef(false);
  const query = mentionQuery(message, cursor);
  const mentioning = query !== null;
  const matches = mentioning
    ? agentList.filter((agent) => matchesAgent(agent, query))
    : [];
  const canSend = message.trim().length > 0;

  const chooseAgent = (agent: Agent) => {
    const before = message.slice(0, cursor).replace(/@([^\s@]*)$/, `@${agent.name} `);
    const next = before + message.slice(cursor);
    setMessage(next);
    setCursor(before.length);
  };

  useEffect(() => {
    if (mentioning && !wasMentioning.current) setOrder(shuffle(agentList));
    wasMentioning.current = mentioning;
  }, [mentioning]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const placeCursor = (element: HTMLTextAreaElement) => {
    setCursor(element.selectionStart ?? element.value.length);
  };

  return (
    <div className="relative w-full max-w-[32rem]">
      <div
        className="pointer-events-none absolute inset-x-6 bottom-full z-0 flex h-8 items-end justify-center gap-3"
        aria-hidden={!mentioning}
      >
        {order.map((agent, index) => (
          <span
            key={agent.id}
            data-peek={mentioning ? "true" : undefined}
            className={`size-8 rounded-[4px] ${styles.block}`}
            style={{
              backgroundColor: agent.color,
              animationDelay: `${index * 70}ms`,
            }}
          />
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {mentioning ? `${order.map((agent) => agent.name).join(", ")} are ready` : ""}
      </p>
    <form
      className={`relative z-10 w-full rounded-sm p-2 shadow-panel ${surface}`}
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSend) return;
        setMessage("");
        setCursor(0);
        setListening(false);
      }}
    >
      <label className="sr-only" htmlFor="agent-message">
        Message
      </label>
      <textarea
        id="agent-message"
        rows={2}
        value={message}
        placeholder="Message the agents"
        aria-autocomplete="list"
        aria-controls={mentioning ? "agent-mentions" : undefined}
        aria-activedescendant={
          mentioning && matches[activeIndex]
            ? `agent-option-${matches[activeIndex].id}`
            : undefined
        }
        onChange={(event) => {
          setMessage(event.target.value);
          placeCursor(event.target);
        }}
        onSelect={(event) => placeCursor(event.currentTarget)}
        onKeyDown={(event) => {
          if (mentioning && matches.length > 0 && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            const direction = event.key === "ArrowDown" ? 1 : -1;
            setActiveIndex((index) => (index + direction + matches.length) % matches.length);
            return;
          }
          if (event.key !== "Enter" || event.shiftKey) return;
          if (mentioning && matches[activeIndex]) {
            event.preventDefault();
            chooseAgent(matches[activeIndex]);
            return;
          }
          event.preventDefault();
          event.currentTarget.form?.requestSubmit();
        }}
        className="w-full resize-none bg-transparent px-2 pt-2 pb-1 text-base leading-5 text-ink outline-none placeholder:text-muted sm:text-sm dark:text-ink-dark dark:placeholder:text-muted-dark"
      />
      <div className="flex items-center justify-end gap-1 pt-1">
        <button
          type="button"
          aria-pressed={listening}
          aria-label={listening ? "Stop voice input" : "Voice input"}
          onClick={() => setListening((value) => !value)}
          className={`grid size-8 shrink-0 place-items-center rounded-sm transition-[scale,background-color,color] duration-150 ease-out active:scale-[0.96] motion-reduce:transition-none ${focus} ${
            listening
              ? "bg-black text-white dark:bg-ink-dark dark:text-ink"
              : "text-ink hover:bg-row dark:text-ink-dark dark:hover:bg-row-dark"
          }`}
        >
          <MicIcon />
        </button>
        <button
          type="submit"
          aria-label="Send message"
          disabled={!canSend}
          className={`grid size-8 shrink-0 place-items-center rounded-sm bg-black text-white transition-[scale,background-color,opacity] duration-150 ease-out hover:bg-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40 active:scale-[0.96] disabled:bg-track disabled:text-muted disabled:active:scale-100 motion-reduce:transition-none dark:bg-ink-dark dark:text-ink dark:hover:bg-white dark:disabled:bg-track-dark dark:disabled:text-muted-dark ${focus}`}
        >
          <SendIcon />
        </button>
      </div>
    </form>
      {mentioning ? (
        <div
          role="listbox"
          id="agent-mentions"
          aria-label="Agents"
          className={`absolute top-full right-0 left-0 z-20 mt-2 rounded-sm p-2 shadow-panel ${surface}`}
        >
          {matches.length > 0 ? (
            matches.map((agent, index) => (
              <button
                key={agent.id}
                type="button"
                role="option"
                id={`agent-option-${agent.id}`}
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => chooseAgent(agent)}
                className={`grid w-full grid-cols-[0.875rem_minmax(0,1fr)_auto] items-center gap-x-2.5 rounded-sm px-2 py-2 text-start hover:bg-row dark:hover:bg-row-dark ${focus} ${
                  index === activeIndex ? "bg-row dark:bg-row-dark" : ""
                }`}
              >
                <span
                  className="size-3.5 rounded-[4px]"
                  style={{ backgroundColor: agent.color }}
                  aria-hidden="true"
                />
                <span className="truncate text-sm leading-5 font-medium">
                  {agent.name}
                </span>
                <span className="text-sm leading-5 text-muted dark:text-muted-dark">
                  {agent.role}
                </span>
              </button>
            ))
          ) : (
            <p className="px-2 py-2 text-sm leading-5 text-muted dark:text-muted-dark">
              No agents
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect
        x="5"
        y="1.75"
        width="4"
        height="6.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M3.25 6.75a3.75 3.75 0 0 0 7.5 0M7 10.5v1.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M7 11.25V2.75M3.75 6 7 2.75 10.25 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
