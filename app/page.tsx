import Link from "next/link";

const components = [
  { href: "/token-usage", name: "Token usage" },
  { href: "/chat-input", name: "Chat input" },
  { href: "/modes", name: "Modes" },
  { href: "/file-changed", name: "File changed" },
  { href: "/active-agents", name: "Active agents" },
  { href: "/issues", name: "Issues" },
  { href: "/interactive-agents", name: "Interactive agents" },
  { href: "/assigning-task", name: "Assigning task to an agent" },
  { href: "/ai-actions", name: "AI actions for table contents" },
  { href: "/data-table", name: "Data table" },
];

export default function Home() {
  return (
    <main className="min-h-dvh px-6 py-16">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-base font-medium leading-[1.2]">Components</h1>
        <ul className="mt-4">
          {components.map((component) => (
            <li key={component.href}>
              <Link
                href={component.href}
                className="block rounded-sm px-3 py-2 text-sm leading-5 font-medium hover:bg-row focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40 dark:hover:bg-row-dark dark:focus-visible:outline-ink-dark/40"
              >
                {component.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
