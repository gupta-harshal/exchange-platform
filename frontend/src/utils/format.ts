export function formatPrice(value: string | number, digits = 2) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatQty(value: string | number, digits = 4) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function applyDepthDelta(
  levels: [string, string][],
  deltas: [string, string][] | undefined,
  side: "bid" | "ask"
): [string, string][] {
  if (!deltas?.length) return levels;

  const map = new Map(levels);
  for (const [price, qty] of deltas) {
    if (Number(qty) === 0) {
      map.delete(price);
    } else {
      map.set(price, qty);
    }
  }

  const next = Array.from(map.entries()) as [string, string][];
  next.sort((a, b) =>
    side === "bid" ? Number(b[0]) - Number(a[0]) : Number(a[0]) - Number(b[0])
  );
  return next;
}
