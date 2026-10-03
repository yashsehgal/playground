"use client";

import { useEffect, useRef, useState } from "react";
import { AgentFace } from "@/components/agent-face";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { agentList, agents, type Agent } from "@/lib/agents";
import styles from "./assignee-menu.module.css";

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40 dark:focus-visible:outline-ink-dark/40";

export function AssigneeMenu() {
  const [assignee, setAssignee] = useState<Agent | null>(null);

  if (assignee) {
    return <AssignedAgent agent={assignee} />;
  }

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
          <AssigneeOption key={agent.id} agent={agent} onSelect={setAssignee} />
        ))}
      </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function hold() {
  return Math.random() < 0.5 ? 2000 : 4000;
}

function buildLog(name: string, inviteMia: boolean) {
  const lines: { text: string; revealMia?: boolean }[] = [
    { text: `Assigned to ${name}` },
    { text: "Analyzing the task requirements" },
    { text: "Seems like a design-related task" },
  ];

  if (inviteMia) {
    lines.push(
      { text: "Inviting Mia for design discussions" },
      { text: "Invited Mia", revealMia: true },
    );
  }

  lines.push(
    { text: "Preparing a design document" },
    { text: "Started working on the issue" },
  );

  let at = 0;
  return lines.map((line, index) => {
    const step = { ...line, at };
    if (index < lines.length - 1) at += hold();
    return step;
  });
}

function AssignedAgent({ agent }: { agent: Agent }) {
  const inviteMia = agent.id !== agents.mia.id;
  const [log] = useState(() => buildLog(agent.name, inviteMia));
  const [step, setStep] = useState(0);
  const [showMia, setShowMia] = useState(false);
  const current = log[step];

  useEffect(() => {
    const timers = log.slice(1).map((entry, index) =>
      window.setTimeout(() => {
        setStep(index + 1);
        if (entry.revealMia) setShowMia(true);
      }, entry.at),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [log]);

  return (
    <p
      aria-live="polite"
      className="col-start-4 flex min-h-7 min-w-0 items-center gap-2 text-sm leading-5 text-muted dark:text-muted-dark"
    >
      <span className={styles.stack}>
        <span className={styles.face}>
          <AgentBlob agent={agent} />
        </span>
        <span className={styles.more} data-open={showMia ? "" : undefined}>
          {showMia ? (
            <span className={`${styles.face} ${styles.partner}`}>
              <AgentBlob agent={agents.mia} />
            </span>
          ) : null}
        </span>
      </span>
      <span key={current.text} className={`truncate ${styles.log}`}>
        {current.text}
      </span>
    </p>
  );
}

function AgentBlob({ agent }: { agent: Agent }) {
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const timer = window.setTimeout(() => setLanded(true), 680);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <span className={styles.hop}>
      <span className="block size-full overflow-hidden rounded-[4px] ring-2 ring-white dark:ring-surface-dark">
        <AgentFace
          agent={{ ...agent, shape: "square" }}
          gaze={landed ? "wander" : "up"}
          className="block size-full"
        />
      </span>
    </span>
  );
}

function AssigneeOption({
  agent,
  onSelect,
}: {
  agent: Agent;
  onSelect: (agent: Agent) => void;
}) {
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
      onClick={() => onSelect(agent)}
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
