const MULTIPLIERS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

export function parseDurationMs(input: string): number {
  const match = /^(\d+)([smhd])$/.exec(input);
  if (!match) throw new Error(`Invalid duration string: ${input}`);
  const value = Number(match[1]);
  return value * MULTIPLIERS[match[2] as keyof typeof MULTIPLIERS];
}

export function parseDurationSeconds(input: string): number {
  return parseDurationMs(input) / 1000;
}
