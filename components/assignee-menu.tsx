"use client";

import { useEffect, useRef, useState } from "react";
import { AgentFace } from "@/components/agent-face";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { agentList, type Agent } from "@/lib/agents";

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40 dark:focus-visible:outline-ink-dark/40";

export function AssigneeMenu() {
  return (
    <div className="col-start-4 w-fit">
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`inline-flex items-center gap-1 rounded-sm bg-track py-1 ps-1.5 pe-2 text-sm leading-5 whitespace-nowrap text-ink transition-[background-color] duration-150 ease-out hover:bg-[oklch(0.888_0.006_90)] ${focus} motion-reduce:transition-none dark:bg-track-dark dark:text-ink-dark dark:hover:bg-row-dark`}
      >
        <PlusIcon />
        Add assignee
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="bottom" sideOffset={4}>
        {agentList.map((agent) => (
          <AssigneeOption key={agent.id} agent={agent} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  );
}

function AssigneeOption({ agent }: { agent: Agent }) {
  const ref = useRef<HTMLDivElement>(null);
  const [highlighted, setHighlighted] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const sync = () => setHighlighted(node.hasAttribute("data-highlighted"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(node, { attributes: true, attributeFilter: ["data-highlighted"] });
    return () => observer.disconnect();
  }, []);

  return (
    <DropdownMenuItem
      ref={ref}
      className="grid! w-full grid-cols-[0.875rem_minmax(0,1fr)_auto] gap-x-2.5"
    >
      <AgentFace
        agent={agent}
        gaze={highlighted ? "up" : "wander"}
        className="block size-3.5"
      />
      <span className="font-medium">{agent.name}</span>
      <span className="ms-auto text-end text-muted dark:text-muted-dark">{agent.role}</span>
    </DropdownMenuItem>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M7 3.25v7.5M3.25 7h7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
