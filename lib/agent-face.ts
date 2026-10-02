import type { AgentShape, EyeMood } from "@/lib/agents";

export type Gaze = "wander" | "up";

type Face = {
  color: string;
  shape?: AgentShape;
  mood?: EyeMood;
};

export function faceSeed(id: string) {
  return [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export function drawAgentFace(
  ctx: CanvasRenderingContext2D,
  size: number,
  face: Face,
  time: number,
  gaze: Gaze,
  seed: number,
) {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = face.color;
  drawShape(ctx, size, face.shape ?? "square");
  drawEyes(ctx, size, face.shape ?? "square", face.mood ?? "idle", time, gaze, seed);
}

function drawShape(ctx: CanvasRenderingContext2D, size: number, shape: AgentShape) {
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(size / 2, size / 2, size * 0.48, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (shape === "triangle") {
    ctx.moveTo(size * 0.5, size * 0.14);
    ctx.lineTo(size * 0.9, size * 0.88);
    ctx.lineTo(size * 0.1, size * 0.88);
    ctx.closePath();
    ctx.fill();
    ctx.lineJoin = "round";
    ctx.lineWidth = size * 0.14;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.stroke();
    return;
  }

  roundedRect(ctx, size * 0.04, size * 0.04, size * 0.92, size * 0.92, size * 0.16);
  ctx.fill();
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawEyes(
  ctx: CanvasRenderingContext2D,
  size: number,
  shape: AgentShape,
  mood: EyeMood,
  time: number,
  gaze: Gaze,
  seed: number,
) {
  const open = blink(time, seed);
  const look = gazeOf(time, seed, gaze, mood);
  const y = shape === "triangle" ? size * 0.6 : size * 0.46;
  const spread = size * 0.16;
  const eye = eyeStyle(size, mood);

  drawEye(ctx, size * 0.5 - spread, y, eye, look, open);
  drawEye(ctx, size * 0.5 + spread, y, eye, look, open);
}

function eyeStyle(size: number, mood: EyeMood) {
  const width = size * (mood === "wide" ? 0.2 : mood === "squint" ? 0.18 : 0.17);
  const height =
    size *
    (mood === "wide" ? 0.28 : mood === "happy" ? 0.16 : mood === "squint" ? 0.09 : 0.24);
  return { width, height };
}

function gazeOf(time: number, seed: number, gaze: Gaze, mood: EyeMood) {
  const drift = mood === "squint" ? 0.15 : 0.42;
  const x = Math.sin(time / 780 + seed) * drift;
  const y =
    gaze === "up"
      ? -0.55
      : Math.cos(time / 1100 + seed * 0.7) * (mood === "wide" ? 0.12 : 0.28);
  return { x, y };
}

function blink(time: number, seed: number) {
  const period = 2600 + (seed % 7) * 280;
  const frame = (time + seed * 37) % period;
  if (frame > 150) return 1;
  const progress = frame / 150;
  return progress < 0.45 ? 1 - progress / 0.45 : (progress - 0.45) / 0.55;
}

function drawEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  eye: { width: number; height: number },
  look: { x: number; y: number },
  open: number,
) {
  const height = Math.max(eye.height * 0.12, eye.height * open);
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.ellipse(x, y, eye.width, height, 0, 0, Math.PI * 2);
  ctx.fill();

  if (open < 0.45) return;

  const pupil = eye.width * 0.42;
  ctx.fillStyle = "#1c1c1c";
  ctx.beginPath();
  ctx.ellipse(
    x + look.x * eye.width * 0.45,
    y + look.y * height * 0.45,
    pupil,
    pupil * Math.min(1, open + 0.2),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}
