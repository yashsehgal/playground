import type { CSSProperties } from "react";
import styles from "./orb-s5.module.css";

const STAGE = 28;
const N = 3;
const PITCH = 6;
const MID = (N - 1) / 2;

const RING: [number, number][] = (() => {
  const ring: [number, number][] = [];
  for (let x = 0; x < N; x++) ring.push([x, 0]);
  for (let y = 1; y < N; y++) ring.push([N - 1, y]);
  for (let x = N - 2; x >= 0; x--) ring.push([x, N - 1]);
  for (let y = N - 2; y >= 1; y--) ring.push([0, y]);
  return ring;
})();

const RING_INDEX = new Map(RING.map(([x, y], i) => [`${x},${y}`, i]));

function delay(x: number, y: number) {
  const index = RING_INDEX.get(`${x},${y}`);
  if (index === undefined) return 0;
  const scrambled = (index * 3) % RING.length;
  return -((scrambled / RING.length) * 1700);
}

const cells = Array.from({ length: N * N }, (_, index) => {
  const x = index % N;
  const y = Math.floor(index / N);
  return {
    key: `${x},${y}`,
    left: x * PITCH,
    top: y * PITCH,
    delay: delay(x, y),
    still: x === MID && y === MID,
  };
});

export function OrbS5({ size = 18 }: { size?: number }) {
  return (
    <span
      className={styles.glyph}
      aria-hidden="true"
      style={{ width: size, height: size, "--orb-k": size / STAGE } as CSSProperties}
    >
      <span className={styles.lattice}>
        {cells.map((cell) => (
          <span
            key={cell.key}
            className={styles.cell}
            data-still={cell.still ? "" : undefined}
            data-mid={cell.still ? "" : undefined}
            style={{
              left: cell.left,
              top: cell.top,
              animationDelay: `${cell.delay}ms`,
            }}
          />
        ))}
      </span>
    </span>
  );
}
