import { OrbS5 } from "@/components/orb-s5";

export type AgentStatus = "running" | "done";

export type ActiveAgent = {
  id: string;
  title: string;
  branch: string;
  added: number;
  removed: number;
  pullRequest?: number;
  status: AgentStatus;
};

export type AgentGroup = {
  id: string;
  label: string;
  agents: ActiveAgent[];
};

type ActiveAgentsProps = {
  groups: AgentGroup[];
};

export function ActiveAgents({ groups }: ActiveAgentsProps) {
  return (
    <section
      aria-label="Active agents"
      className="w-full max-w-[22.5rem] rounded-sm bg-white p-2 text-ink dark:bg-surface-dark dark:text-ink-dark"
    >
      {groups.map((group, index) => (
        <div key={group.id} className={index === 0 ? undefined : "mt-3"}>
          <p className="px-3 pt-2 text-sm leading-5 text-muted dark:text-muted-dark">
            {group.label}
          </p>
          <ul className="mt-1">
            {group.agents.map((agent) => (
              <AgentRow key={agent.id} agent={agent} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function AgentRow({ agent }: { agent: ActiveAgent }) {
  return (
    <li>
      <div className="flex items-start gap-2.5 rounded-sm px-3 py-2.5 hover:bg-row dark:hover:bg-row-dark">
        <span className="mt-px grid size-[18px] shrink-0 place-items-center">
                {agent.status === "running" ? <OrbS5 /> : <CheckIcon />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm leading-5 font-medium">
            <span className="sr-only">
              {agent.status === "running" ? "Running: " : "Finished: "}
            </span>
            {agent.title}
          </p>
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm leading-5 text-muted dark:text-muted-dark">
            <BranchIcon />
            <span className="truncate">{agent.branch}</span>
            {agent.pullRequest ? (
              <span className="shrink-0 tabular-nums">#{agent.pullRequest}</span>
            ) : null}
            {agent.added > 0 || agent.removed > 0 ? (
              <span aria-hidden="true" className="shrink-0">
                ·
              </span>
            ) : null}
            {agent.added > 0 ? (
              <span className="shrink-0 text-added tabular-nums dark:text-added-dark">
                +{agent.added}
              </span>
            ) : null}
            {agent.removed > 0 ? (
              <span className="shrink-0 text-removed tabular-nums dark:text-removed-dark">
                -{agent.removed}
              </span>
            ) : null}
          </p>
        </div>
      </div>
    </li>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className="text-muted dark:text-muted-dark"
    >
      <path
        d="M3 7.25 5.6 9.75 11 4.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BranchIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="4" cy="3.25" r="1.6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="4" cy="12.75" r="1.6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="6.25" r="1.6" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M4 4.85v6.3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M4 7.35C6.2 7.35 8.1 6.25 10.35 6.25"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
