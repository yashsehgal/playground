"use client";

import { useEffect, useRef, useState } from "react";

const models = [
  { id: "opus-5.5", name: "Opus 5.5", behavior: "max" },
  { id: "sonnet-5", name: "Sonnet 5", behavior: "default" },
  { id: "composer", name: "Composer", behavior: "fast" },
];

const commitActions = [
  "Commit",
  "Commit and push",
  "Commit and create a PR",
];

type OpenMenu = "commit" | "model" | null;

export function ChatInput() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [modelId, setModelId] = useState(models[0].id);
  const [commitAction, setCommitAction] = useState(commitActions[0]);
  const [open, setOpen] = useState<OpenMenu>(null);
  const model = models.find((item) => item.id === modelId) ?? models[0];

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="w-full max-w-[32rem]">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="inline-flex items-center gap-1.5 rounded-sm bg-white px-3 py-2 text-sm leading-5 font-medium shadow-panel">
          <span>Changes</span>
          <span className="text-added tabular-nums">+24</span>
          <span className="text-removed tabular-nums">-11</span>
        </p>
        <div className="relative">
          <button
            type="button"
            aria-expanded={open === "commit"}
            aria-haspopup="menu"
            onClick={() => setOpen(open === "commit" ? null : "commit")}
            className="inline-flex items-center gap-1.5 rounded-sm bg-white px-3 py-2 text-sm leading-5 font-medium shadow-panel transition-[scale,background-color] duration-150 ease-out hover:bg-row focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40 active:scale-[0.96] motion-reduce:transition-none"
          >
            {commitAction}
            <Chevron open={open === "commit"} />
          </button>
          {open === "commit" ? (
            <div
              role="menu"
              className="absolute bottom-full left-0 z-10 mb-1 min-w-56 rounded-sm bg-white p-1 shadow-panel"
            >
              {commitActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setCommitAction(action);
                    setOpen(null);
                  }}
                  className={`block w-full rounded-sm px-3 py-2 text-start text-sm leading-5 hover:bg-row focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40 ${
                    action === commitAction ? "bg-row font-medium" : ""
                  }`}
                >
                  {action}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <form
        className="rounded-sm bg-white p-2 shadow-panel"
        onSubmit={(event) => event.preventDefault()}
      >
        <p className="px-2 pt-2 pb-1 text-base leading-5 font-normal text-ink sm:text-sm">
          Create a PR with changes from{" "}
          <span className="rounded-sm bg-mention-bg px-1 py-0.5 whitespace-nowrap text-mention">
            pr-14/backend
          </span>
        </p>
        <div className="flex items-center gap-1 pt-1">
          <div className="relative">
            <button
              type="button"
              aria-expanded={open === "model"}
              aria-haspopup="listbox"
              onClick={() => setOpen(open === "model" ? null : "model")}
              className={`inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-sm leading-5 transition-[scale,background-color] duration-150 ease-out hover:bg-row focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40 active:scale-[0.96] motion-reduce:transition-none ${
                open === "model" ? "bg-track" : ""
              }`}
            >
              <span className="font-medium">{model.name}</span>
              <span className="text-muted">{model.behavior}</span>
              <Chevron open={open === "model"} />
            </button>
            {open === "model" ? (
              <div
                role="listbox"
                aria-label="Model"
                className="absolute top-full left-0 z-10 mt-1 min-w-56 rounded-sm bg-white p-1 shadow-panel"
              >
                {models.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={item.id === model.id}
                    onClick={() => {
                      setModelId(item.id);
                      setOpen(null);
                    }}
                    className={`flex w-full items-center justify-between gap-4 rounded-sm px-3 py-2 text-sm leading-5 hover:bg-row focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40 ${
                      item.id === model.id ? "bg-row" : ""
                    }`}
                  >
                    <span className={item.id === model.id ? "font-medium" : ""}>
                      {item.name}
                    </span>
                    <span className="text-muted">{item.behavior}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            aria-label="Voice input"
            className="ms-auto grid size-8 shrink-0 place-items-center rounded-sm bg-black text-white transition-[scale,background-color] duration-150 ease-out hover:bg-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40 active:scale-[0.96] motion-reduce:transition-none"
          >
            <MicIcon />
          </button>
        </div>
      </form>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={`text-muted transition-transform duration-150 ease-out motion-reduce:transition-none ${
        open ? "rotate-180" : ""
      }`}
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
