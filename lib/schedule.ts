import { STATIONS } from "./config";

/**
 * Balanced (Williams) Latin square for 4 tracks.
 * - Every column holds each track once  → at any stage each track hosts exactly one group.
 * - Every ordered transition (1→2, 2→4, …) appears exactly once → walkways between tracks don't jam.
 */
export const SEQUENCES: number[][] = [
  [1, 2, 4, 3],
  [2, 3, 1, 4],
  [3, 4, 2, 1],
  [4, 1, 3, 2],
];

/** Team k (0-based, after shuffling) → its group and track order. */
export function sequenceFor(k: number) {
  const group = k % SEQUENCES.length;
  return { group, order: SEQUENCES[group] };
}

/**
 * QR station for team k at track t: (k + t) mod 3.
 * Exactly 10 of 30 teams per station per track, and the 7–8 teams that arrive
 * at a track together spread ~3/3/2 across the stations (k steps by 4 ≡ 1 mod 3).
 */
export function stationFor(k: number, trackId: number) {
  return STATIONS[(k + trackId) % STATIONS.length];
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function parseOrder(s: string): number[] {
  return s.split(",").map(Number);
}
