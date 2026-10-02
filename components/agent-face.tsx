"use client";

import { useEffect, useRef } from "react";
import { drawAgentFace, faceSeed, type Gaze } from "@/lib/agent-face";
import type { AgentShape, EyeMood } from "@/lib/agents";

type FaceAgent = {
  id: string;
  color: string;
  shape?: AgentShape;
  mood?: EyeMood;
};

type AgentFaceProps = {
  agent: FaceAgent;
  gaze?: Gaze;
  className?: string;
};

export function AgentFace({ agent, gaze = "wander", className }: AgentFaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seed = faceSeed(agent.id);
    let frame = 0;

    const render = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      const size = Math.max(1, rect.width);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const bitmap = Math.round(size * dpr);
      if (canvas.width !== bitmap || canvas.height !== bitmap) {
        canvas.width = bitmap;
        canvas.height = bitmap;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawAgentFace(context, size, agent, reduced ? 0 : now, gaze, seed);
      if (!reduced) frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [agent, gaze]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}

export function mountAgentFace(agent: FaceAgent, className: string, gaze: Gaze = "wander") {
  const canvas = document.createElement("canvas");
  canvas.className = className;
  canvas.setAttribute("aria-hidden", "true");
  const context = canvas.getContext("2d");
  if (!context) return canvas;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const seed = faceSeed(agent.id);
  let frame = 0;

  const render = (now: number) => {
    if (!canvas.isConnected) return;
    const size = Math.max(1, canvas.getBoundingClientRect().width || 14);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bitmap = Math.round(size * dpr);
    if (canvas.width !== bitmap || canvas.height !== bitmap) {
      canvas.width = bitmap;
      canvas.height = bitmap;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawAgentFace(context, size, agent, reduced ? 0 : now, gaze, seed);
    if (!reduced) frame = requestAnimationFrame(render);
  };

  frame = requestAnimationFrame(render);
  return canvas;
}
