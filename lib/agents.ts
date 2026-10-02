export type AgentShape = "square" | "circle" | "triangle";
export type EyeMood = "idle" | "watch" | "happy" | "squint" | "wide";

export type Agent = {
  id: string;
  name: string;
  role: string;
  color: string;
  shape?: AgentShape;
  mood?: EyeMood;
};

export const agents = {
  peter: {
    id: "peter",
    name: "Peter",
    role: "Software engineer",
    color: "oklch(0.8 0.06 250)",
    shape: "circle",
    mood: "watch",
  },
  mia: {
    id: "mia",
    name: "Mia",
    role: "Design engineer",
    color: "oklch(0.82 0.06 165)",
    mood: "happy",
  },
  adam: {
    id: "adam",
    name: "Adam",
    role: "Architect",
    color: "oklch(0.84 0.06 85)",
    shape: "triangle",
    mood: "squint",
  },
  nina: {
    id: "nina",
    name: "Nina",
    role: "Product engineer",
    color: "oklch(0.8 0.05 320)",
    mood: "wide",
  },
  leo: {
    id: "leo",
    name: "Leo",
    role: "Platform engineer",
    color: "oklch(0.8 0.06 45)",
    mood: "idle",
  },
} satisfies Record<string, Agent>;

export const agentList: Agent[] = Object.values(agents);
