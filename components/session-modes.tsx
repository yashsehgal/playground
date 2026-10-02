"use client";

import { useEffect, useState } from "react";

const modes = [
  {
    id: "auto",
    name: "Auto",
    description: "Handles permission decisions",
    shortcut: "1",
  },
  {
    id: "manual",
    name: "Manual",
    description: "Ask before making a change",
    shortcut: "2",
  },
  {
    id: "accept-edits",
    name: "Accept edits",
    description: "Accept file edits automatically",
    shortcut: "3",
  },
  {
    id: "plan",
    name: "Plan",
    description: "Plan before making changes",
    shortcut: "4",
  },
  {
    id: "bypass",
    name: "Bypass permissions",
    description: "Accept all permissions",
    shortcut: "5",
  },
];

export function SessionModes() {
  const [selectedId, setSelectedId] = useState(modes[0].id);
  const selected = modes.find((mode) => mode.id === selectedId) ?? modes[0];
  const surface = "bg-white text-ink dark:bg-surface-dark dark:text-ink-dark";
  const muted = "text-muted dark:text-muted-dark";
  const hover = "hover:bg-row dark:hover:bg-row-dark";
  const focus =
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40 dark:focus-visible:outline-ink-dark/40";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mode = modes.find((item) => item.shortcut === event.key);
      if (!mode) return;
      setSelectedId(mode.id);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="mx-auto w-full max-w-[20rem]">
      <div
        className={`inline-flex h-8 items-center gap-1.5 rounded-sm px-3 text-sm leading-5 font-medium shadow-panel ${surface}`}
      >
        {selected.name}
        <Chevron className={muted} />
      </div>
      <div
        role="listbox"
        aria-label="Mode"
        className={`mt-2 rounded-sm px-2 py-2 shadow-panel ${surface}`}
      >
        <p className="px-2 pt-1 pb-1 text-sm leading-5 font-medium">Mode</p>
        {modes.map((mode) => {
          const isSelected = mode.id === selected.id;
          return (
            <button
              key={mode.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => setSelectedId(mode.id)}
              className={`grid w-full grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-x-3 rounded-sm px-2 py-2 text-start ${hover} ${focus}`}
            >
              <span>
                <span className="block text-sm leading-5 font-medium">
                  {mode.name}
                </span>
                <span className={`mt-0.5 block text-sm leading-5 font-normal ${muted}`}>
                  {mode.description}
                </span>
              </span>
              <span
                className={`flex w-full items-center justify-end gap-1.5 text-sm leading-5 tabular-nums ${muted}`}
              >
                <span className="grid size-3.5 place-items-center">
                  {isSelected ? <CheckIcon /> : null}
                </span>
                <span className="w-[1ch] text-end">{mode.shortcut}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Chevron({ className }: { className: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M2.5 4.5 6 8l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M2.75 7.25 5.5 10l5.75-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
