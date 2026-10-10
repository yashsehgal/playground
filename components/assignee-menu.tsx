"use client";

import { useEffect, useRef, useState } from "react";
import { AgentFace } from "@/components/agent-face";
import { CodexLogo, CursorLogo, GrokLogo } from "@/components/external-agent-logos";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { agentList, agents, type Agent } from "@/lib/agents";
import styles from "./assignee-menu.module.css";

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40 dark:focus-visible:outline-ink-dark/40";

const logos = {
  codex: CodexLogo,
  cursor: CursorLogo,
  grok: GrokLogo,
} as const;

type MenuAgent = Agent & { logo?: keyof typeof logos };

const externalAgents: MenuAgent[] = [
  { id: "codex", name: "Codex", role: "Coding agent", color: "oklch(0.78 0.06 145)", logo: "codex" },
  { id: "cursor", name: "Cursor", role: "Coding agent", color: "oklch(0.78 0.05 250)", logo: "cursor" },
  { id: "grok", name: "Grok Bot", role: "Assistant", color: "oklch(0.8 0.04 70)", logo: "grok" },
];

const agentGroups = [
  { label: "Personal", agents: agentList },
  { label: "External agents", agents: externalAgents },
];

export function AssigneeMenu({ onProgress }: { onProgress?: () => void }) {
  const [assignee, setAssignee] = useState<MenuAgent | null>(null);

  if (assignee) {
    return <AssignedAgent agent={assignee} onProgress={onProgress} />;
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
      <DropdownMenuContent align="start" side="bottom" sideOffset={4} className="min-w-60">
        {agentGroups.map((group) => (
          <DropdownMenuGroup key={group.label}>
            <DropdownMenuLabel className="px-2 pt-1.5 pb-0.5 text-xs font-medium text-muted dark:text-muted-dark">
              {group.label}
            </DropdownMenuLabel>
            {group.agents.map((agent) => (
              <AssigneeOption key={agent.id} agent={agent} onSelect={setAssignee} />
            ))}
          </DropdownMenuGroup>
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
  const lines: { text: string; revealMia?: boolean; startProgress?: boolean }[] = [
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
    { text: "Preparing a design document", startProgress: true },
    { text: "Started working on the issue" },
  );

  let at = 0;
  return lines.map((line, index) => {
    const step = { ...line, at };
    if (index < lines.length - 1) at += hold();
    return step;
  });
}

export function AssignmentPlayback() {
  return (
    <AssignedAgent
      agent={agents.adam}
      featured
    />
  );
}

function AssignedAgent({
  agent,
  onProgress,
  featured = false,
}: {
  agent: MenuAgent;
  onProgress?: () => void;
  featured?: boolean;
}) {
  const inviteMia = agent.id !== agents.mia.id;
  const [log] = useState(() => buildLog(agent.name, inviteMia));
  const [step, setStep] = useState(0);
  const [showMia, setShowMia] = useState(false);
  const onProgressRef = useRef(onProgress);
  const current = log[step];

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    const timers = log.slice(1).map((entry, index) =>
      window.setTimeout(() => {
        setStep(index + 1);
        if (entry.revealMia) setShowMia(true);
        if (entry.startProgress) onProgressRef.current?.();
      }, entry.at),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [log]);

  return (
    <p
      aria-live="polite"
      className={
        featured
          ? "flex items-center gap-[0.55em] text-[1.75rem] leading-tight text-muted dark:text-muted-dark"
          : "col-start-4 flex min-h-7 min-w-0 items-center gap-2 text-sm leading-5 text-muted dark:text-muted-dark"
      }
    >
      <span className={featured ? styles.featuredStack : styles.stack}>
        <span className={styles.face}>
          <AgentBlob agent={agent} featured={featured} />
        </span>
        <span className={styles.more} data-open={showMia ? "" : undefined}>
          {showMia ? (
            <span className={`${styles.face} ${styles.partner}`}>
              <AgentBlob agent={agents.mia} featured={featured} />
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

function AgentBlob({ agent, featured = false }: { agent: MenuAgent; featured?: boolean }) {
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const timer = window.setTimeout(() => setLanded(true), 680);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <span className={styles.hop}>
      <span
        className={`block size-full overflow-hidden rounded-[0.22em] ${
          featured
            ? "ring-[0.08em] ring-page dark:ring-page-dark"
            : "ring-2 ring-white dark:ring-surface-dark"
        }`}
      >
        <AgentMark agent={agent} gaze={landed ? "wander" : "up"} />
      </span>
    </span>
  );
}

function AgentMark({ agent, gaze }: { agent: MenuAgent; gaze: "up" | "wander" }) {
  if (agent.logo) {
    const Logo = logos[agent.logo];
    return <Logo className="block size-full" />;
  }

  return (
    <AgentFace
      agent={{ ...agent, shape: "square" }}
      gaze={gaze}
      className="block size-full"
    />
  );
}

function AssigneeOption({
  agent,
  onSelect,
}: {
  agent: MenuAgent;
  onSelect: (agent: MenuAgent) => void;
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
      <span className="block size-3.5">
        <AgentMark agent={agent} gaze={highlighted ? "up" : "wander"} />
      </span>
      <span className="font-medium">{agent.name}</span>
      {agent.logo ? null : (
        <span className="ms-auto text-end text-muted dark:text-muted-dark">{agent.role}</span>
      )}
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
