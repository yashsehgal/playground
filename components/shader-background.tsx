"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createShaderRecipe,
  fragmentShaderSource,
  vertexShaderSource,
  type ShaderRecipe,
} from "@/lib/generative-shader";

type ShaderBackgroundProps = {
  seed?: number;
  className?: string;
  recipe?: ShaderRecipe;
};

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

function draw(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  recipe: ShaderRecipe,
  time: number,
) {
  const resolution = gl.getUniformLocation(program, "u_resolution");
  gl.uniform2f(resolution, gl.canvas.width, gl.canvas.height);
  gl.uniform1f(gl.getUniformLocation(program, "u_time"), time);
  gl.uniform3fv(gl.getUniformLocation(program, "u_color0"), recipe.colors[0]);
  gl.uniform3fv(gl.getUniformLocation(program, "u_color1"), recipe.colors[1]);
  gl.uniform3fv(gl.getUniformLocation(program, "u_color2"), recipe.colors[2]);
  gl.uniform3fv(gl.getUniformLocation(program, "u_color3"), recipe.colors[3]);
  gl.uniform1f(gl.getUniformLocation(program, "u_scale"), recipe.scale);
  gl.uniform1f(gl.getUniformLocation(program, "u_warp"), recipe.warp);
  gl.uniform1f(gl.getUniformLocation(program, "u_softness"), recipe.softness);
  gl.uniform1f(gl.getUniformLocation(program, "u_angle"), recipe.angle);
  gl.uniform2fv(gl.getUniformLocation(program, "u_drift"), recipe.drift);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width === width && canvas.height === height) return false;
  canvas.width = width;
  canvas.height = height;
  return true;
}

export function ShaderBackground({ seed, className, recipe: recipeProp }: ShaderBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generatedSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const recipe = useMemo(
    () => recipeProp ?? createShaderRecipe(seed ?? generatedSeed),
    [recipeProp, seed, generatedSeed],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
    });
    if (!gl) return;

    const program = createProgram(gl);
    if (!program) return;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const position = gl.getAttribLocation(program, "a_position");

    const bind = () => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.useProgram(program);
    };

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let frame = 0;
    const started = performance.now();

    const render = (now: number) => {
      resizeCanvas(canvas);
      bind();
      gl.viewport(0, 0, canvas.width, canvas.height);
      draw(gl, program, recipe, reducedMotion ? 0 : (now - started) / 1000);
      if (!reducedMotion) frame = requestAnimationFrame(render);
    };

    bind();
    render(started);

    const observer = new ResizeObserver(() => {
      if (reducedMotion) render(started);
    });
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [recipe]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`block h-full w-full ${className ?? ""}`}
    />
  );
}
