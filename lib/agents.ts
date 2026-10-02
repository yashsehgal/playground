export type Agent = {
  id: string;
  name: string;
  role: string;
  color: string;
};

export const agents = {
  peter: {
    id: "peter",
    name: "Peter",
    role: "Software engineer",
    color: "oklch(0.8 0.06 250)",
  },
  mia: {
    id: "mia",
    name: "Mia",
    role: "Design engineer",
    color: "oklch(0.82 0.06 165)",
  },
  adam: {
    id: "adam",
    name: "Adam",
    role: "Architect",
    color: "oklch(0.84 0.06 85)",
  },
  nina: {
    id: "nina",
    name: "Nina",
    role: "Product engineer",
    color: "oklch(0.8 0.05 320)",
  },
  leo: {
    id: "leo",
    name: "Leo",
    role: "Platform engineer",
    color: "oklch(0.8 0.06 45)",
  },
} satisfies Record<string, Agent>;

export const agentList: Agent[] = Object.values(agents);
