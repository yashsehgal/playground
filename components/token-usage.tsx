"use client";

import { useState } from "react";

export type TokenUsageItem = {
  id: string;
  label: string;
  tokens: number;
  color: string;
};

type TokenUsageProps = {
  items: TokenUsageItem[];
  limit: number;
};

function formatDetail(tokens: number) {
  return `${(tokens / 1000).toFixed(1)}K`;
}

function formatTotal(tokens: number) {
  const thousands = tokens / 1000;
  const text = Number.isInteger(thousands)
    ? thousands.toFixed(0)
    : thousands.toFixed(1);
  return `${text}K`;
}

function percentShares(values: number[], total: number) {
  const exact = values.map((value) => (value / total) * 100);
  const floors = exact.map((value) => Math.floor(value));
  let remaining =
    Math.round(exact.reduce((sum, value) => sum + value, 0)) -
    floors.reduce((sum, value) => sum + value, 0);

  const order = exact
    .map((value, index) => ({
      index,
      fraction: value - Math.floor(value),
      tokens: values[index],
    }))
    .sort((a, b) => b.fraction - a.fraction || a.tokens - b.tokens);

  const shares = [...floors];
  for (const entry of order) {
    if (remaining <= 0) break;
    shares[entry.index] += 1;
    remaining -= 1;
  }

  return shares;
}

export function TokenUsage({ items, limit }: TokenUsageProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const used = items.reduce((sum, item) => sum + item.tokens, 0);
  const usedPercent = Math.round((used / limit) * 100);
  const shares = percentShares(
    items.map((item) => item.tokens),
    limit,
  );

  return (
    <section
      aria-labelledby="token-usage-title"
      className="w-full max-w-[22.5rem] rounded-sm bg-white p-2 text-ink shadow-panel dark:bg-surface-dark dark:text-ink-dark"
    >
      <header className="px-3 pt-2">
        <h2
          id="token-usage-title"
          className="text-base font-medium leading-[1.2] text-balance"
        >
          Tokens usage
        </h2>
      </header>

      <div className="mt-4 px-3">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm leading-5 text-muted dark:text-muted-dark">
            {usedPercent}% full
          </p>
          <p className="text-sm leading-5 whitespace-nowrap tabular-nums">
            {formatTotal(used)} / {formatTotal(limit)} tokens
          </p>
        </div>
        <div
          className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-track dark:bg-track-dark"
          aria-hidden="true"
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="h-full transition-opacity duration-150 ease-out motion-reduce:transition-none"
              style={{
                width: `${(item.tokens / limit) * 100}%`,
                backgroundColor: item.color,
                opacity: activeId && activeId !== item.id ? 0.35 : 1,
              }}
            />
          ))}
        </div>
      </div>

      <ul className="mt-3">
        {items.map((item, index) => (
          <li
            key={item.id}
            onMouseEnter={() => setActiveId(item.id)}
            onMouseLeave={() => setActiveId(null)}
            className={`grid grid-cols-[auto_minmax(0,1fr)_2.75rem_3.25rem] items-center gap-x-3 rounded-sm px-3 py-2 hover:bg-row dark:hover:bg-row-dark ${activeId === item.id ? "bg-row dark:bg-row-dark" : ""}`}
          >
            <span
              className="size-3 rounded-[4px]"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            <span className="truncate text-sm leading-5 font-medium">
              {item.label}
            </span>
            <span className="text-end text-sm leading-5 text-muted tabular-nums dark:text-muted-dark">
              {shares[index]}%
            </span>
            <span className="text-end text-sm leading-5 text-muted tabular-nums dark:text-muted-dark">
              {formatDetail(item.tokens)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
