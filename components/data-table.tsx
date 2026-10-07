import { CompanyLogo } from "@/components/company-logos";

type SocialLink =
  | { platform: "linkedin"; url: string }
  | { platform: "x"; username: string };

export type DataTableRow = {
  id: string;
  name: string;
  focus: string;
  employees: string;
  hq: string;
  founded: string;
  social: SocialLink;
};

export const companies: DataTableRow[] = [
  { id: "xai", name: "xAI", focus: "Frontier models", employees: "5,559", hq: "Palo Alto", founded: "2023", social: { platform: "x", username: "SpaceXAI" } },
  { id: "figma", name: "Figma", focus: "Interface design", employees: "3,134", hq: "San Francisco", founded: "2012", social: { platform: "linkedin", url: "https://www.linkedin.com/company/figma" } },
  { id: "cursor", name: "Cursor", focus: "Code editor", employees: "792", hq: "San Francisco", founded: "2022", social: { platform: "x", username: "cursor_ai" } },
  { id: "claude", name: "Claude", focus: "AI assistant", employees: "6,070", hq: "San Francisco", founded: "2023", social: { platform: "linkedin", url: "https://www.linkedin.com/company/anthropicresearch" } },
  { id: "openai", name: "OpenAI", focus: "AI research", employees: "10,828", hq: "San Francisco", founded: "2015", social: { platform: "x", username: "OpenAI" } },
  { id: "supabase", name: "Supabase", focus: "Backend platform", employees: "442", hq: "San Francisco", founded: "2020", social: { platform: "x", username: "supabase" } },
  { id: "linear", name: "Linear", focus: "Issue tracking", employees: "193", hq: "San Francisco", founded: "2019", social: { platform: "linkedin", url: "https://www.linkedin.com/company/linearapp" } },
  { id: "vercel", name: "Vercel", focus: "Frontend cloud", employees: "1,026", hq: "San Francisco", founded: "2015", social: { platform: "x", username: "vercel" } },
  { id: "notion", name: "Notion", focus: "Team workspace", employees: "7,124", hq: "San Francisco", founded: "2013", social: { platform: "linkedin", url: "https://www.linkedin.com/company/notionhq" } },
  { id: "stripe", name: "Stripe", focus: "Payments", employees: "16,597", hq: "South San Francisco", founded: "2010", social: { platform: "x", username: "stripe" } },
  { id: "raycast", name: "Raycast", focus: "App launcher", employees: "40", hq: "London", founded: "2020", social: { platform: "linkedin", url: "https://www.linkedin.com/company/raycastapp" } },
  { id: "framer", name: "Framer", focus: "Web design", employees: "495", hq: "Amsterdam", founded: "2014", social: { platform: "x", username: "framer" } },
];

const HEADERS = ["Company", "Focus", "Employees", "HQ", "Founded", "Social Links"] as const;

const line = "border-[#e6e8ec] dark:border-[#303030]";
const columns = "grid grid-cols-[8rem_9.25rem_6.75rem_10.5rem_5.75rem_16rem]";
const cellBase = "flex h-8 min-w-0 items-center overflow-hidden pl-2.5 pr-3.5";
const cell = `${cellBase} text-[#1a1a1a] dark:text-[#f5f5f5]`;
const headCell = `${cellBase} text-black dark:text-white`;

function LinkedInLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#0A66C2"
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
      />
    </svg>
  );
}

function XLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#000" />
      <path
        fill="#fff"
        transform="translate(4.5 4.8) scale(0.62)"
        d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"
      />
    </svg>
  );
}

function linkedinLabel(url: string) {
  return url.replace(/^https?:\/\/(?:www\.)?/, "");
}

function CenterTruncate({ text, tail = 8 }: { text: string; tail?: number }) {
  const end = text.slice(-tail);
  const start = text.slice(0, Math.max(0, text.length - tail));

  return (
    <span className="flex min-w-0 underline decoration-[#e6e8ec] underline-offset-2 group-hover:decoration-current dark:decoration-[#303030]">
      <span className="min-w-0 truncate">{start}</span>
      <span className="shrink-0">{end}</span>
    </span>
  );
}

function SocialLinkCell({ social }: { social: SocialLink }) {
  const href = social.platform === "linkedin" ? social.url : `https://x.com/${social.username}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group flex min-w-0 items-center gap-2.5"
    >
      {social.platform === "linkedin" ? (
        <LinkedInLogo className="h-4 w-4 shrink-0" />
      ) : (
        <XLogo className="h-4 w-4 shrink-0" />
      )}
      {social.platform === "linkedin" ? (
        <CenterTruncate text={linkedinLabel(social.url)} />
      ) : (
        <span className="min-w-0 truncate underline decoration-[#e6e8ec] underline-offset-2 group-hover:decoration-current dark:decoration-[#303030]">
          @{social.username}
        </span>
      )}
    </a>
  );
}

export function DataTable({ rows = companies }: { rows?: DataTableRow[] }) {
  return (
    <div
      role="table"
      aria-label="Companies"
      className="flex w-max max-w-full flex-col overflow-hidden rounded-[10px] bg-[#fafafa] text-[13px] dark:bg-[#242424]"
    >
      <div role="rowgroup">
        <div role="row" className={`${columns} font-medium`}>
          {HEADERS.map((header) => (
            <div
              key={header}
              role="columnheader"
              className={`${headCell} not-last:border-r-[0.5px] ${line}`}
            >
              <span className="min-w-0 truncate">{header}</span>
            </div>
          ))}
        </div>
      </div>
      <div
        role="rowgroup"
        className={`-mx-[0.5px] -mb-[0.5px] flex flex-col rounded-t-[10px] border-[0.5px] bg-white dark:bg-[#1a1a1a] ${line}`}
      >
        {rows.map((row) => (
          <div
            key={row.id}
            role="row"
            className={`${columns} not-last:border-b-[0.5px] ${line}`}
          >
            <div role="cell" className={`${cell} not-last:border-r-[0.5px] ${line}`}>
              <span className="flex min-w-0 items-center gap-2.5">
                <CompanyLogo id={row.id} className="h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">{row.name}</span>
              </span>
            </div>
            <div role="cell" className={`${cell} not-last:border-r-[0.5px] ${line}`}>
              <span className="min-w-0 truncate">{row.focus}</span>
            </div>
            <div role="cell" className={`${cell} not-last:border-r-[0.5px] tabular-nums ${line}`}>
              <span className="min-w-0 truncate">{row.employees}</span>
            </div>
            <div role="cell" className={`${cell} not-last:border-r-[0.5px] ${line}`}>
              <span className="min-w-0 truncate">{row.hq}</span>
            </div>
            <div role="cell" className={`${cell} not-last:border-r-[0.5px] tabular-nums ${line}`}>
              <span className="min-w-0 truncate">{row.founded}</span>
            </div>
            <div role="cell" className={cell}>
              <SocialLinkCell social={row.social} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
