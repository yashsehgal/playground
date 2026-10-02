export type ChangedFile = {
  id: string;
  name: string;
  added: number;
  removed: number;
};

type FilesChangedProps = {
  files: ChangedFile[];
};

function extension(name: string) {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

export function FilesChanged({ files }: FilesChangedProps) {
  const countLabel = `${files.length} ${files.length === 1 ? "File" : "Files"} Changed`;

  return (
    <section
      aria-labelledby="files-changed-title"
      className="w-full max-w-[22.5rem] rounded-sm bg-white p-2 text-ink shadow-panel dark:bg-surface-dark dark:text-ink-dark"
    >
      <header className="flex items-center justify-between gap-4 px-3 pt-2 pb-1">
        <h2
          id="files-changed-title"
          className="text-base font-medium leading-[1.2] text-balance"
        >
          {countLabel}
        </h2>
        <button
          type="button"
          className="text-sm leading-5 text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40 dark:text-muted-dark dark:hover:text-ink-dark dark:focus-visible:outline-ink-dark/40"
        >
          Review
        </button>
      </header>

      <ul className="mt-2">
        {files.map((file) => (
          <li
            key={file.id}
            className="grid grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-x-2.5 rounded-sm px-3 py-2 hover:bg-row dark:hover:bg-row-dark"
          >
            <FileIcon name={file.name} />
            <span className="truncate text-sm leading-5 font-medium">
              {file.name}
            </span>
            <span className="flex items-center gap-1.5 text-sm leading-5 tabular-nums">
              {file.added > 0 ? (
                <span className="text-added dark:text-added-dark">+{file.added}</span>
              ) : null}
              {file.removed > 0 ? (
                <span className="text-removed dark:text-removed-dark">
                  -{file.removed}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FileIcon({ name }: { name: string }) {
  const kind = extension(name);

  if (kind === "css" || kind === "scss") {
    return (
      <span
        aria-hidden="true"
        className="text-center text-sm leading-none font-medium text-file-css dark:text-file-css-dark"
      >
        #
      </span>
    );
  }

  if (kind === "ts" || kind === "tsx" || kind === "js" || kind === "jsx") {
    return <CodeFileIcon />;
  }

  return <PlainFileIcon />;
}

function CodeFileIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className="text-file-code dark:text-file-code-dark"
    >
      <path
        d="M3.25 1.75h4.2L10.75 5v7.25h-7.5V1.75Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M7.4 1.75V5h3.35"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M5.35 8.15 4.2 9.2l1.15 1.05M8.65 8.15 9.8 9.2 8.65 10.25"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlainFileIcon() {
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
        d="M3.25 1.75h4.2L10.75 5v7.25h-7.5V1.75Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M7.4 1.75V5h3.35"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}
