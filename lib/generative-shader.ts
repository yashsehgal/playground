export type Rgb = [number, number, number];

export type ShaderRecipe = {
  seed: number;
  colors: [Rgb, Rgb, Rgb, Rgb];
  scale: number;
  warp: number;
  softness: number;
  angle: number;
  drift: [number, number];
};

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function oklchToSrgb(l: number, c: number, hDeg: number): Rgb {
  const convert = (chroma: number) => {
    const h = (hDeg * Math.PI) / 180;
    const a = chroma * Math.cos(h);
    const b = chroma * Math.sin(h);
    const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = l - 0.0894841775 * a - 1.291485548 * b;
    const l3 = l_ * l_ * l_;
    const m3 = m_ * m_ * m_;
    const s3 = s_ * s_ * s_;
    return [
      4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
      -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
      -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
    ];
  };

  let chroma = c;
  let linear = convert(chroma);
  for (let i = 0; i < 10 && linear.some((channel) => channel < 0 || channel > 1); i++) {
    chroma *= 0.82;
    linear = convert(chroma);
  }

  const encode = (channel: number) => {
    const value = Math.min(1, Math.max(0, channel));
    return value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
  };

  return [encode(linear[0]), encode(linear[1]), encode(linear[2])];
}

/** Two close light greys, used when a demo should stay nearly monochrome. */
export const greyShaderRecipe: ShaderRecipe = {
  seed: 7,
  colors: [
    [0.975, 0.975, 0.975],
    [0.9, 0.9, 0.9],
    [0.975, 0.975, 0.975],
    [0.9, 0.9, 0.9],
  ],
  scale: 1.15,
  warp: 1.45,
  softness: 0.82,
  angle: 0.55,
  drift: [0.02, 0.015],
};

export function createShaderRecipe(seed: number): ShaderRecipe {
  const rand = mulberry32(seed);
  const hue = rand() * 360;
  const spread = 64 + rand() * 96;
  const direction = rand() < 0.5 ? -1 : 1;
  const secondary = hue + direction * spread;
  const accent = hue + direction * spread * (0.42 + rand() * 0.28);

  return {
    seed,
    colors: [
      oklchToSrgb(0.95 + rand() * 0.03, 0.02 + rand() * 0.02, hue),
      oklchToSrgb(0.84 + rand() * 0.05, 0.07 + rand() * 0.035, hue),
      oklchToSrgb(0.8 + rand() * 0.05, 0.08 + rand() * 0.04, secondary),
      oklchToSrgb(0.76 + rand() * 0.04, 0.09 + rand() * 0.035, accent),
    ],
    scale: 1.05 + rand() * 0.55,
    warp: 1.35 + rand() * 1.45,
    softness: rand(),
    angle: rand() * Math.PI * 2,
    drift: [0.018 + rand() * 0.04, 0.014 + rand() * 0.032],
  };
}

export const vertexShaderSource = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const fragmentShaderSource = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_color0;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform float u_scale;
uniform float u_warp;
uniform float u_softness;
uniform float u_angle;
uniform vec2 u_drift;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 turn = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p = turn * p * 2.02;
    amplitude *= 0.5;
  }
  return value;
}

vec2 rotate(vec2 p, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

vec3 toLinear(vec3 color) {
  return pow(max(color, vec3(0.0)), vec3(2.2));
}

vec3 toSrgb(vec3 color) {
  return pow(max(color, vec3(0.0)), vec3(0.454545));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  uv = uv * 2.0 - 1.0;
  uv.x *= u_resolution.x / max(u_resolution.y, 1.0);

  vec2 p = rotate(uv, u_angle) * u_scale;
  float t = u_time;

  vec2 q = vec2(
    fbm(p + u_drift * t),
    fbm(p + vec2(5.2, 1.3))
  );
  vec2 r = vec2(
    fbm(p + u_warp * q + vec2(1.7, 9.2) + u_drift.yx * t),
    fbm(p + u_warp * q + vec2(8.3, 2.8) - u_drift * t)
  );
  float field = fbm(p + u_warp * r);

  float edge = mix(0.12, 0.42, u_softness);
  vec3 color = mix(toLinear(u_color0), toLinear(u_color1), smoothstep(edge, 1.0 - edge * 0.35, field));
  color = mix(color, toLinear(u_color2), smoothstep(0.18, 0.92, q.x) * 0.92);
  color = mix(color, toLinear(u_color3), smoothstep(0.32, 0.88, r.y) * 0.72);

  gl_FragColor = vec4(toSrgb(color), 1.0);
}
`;
