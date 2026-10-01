import { ShaderBackground } from "@/components/shader-background";
import { TokenUsage } from "@/components/token-usage";

const items = [
  {
    id: "system",
    label: "System prompt",
    tokens: 4_500,
    color: "oklch(0.72 0.014 95)",
  },
  {
    id: "tools",
    label: "Tool definitions",
    tokens: 84_000,
    color: "oklch(0.72 0.055 250)",
  },
  {
    id: "skills",
    label: "Skills",
    tokens: 14_800,
    color: "oklch(0.8 0.055 88)",
  },
  {
    id: "crm",
    label: "CRM data",
    tokens: 66_000,
    color: "oklch(0.78 0.05 168)",
  },
  {
    id: "memory",
    label: "AI memory",
    tokens: 12_200,
    color: "oklch(0.78 0.035 310)",
  },
  {
    id: "conversation",
    label: "Conversation",
    tokens: 88_500,
    color: "oklch(0.74 0.06 55)",
  },
];

export default function Home() {
  return (
    <main className="grid min-h-dvh place-items-center bg-white px-6 py-16">
      <div className="relative flex aspect-[3/4] w-full max-w-[34rem] items-center justify-center overflow-hidden rounded-sm p-12 sm:p-16">
        <ShaderBackground className="absolute inset-0" />
        <div className="relative w-full max-w-[22.5rem]">
          <TokenUsage items={items} limit={300_000} />
        </div>
      </div>
    </main>
  );
}
