/**
 * Pure MLM rule helpers.
 *
 * These functions contain the arithmetic and graph logic of the compensation
 * plan. They take plain data and return plain data — no Prisma, no Nest — so
 * every business rule can be unit tested deterministically.
 */

export const MAX_COMMISSION_DEPTH = 15;

/**
 * Level 1..15 commission rates. The approved table sums to 54% (NOT 55%):
 * 25 + 7 + 4.5 + 2.5 + 2 + 2 + 1.8 + 1.6 + 1.4 + 1.2 + 1 + 1 + 1 + 1 + 1 = 54.
 * Never publish a total that disagrees with this sum.
 */
export const COMMISSION_RATES: Readonly<Record<number, number>> = Object.freeze({
  1: 25.0,
  2: 7.0,
  3: 4.5,
  4: 2.5,
  5: 2.0,
  6: 2.0,
  7: 1.8,
  8: 1.6,
  9: 1.4,
  10: 1.2,
  11: 1.0,
  12: 1.0,
  13: 1.0,
  14: 1.0,
  15: 1.0,
});

/** Total payout across every populated level, in percent. */
export const COMMISSION_TOTAL_PERCENT =
  Object.values(COMMISSION_RATES).reduce((sum, rate) => sum + rate, 0);

export type TreeNodeRow = { ancestorId: string; descendantId: string; depth: number };

/**
 * Build the upline chain (level -> distributorId) for a distributor from the
 * materialized-path rows where that distributor is the DESCENDANT.
 *
 * Per the business rules the stored depth IS the level: sponsor = 1,
 * sponsor's sponsor = 2, up to 15. Anything deeper earns nothing.
 */
export function buildUplineChain(
  nodes: TreeNodeRow[],
  maxDepth: number = MAX_COMMISSION_DEPTH,
): Map<number, string> {
  const chain = new Map<number, string>();
  for (const node of nodes) {
    const level = node.depth;
    if (level < 1 || level > maxDepth) continue;
    // Guard against a corrupted row set claiming two ancestors at one level:
    // the nearest recorded ancestor wins.
    if (!chain.has(level)) chain.set(level, node.ancestorId);
  }
  return chain;
}

/** Flatten a chain into ordered upline ids: [level 1, level 2, ...]. */
export function chainToUplineIds(chain: Map<number, string>): string[] {
  return [...chain.keys()]
    .sort((a, b) => a - b)
    .map((level) => chain.get(level)!);
}

/**
 * Team members affected by a sale, derived from the rows where the seller is
 * the ANCESTOR: depth 1 is the seller's direct recruit, so a sale by that
 * recruit is `depth` levels deep for the seller.
 * Deeper than level 15 is excluded entirely.
 */
export function buildDownlineDepths(
  nodes: TreeNodeRow[],
  maxDepth: number = MAX_COMMISSION_DEPTH,
): number[] {
  return nodes
    .map((n) => n.depth)
    .filter((d) => d >= 1 && d <= maxDepth);
}

/** Commission payout for one level, in minor-safe Decimal terms. */
export function commissionForLevel(
  saleAmount: { mul: (v: any) => any; div: (v: any) => any },
  level: number,
): any {
  const rate = COMMISSION_RATES[level];
  if (rate === undefined) {
    throw new Error(`No commission rate defined for level ${level}`);
  }
  return saleAmount.mul(rate).div(100);
}

/** Withdrawal fee: greater of 2% of the amount or a flat ₹20. */
export function withdrawalFee(
  amount: { mul: (v: any) => any; greaterThan: (v: any) => boolean },
  flatMinimum = 20,
  percent = 2,
): any {
  const feePercent = amount.mul(percent).div(100);
  return feePercent.greaterThan(flatMinimum) ? feePercent : flatMinimum;
}
