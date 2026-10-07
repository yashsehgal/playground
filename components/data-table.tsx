"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CompanyLogo } from "@/components/company-logos";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  social?: SocialLink;
};

export const companies: DataTableRow[] = [
  { id: "xai", name: "xAI", focus: "Frontier models", employees: "5,559", hq: "Palo Alto", founded: "2023", social: { platform: "x", username: "SpaceXAI" } },
  { id: "figma", name: "Figma", focus: "Interface design", employees: "3,134", hq: "San Francisco", founded: "2012", social: { platform: "linkedin", url: "https://www.linkedin.com/company/figma" } },
  { id: "cursor", name: "Cursor", focus: "Code editor", employees: "792", hq: "San Francisco", founded: "2022", social: { platform: "x", username: "cursor_ai" } },
  { id: "claude", name: "Claude", focus: "", employees: "", hq: "", founded: "" },
  { id: "openai", name: "OpenAI", focus: "", employees: "", hq: "", founded: "" },
  { id: "supabase", name: "Supabase", focus: "", employees: "", hq: "", founded: "" },
  { id: "linear", name: "Linear", focus: "", employees: "", hq: "", founded: "" },
  { id: "vercel", name: "Vercel", focus: "", employees: "", hq: "", founded: "" },
  { id: "notion", name: "Notion", focus: "", employees: "", hq: "", founded: "" },
  { id: "stripe", name: "Stripe", focus: "", employees: "", hq: "", founded: "" },
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

type Selection = { start: number; end: number };

function selectionBounds(selection: Selection) {
  return {
    from: Math.min(selection.start, selection.end),
    to: Math.max(selection.start, selection.end),
  };
}

export function DataTable({ rows = companies }: { rows?: DataTableRow[] }) {
  const tableRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const dragging = useRef(false);
  const anchor = useRef<number | null>(null);
  const selectionRef = useRef<Selection | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{
    top: number;
    left: number;
    height: number;
  } | null>(null);
  const [frame, setFrame] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [countBadge, setCountBadge] = useState<{
    top: number;
    left: number;
    place: "above" | "below";
  } | null>(null);
  const [highlightColumn, setHighlightColumn] = useState(false);
  const [collapseRows, setCollapseRows] = useState(false);
  const bounds = selection ? selectionBounds(selection) : null;
  const selectedCount = bounds ? bounds.to - bounds.from + 1 : 0;
  selectionRef.current = selection;

  function clearSelection() {
    setSelection(null);
    setMenuOpen(false);
    setMenuAnchor(null);
    setCountBadge(null);
  }

  function openMenuForSelection(current: Selection) {
    const table = tableRef.current;
    if (!table) return;
    const startCell = table.querySelector<HTMLElement>(
      `[data-company-cell="${current.start}"]`,
    );
    if (!startCell) return;
    const tableRect = table.getBoundingClientRect();
    const cellRect = startCell.getBoundingClientRect();
    setMenuAnchor({
      top: cellRect.top - tableRect.top - 6,
      left: cellRect.right - tableRect.left,
      height: cellRect.height,
    });
    setMenuOpen(true);
  }

  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table || !selection) {
      setFrame(null);
      setCountBadge(null);
      return;
    }

    const { from, to } = selectionBounds(selection);
    const first = table.querySelector<HTMLElement>(`[data-company-cell="${from}"]`);
    const last = table.querySelector<HTMLElement>(`[data-company-cell="${to}"]`);
    const start = table.querySelector<HTMLElement>(
      `[data-company-cell="${selection.start}"]`,
    );
    if (!first || !last || !start) {
      setFrame(null);
      setCountBadge(null);
      return;
    }

    const tableRect = table.getBoundingClientRect();
    const startRect = first.getBoundingClientRect();
    const endRect = last.getBoundingClientRect();
    const anchorRect = start.getBoundingClientRect();
    const top = Math.min(startRect.top, endRect.top) - tableRect.top;
    const left = Math.min(startRect.left, endRect.left) - tableRect.left;
    const right = Math.max(startRect.right, endRect.right) - tableRect.left;
    const bottom = Math.max(startRect.bottom, endRect.bottom) - tableRect.top;
    setFrame({ top, left, width: right - left, height: bottom - top });

    const place = selection.end < selection.start ? "below" : "above";
    setCountBadge({
      top:
        (place === "above" ? anchorRect.top : anchorRect.bottom) - tableRect.top,
      left: Math.min(startRect.left, endRect.left) - tableRect.left,
      place,
    });
  }, [selection]);

  useEffect(() => {
    function finishDrag() {
      if (!dragging.current) return;
      dragging.current = false;
      anchor.current = null;
      const current = selectionRef.current;
      if (current) openMenuForSelection(current);
    }

    function onPointerDown(event: PointerEvent) {
      if (dragging.current) return;
      if (!selectionRef.current) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (tableRef.current?.contains(target)) return;
      if ((target as Element).closest?.("[data-slot^='dropdown-menu']")) return;
      clearSelection();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") clearSelection();
    }

    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("mouseup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("mouseup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function endIndexAt(y: number, start: number) {
    const nodes = tableRef.current?.querySelectorAll<HTMLElement>("[data-company-row]");
    if (!nodes?.length || !nodes[start]) return null;

    const startMid =
      nodes[start].getBoundingClientRect().top + nodes[start].getBoundingClientRect().height / 2;

    if (y >= startMid) {
      let end = start;
      for (let index = start; index < nodes.length; index++) {
        const rect = nodes[index].getBoundingClientRect();
        if (y >= rect.top + rect.height / 2) end = index;
      }
      return end;
    }

    let end = start;
    for (let index = start; index >= 0; index--) {
      const rect = nodes[index].getBoundingClientRect();
      if (y <= rect.top + rect.height / 2) end = index;
    }
    return end;
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("[data-slot^='dropdown-menu']")) return;
    const row = (event.target as HTMLElement).closest<HTMLElement>("[data-company-row]");
    if (!row) {
      clearSelection();
      return;
    }
    event.preventDefault();
    const index = Number(row.dataset.companyRow);
    dragging.current = true;
    anchor.current = index;
    setMenuOpen(false);
    setMenuAnchor(null);
    event.currentTarget.setPointerCapture(event.pointerId);
    const next = { start: index, end: index };
    selectionRef.current = next;
    setSelection(next);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current || anchor.current == null) return;
    const index = endIndexAt(event.clientY, anchor.current);
    if (index == null) return;
    const current = selectionRef.current;
    if (!current || current.end === index) return;
    const next = { ...current, end: index };
    selectionRef.current = next;
    setSelection(next);
  }

  return (
    <div
      ref={tableRef}
      role="table"
      aria-label="Companies"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      className="relative flex w-max max-w-full cursor-crosshair flex-col overflow-visible rounded-[10px] border-[0.5px] border-[#e6e8ec] bg-[#fafafa] text-[13px] select-none dark:border-[#303030] dark:bg-[#242424] [&_a]:cursor-crosshair"
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
        {rows.map((row, index) => (
          <div
            key={row.id}
            role="row"
            data-company-row={index}
            className={`${columns} not-last:border-b-[0.5px] ${line}`}
          >
            <div
              role="cell"
              data-company-cell={index}
              className={`${cell} not-last:border-r-[0.5px] ${line} ${
                bounds && index >= bounds.from && index <= bounds.to ? "bg-[#e8f2ff] dark:bg-[#13283f]" : ""
              }`}
            >
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
              {row.social ? <SocialLinkCell social={row.social} /> : null}
            </div>
          </div>
        ))}
      </div>
      {frame ? (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 border-2 border-[#4d7fe3]"
          style={{
            top: frame.top,
            left: frame.left,
            width: frame.width,
            height: frame.height,
          }}
        />
      ) : null}
      {countBadge ? (
        <div
          aria-live="polite"
          className="pointer-events-none absolute z-30 rounded-sm bg-[#4d7fe3] px-1.5 py-0.5 text-[11px] leading-none font-medium tabular-nums text-white"
          style={{
            top: countBadge.top,
            left: countBadge.left,
            transform:
              countBadge.place === "above"
                ? "translateY(calc(-100% - 4px))"
                : "translateY(4px)",
          }}
        >
          {selectedCount} selected
        </div>
      ) : null}
      {selection && menuAnchor ? (
        <DropdownMenu
          open={menuOpen}
          modal={false}
          onOpenChange={(open, details) => {
            setMenuOpen(open);
            if (open) return;
            setMenuAnchor(null);
            if (
              details.reason === "outsidePress" ||
              details.reason === "escapeKey"
            ) {
              clearSelection();
            }
          }}
        >
          <DropdownMenuTrigger
            ref={menuTriggerRef}
            aria-label="Selection actions"
            className="absolute z-20 w-2 opacity-0"
            style={{
              top: menuAnchor.top,
              left: menuAnchor.left,
              height: menuAnchor.height,
            }}
          />
          <DropdownMenuContent
            side="right"
            align="start"
            sideOffset={0}
            className="min-w-56 cursor-default"
          >
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Copy</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-40">
                <DropdownMenuItem>Copy name</DropdownMenuItem>
                <DropdownMenuItem>Copy link</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              Enrich {selectedCount} {selectedCount === 1 ? "row" : "rows"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={highlightColumn}
              onCheckedChange={setHighlightColumn}
            >
              Highlight cells
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={collapseRows}
              onCheckedChange={setCollapseRows}
            >
              Collapse rows
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
