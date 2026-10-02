export type IssuePriority = "none" | "low" | "medium" | "high";
export type IssueStatus = "todo" | "progress" | "review";

export type Issue = {
  id: string;
  key: string;
  title: string;
  priority: IssuePriority;
  status: IssueStatus;
};

type IssuesProps = {
  issues: Issue[];
};

const priorityLabel: Record<IssuePriority, string> = {
  none: "No priority",
  low: "Low priority",
  medium: "Medium priority",
  high: "High priority",
};

const statusLabel: Record<IssueStatus, string> = {
  todo: "To do",
  progress: "In progress",
  review: "In review",
};

export function Issues({ issues }: IssuesProps) {
  return (
    <section
      aria-label="Issues"
      className="w-full max-w-[26rem] rounded-sm bg-white p-2 text-ink dark:bg-surface-dark dark:text-ink-dark"
    >
      <ul>
        {issues.map((issue) => (
          <li
            key={issue.id}
            className="grid grid-cols-[0.875rem_4.5rem_0.875rem_minmax(0,1fr)] items-center gap-x-2.5 rounded-sm px-3 py-2 hover:bg-row dark:hover:bg-row-dark"
          >
            <PriorityIcon priority={issue.priority} />
            <span className="text-sm leading-5 text-muted tabular-nums dark:text-muted-dark">
              {issue.key}
            </span>
            <StatusIcon status={issue.status} />
            <span className="truncate text-sm leading-5 font-medium">
              {issue.title}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PriorityIcon({ priority }: { priority: IssuePriority }) {
  const active =
    priority === "none" ? 0 : priority === "low" ? 1 : priority === "medium" ? 2 : 3;
  const bars = [
    { x: 1.25, height: 5.5 },
    { x: 5.5, height: 8.25 },
    { x: 9.75, height: 11 },
  ];

  return (
    <span className="text-ink dark:text-ink-dark">
      <span className="sr-only">{priorityLabel[priority]}</span>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        {bars.map((bar, index) => (
          <rect
            key={bar.x}
            x={bar.x}
            y={13 - bar.height}
            width="3"
            height={bar.height}
            rx="1.5"
            fill="currentColor"
            className={index < active ? undefined : "opacity-[0.28] dark:opacity-40"}
          />
        ))}
      </svg>
    </span>
  );
}

function StatusIcon({ status }: { status: IssueStatus }) {
  const color = {
    todo: "text-status-todo dark:text-status-todo-dark",
    progress: "text-progress dark:text-progress-dark",
    review: "text-review dark:text-review-dark",
  }[status];

  return (
    <span className={color}>
      <span className="sr-only">{statusLabel[status]}</span>
      {status === "todo" ? <TodoIcon /> : null}
      {status === "progress" ? <ProgressIcon /> : null}
      {status === "review" ? <ReviewIcon /> : null}
    </span>
  );
}

function StatusRing() {
  return (
    <rect
      x="1"
      y="1"
      width="12"
      height="12"
      rx="6"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
  );
}

function TodoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <StatusRing />
    </svg>
  );
}

function ProgressIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <StatusRing />
      <path
        fill="currentColor"
        stroke="none"
        d="M 3.5 3.5 L 3.5 0 A 3.5 3.5 0 0 1 3.5 7 Z"
        transform="translate(3.5 3.5)"
      />
    </svg>
  );
}

function ReviewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <StatusRing />
      <circle cx="7" cy="7" r="3.5" fill="currentColor" />
    </svg>
  );
}
